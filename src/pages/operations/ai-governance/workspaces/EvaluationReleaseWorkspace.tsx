import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Empty,
  Input,
  Modal,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { CaretRightOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  finalizeAIEvaluationV2,
  getAIEvaluationCapacity,
  getAIEvaluationOutputV2,
  getAIEvaluationRunV2,
  listAIEvaluationRuns,
  resolveAIEvaluationResultUnknownV2,
  startAIEvaluationV2
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationExecutionV2,
  AIEvaluationOutputV2,
  AIEvaluationRunSummary,
  AIEvaluationRunV2,
  AIResultUnknownDecision
} from '@/api/path/aiGovernance'
import { JsonEvidence } from '../components/JsonEvidence'
import { ReleaseIdentityV2Card } from '../components/ReleaseIdentityV2Card'
import { ReasonCommandModal } from '../components/ReasonCommandModal'
import { errorMessage, evaluationStatusTag, formatTime } from '../presentation'
import { useSimplePolling } from '../../shared/hooks/useSimplePolling'

const { Paragraph, Text, Title } = Typography
const POLLING_INTERVAL_MS = 15000
const LAST_V2_RUN_ID_STORAGE_KEY = 'ai-governance:v2:last-run-id'

const readLastV2RunID = (): string => {
  try {
    return window.sessionStorage.getItem(LAST_V2_RUN_ID_STORAGE_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

const rememberLastV2RunID = (runID: string) => {
  const value = runID.trim()
  if (!value) return
  try {
    window.sessionStorage.setItem(LAST_V2_RUN_ID_STORAGE_KEY, value)
  } catch {
    // The exact Run remains visible in component state when storage is unavailable.
  }
}

export const buildTechnicalFailureEvidence = (
  run?: AIEvaluationRunV2 | null
): AIEvaluationExecutionV2[] => run
  ? [...run.generation_executions, ...run.semantic_executions]
    .filter((execution) => Boolean(execution.failure))
  : []

const unresolvedExecutions = (run?: AIEvaluationRunV2 | null): AIEvaluationExecutionV2[] => {
  if (!run) return []
  const resolved = new Set(run.result_unknown_resolutions.map((item) => item.execution_id))
  return [...run.generation_executions, ...run.semantic_executions]
    .filter((execution) => execution.status === 'result_unknown' && !resolved.has(execution.execution_id))
}

export const EvaluationReleaseWorkspace: React.FC = () => {
  const [legacyRuns, setLegacyRuns] = useState<AIEvaluationRunSummary[]>([])
  const [legacyError, setLegacyError] = useState('')
  const [selected, setSelected] = useState<AIEvaluationRunV2 | null>(null)
  const [manualRunID, setManualRunID] = useState(readLastV2RunID)
  const [loading, setLoading] = useState(false)
  const [commandLoading, setCommandLoading] = useState(false)
  const [startInvocations, setStartInvocations] = useState(0)
  const [command, setCommand] = useState<'start' | 'finalize' | null>(null)
  const [output, setOutput] = useState<AIEvaluationOutputV2 | null>(null)
  const [outputLoading, setOutputLoading] = useState(false)
  const [unknownExecution, setUnknownExecution] = useState<AIEvaluationExecutionV2 | null>(null)
  const [unknownDecision, setUnknownDecision] = useState<AIResultUnknownDecision>('authorize_replacement')
  const [unknownRiskAccepted, setUnknownRiskAccepted] = useState(false)
  const [unknownReason, setUnknownReason] = useState('')

  const loadLegacyHistory = useCallback(async () => {
    const [requestError, response] = await listAIEvaluationRuns({ limit: 20 })
    if (requestError || !response) {
      setLegacyError(errorMessage(requestError, '历史 v1 评测目录获取失败'))
      return
    }
    setLegacyError('')
    setLegacyRuns(response.data?.items || [])
  }, [])

  useEffect(() => {
    loadLegacyHistory()
  }, [loadLegacyHistory])

  const loadV2Run = useCallback(async (runID: string, showError = true) => {
    if (!runID.trim()) return null
    setLoading(true)
    const [requestError, response] = await getAIEvaluationRunV2(runID.trim())
    setLoading(false)
    if (requestError || !response) {
      if (showError) message.error(errorMessage(requestError, 'v2 评测 Run 获取失败'))
      return null
    }
    setSelected(response.data)
    setManualRunID(response.data.run_id)
    rememberLastV2RunID(response.data.run_id)
    return response.data
  }, [])

  useEffect(() => {
    const runID = readLastV2RunID()
    if (runID) void loadV2Run(runID, false)
  }, [loadV2Run])

  useSimplePolling({
    enabled: selected?.status === 'requested' || selected?.status === 'collecting',
    intervalMs: POLLING_INTERVAL_MS,
    onTick: async () => {
      if (selected) await loadV2Run(selected.run_id, false)
    }
  })

  const prepareStart = async () => {
    setCommandLoading(true)
    const [requestError, response] = await getAIEvaluationCapacity()
    setCommandLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '评测容量获取失败'))
      return
    }
    const capacity = response.data
    if (capacity.over_limit || capacity.available_full_run_starts < 1) {
      message.warning('当前机构没有可用的完整评测容量')
      return
    }
    setStartInvocations(capacity.provider_invocations_per_start)
    setCommand('start')
  }

  const executeCommand = async (reason: string) => {
    if (!command) return
    setCommandLoading(true)
    const result = command === 'start'
      ? await startAIEvaluationV2(startInvocations, reason)
      : selected
        ? await finalizeAIEvaluationV2(selected.run_id, reason)
        : [new Error('missing run'), undefined] as const
    setCommandLoading(false)
    const [requestError, response] = result
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'v2 评测治理操作失败'))
      return
    }
    setSelected(response.data)
    setManualRunID(response.data.run_id)
    rememberLastV2RunID(response.data.run_id)
    setCommand(null)
    message.success(command === 'start' ? 'v2 评测已启动' : 'v2 评测已终审')
  }

  const openOutput = async (execution: AIEvaluationExecutionV2) => {
    if (!selected) return
    setOutputLoading(true)
    const [requestError, response] = await getAIEvaluationOutputV2(selected.run_id, execution.execution_id)
    setOutputLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '执行输出证据获取失败'))
      return
    }
    setOutput(response.data)
  }

  const resolveUnknown = async () => {
    if (!selected || !unknownExecution || !unknownRiskAccepted || !unknownReason.trim()) return
    setCommandLoading(true)
    const [requestError, response] = await resolveAIEvaluationResultUnknownV2(selected.run_id, {
      execution_id: unknownExecution.execution_id,
      decision: unknownDecision,
      acknowledged_duplicate_call_and_cost_risk: true,
      reason: unknownReason.trim()
    })
    setCommandLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'result_unknown 处理失败'))
      return
    }
    setSelected(response.data)
    setUnknownExecution(null)
    setUnknownRiskAccepted(false)
    setUnknownReason('')
    message.success('result_unknown 决策已记录')
  }

  const failures = useMemo(() => buildTechnicalFailureEvidence(selected), [selected])
  const unresolved = useMemo(() => unresolvedExecutions(selected), [selected])
  const candidatePercent = selected?.required_candidates
    ? Math.round(selected.accepted_candidates / selected.required_candidates * 100)
    : 0
  const requiredReviews = (selected?.required_candidates || 0) * 2
  const canFinalize = selected?.status === 'awaiting_review' &&
    selected.human_reviews.length >= requiredReviews && selected.unresolved_result_unknown_count === 0

  return (
    <div className="ai-governance-workspace">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>评测发布 v2</Title>
          <Paragraph type="secondary">
            新评测只走 v2；当前没有 v2 列表接口，启动响应和精确 Run ID 是唯一可信入口。
          </Paragraph>
        </div>
        <Space wrap>
          <Input.Search
            value={manualRunID}
            onChange={(event) => setManualRunID(event.target.value)}
            onSearch={(value) => loadV2Run(value)}
            enterButton={<SearchOutlined />}
            placeholder="输入 v2 Run ID"
            style={{ width: 280 }}
          />
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            disabled={!selected}
            onClick={() => selected && loadV2Run(selected.run_id)}
          >
            刷新当前 Run
          </Button>
          <Button type="primary" icon={<CaretRightOutlined />} loading={commandLoading} onClick={prepareStart}>
            启动 v2 评测
          </Button>
        </Space>
      </div>

      {selected ? (
        <Card
          loading={loading}
          title={<Space>{evaluationStatusTag(selected.status)}<Text code>{selected.run_id}</Text></Space>}
          extra={canFinalize ? <Button type="primary" onClick={() => setCommand('finalize')}>终审</Button> : null}
        >
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="Candidate">
              {selected.accepted_candidates}/{selected.required_candidates}
            </Descriptions.Item>
            <Descriptions.Item label="审核就绪">{selected.review_ready_candidates}</Descriptions.Item>
            <Descriptions.Item label="已记录审核">{selected.human_reviews.length}/{requiredReviews}</Descriptions.Item>
            <Descriptions.Item label="预留调用">{selected.reserved_provider_invocations}</Descriptions.Item>
            <Descriptions.Item label="未知结果">{selected.unresolved_result_unknown_count}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatTime(selected.created_at)}</Descriptions.Item>
          </Descriptions>
          <Progress
            className="ai-governance-inline-alert"
            percent={candidatePercent}
            status={selected.status === 'blocked' || selected.status === 'rejected' ? 'exception' : 'active'}
          />
          {(selected.status === 'requested' || selected.status === 'collecting') ? (
            <Alert type="info" showIcon message="评测执行中，页面每 15 秒刷新当前 Run" />
          ) : null}
          {selected.status === 'blocked' ? (
            <Alert
              className="ai-governance-inline-alert"
              type="error"
              showIcon
              message="Run 已阻塞"
              description="失败证据永久保留；只有 result_unknown 可由人工确认替换或取消。普通质量失败不会替换 Candidate。"
            />
          ) : null}
          {unresolved.length ? (
            <Card size="small" title={`待确认 result_unknown（${unresolved.length}）`}>
              <Table<AIEvaluationExecutionV2>
                rowKey="execution_id"
                dataSource={unresolved}
                pagination={false}
                size="small"
                columns={[
                  { title: '执行', dataIndex: 'execution_id', render: function renderExecutionID(value) { return <Text code>{value}</Text> } },
                  { title: '类型', dataIndex: 'kind' },
                  { title: '错误码', render: function renderFailureCode(_, item) { return <Text code>{item.failure?.code}</Text> } },
                  {
                    title: '操作',
                    render: function renderUnknownAction(_, item) {
                      return <Button danger size="small" onClick={() => setUnknownExecution(item)}>人工确认</Button>
                    }
                  }
                ]}
              />
            </Card>
          ) : null}
          {failures.length ? (
            <Card size="small" title={`生成 / 语义失败证据（${failures.length}）`}>
              <Table<AIEvaluationExecutionV2>
                rowKey="execution_id"
                dataSource={failures}
                pagination={false}
                size="small"
                columns={[
                  { title: '执行', dataIndex: 'execution_id', render: function renderExecutionID(value) { return <Text code>{value}</Text> } },
                  { title: '类型', dataIndex: 'kind' },
                  { title: 'Case', dataIndex: 'case_id', render: function renderCaseID(value) { return value || '—' } },
                  { title: 'Stage', render: function renderFailureStage(_, item) { return <Text code>{item.failure?.stage}</Text> } },
                  { title: 'Code', render: function renderFailureCode(_, item) { return <Text code>{item.failure?.code}</Text> } },
                  { title: 'Disposition', render: function renderDisposition(_, item) { return <Tag>{item.failure?.disposition}</Tag> } },
                  {
                    title: '收据',
                    render: (_, item) => item.provider_receipt
                      ? `${item.provider_receipt.provider}/${item.provider_receipt.model}`
                      : '—'
                  },
                  {
                    title: '详情',
                    render: function renderOutputAction(_, item) {
                      return <Button size="small" onClick={() => openOutput(item)}>输出</Button>
                    }
                  }
                ]}
              />
            </Card>
          ) : null}
          <Card size="small" title="35 个固定 Slot">
            <Table
              rowKey={(item) => `${item.case_id}:${item.slot_ordinal}`}
              dataSource={selected.slots}
              pagination={false}
              size="small"
              columns={[
                { title: 'Case', dataIndex: 'case_id', render: function renderCaseID(value) { return <Text code>{value}</Text> } },
                { title: 'Slot', dataIndex: 'slot_ordinal' },
                { title: '状态', dataIndex: 'status', render: function renderStatus(value) { return <Tag>{value}</Tag> } },
                { title: '生成执行数', render: (_, item) => item.generation_execution_ids.length },
                { title: 'Candidate', render: (_, item) => item.candidate?.candidate_id || '—' },
                {
                  title: '审核就绪',
                  render: function renderReviewReady(_, item) {
                    return item.candidate?.review_ready ? <Tag color="green">是</Tag> : '否'
                  }
                }
              ]}
            />
          </Card>
          <ReleaseIdentityV2Card release={selected.release} />
          {selected.gate ? (
            <Alert
              className="ai-governance-inline-alert"
              type={selected.gate.passed ? 'success' : 'error'}
              showIcon
              message={selected.gate.passed ? 'G1-G5 门禁通过' : 'G1-G5 门禁未通过'}
              description={selected.gate.reasons.map((item) => `${item.gate}: ${item.detail}`).join('；') || '全部冻结门禁均通过。'}
            />
          ) : null}
        </Card>
      ) : <Card><Empty description="启动 v2 评测，或输入精确 Run ID" /></Card>}

      <Card
        className="ai-governance-detail-card"
        title="历史 v1 Run（只读）"
        extra={<Button icon={<ReloadOutlined />} onClick={loadLegacyHistory}>刷新历史</Button>}
      >
        <Alert
          type="info"
          showIcon
          message="此目录仅代表历史 v1，不代表 v2 Run 全量状态"
          description={legacyError || 'v1 启动、恢复、取消、审核和终审写入口已移除。'}
        />
        <Table
          rowKey="run_id"
          dataSource={legacyRuns}
          pagination={false}
          size="small"
          locale={{ emptyText: <Empty description="没有可见的历史 v1 Run" /> }}
          columns={[
            { title: 'Run', dataIndex: 'run_id', render: function renderRunID(value) { return <Text code>{value}</Text> } },
            { title: '状态', dataIndex: 'status', render: evaluationStatusTag },
            { title: '生成执行', render: (_, item) => `${item.progress.generation_attempts}/${item.progress.planned_generation_attempts}` },
            { title: '创建时间', dataIndex: 'created_at', render: formatTime }
          ]}
        />
      </Card>

      {command ? (
        <ReasonCommandModal
          visible
          title={command === 'start' ? '启动 v2 冻结评测' : '终审 v2 评测'}
          description={command === 'start'
            ? `将预留 ${startInvocations} 次 Provider 调用；所有失败继续计入可靠性。`
            : '服务端将按冻结 G1-G5 Policy 生成不可变 approved 或 rejected 结论。'}
          confirmText={command === 'start' ? '确认成本并启动' : '确认终审'}
          loading={commandLoading}
          onCancel={() => setCommand(null)}
          onConfirm={executeCommand}
        />
      ) : null}

      <Modal
        visible={Boolean(unknownExecution)}
        title="处理 result_unknown"
        okText="确认并提交"
        okButtonProps={{ disabled: !unknownRiskAccepted || !unknownReason.trim() }}
        confirmLoading={commandLoading}
        onCancel={() => setUnknownExecution(null)}
        onOk={resolveUnknown}
      >
        <Alert
          type="warning"
          showIcon
          message="必须人工确认潜在重复调用与计费风险"
          description={<Text code>{unknownExecution?.execution_id}</Text>}
        />
        <Select<AIResultUnknownDecision>
          value={unknownDecision}
          onChange={setUnknownDecision}
          options={[
            { value: 'authorize_replacement', label: '授权一次替换执行' },
            { value: 'cancel_run', label: '取消整个 Run' }
          ]}
          className="ai-governance-full-width"
        />
        <Input.TextArea
          rows={3}
          maxLength={1000}
          showCount
          value={unknownReason}
          onChange={(event) => setUnknownReason(event.target.value)}
          placeholder="必填：人工判断依据"
        />
        <Checkbox checked={unknownRiskAccepted} onChange={(event) => setUnknownRiskAccepted(event.target.checked)}>
          我确认可能发生重复 Provider 调用与计费
        </Checkbox>
      </Modal>

      <Modal visible={Boolean(output)} footer={null} width={900} title="执行输出证据" onCancel={() => setOutput(null)}>
        <Card loading={outputLoading} size="small">
          {output?.provider_receipt ? (
            <Descriptions size="small" bordered column={3}>
              <Descriptions.Item label="Provider">{output.provider_receipt.provider}</Descriptions.Item>
              <Descriptions.Item label="Model">{output.provider_receipt.model}</Descriptions.Item>
              <Descriptions.Item label="Request ID">{output.provider_receipt.request_id || '—'}</Descriptions.Item>
            </Descriptions>
          ) : null}
          <JsonEvidence value={output?.raw_output} emptyText="没有原始输出" />
          <JsonEvidence value={output?.normalized_output} emptyText="没有规范化输出" />
        </Card>
      </Modal>
    </div>
  )
}
