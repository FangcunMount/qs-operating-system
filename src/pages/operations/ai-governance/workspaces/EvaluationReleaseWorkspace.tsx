import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { CaretRightOutlined, ReloadOutlined, SearchOutlined, StopOutlined } from '@ant-design/icons'
import {
  cancelAIEvaluation,
  finalizeAIEvaluation,
  getAIEvaluationCapacity,
  getAIEvaluationRun,
  listAIEvaluationRuns,
  recoverAIEvaluation,
  startAIEvaluation
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationRun,
  AIEvaluationRunSummary,
  AIEvaluationStatus
} from '@/api/path/aiGovernance'
import { ReleaseIdentityCard } from '../components/ReleaseIdentityCard'
import { ReasonCommandModal } from '../components/ReasonCommandModal'
import { errorMessage, evaluationStatusTag, formatTime } from '../presentation'
import { useSimplePolling } from '../../shared/hooks/useSimplePolling'

const { Paragraph, Text, Title } = Typography

function renderRunID(value: string) {
  return <Typography.Text code>{value}</Typography.Text>
}

type CommandKind = 'start' | 'cancel' | 'recover' | 'finalize'

const statusOptions: Array<{ value: AIEvaluationStatus | ''; label: string }> = [
  { value: '', label: '全部状态' },
  { value: 'collecting', label: '执行中' },
  { value: 'awaiting_review', label: '待人工审核' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'canceled', label: '已取消' }
]

const POLLING_INTERVAL_MS = 15000

const executionPhaseText = (phase?: string): string => {
  if (phase === 'dispatching') return '模型调用中'
  if (phase === 'prepared') return '等待执行'
  return '等待调度'
}

const commandCopy = (
  command: CommandKind,
  run?: AIEvaluationRun | null,
  expectedStartProviderInvocations = 0
): { title: string; confirmText: string; description: React.ReactNode; danger?: boolean } => {
  if (command === 'start') {
    return {
      title: '启动冻结发布组合评测',
      confirmText: '确认预留并启动',
      description: `本次启动会预留 ${expectedStartProviderInvocations} 次 Provider 调用。取消、失败或 result_unknown 均不退还预算。`
    }
  }
  if (command === 'recover') {
    return {
      title: '恢复评测执行',
      confirmText: '确认成本并恢复',
      description: `当前最多可能新增 ${run?.recovery_max_provider_invocations || 0} 次 Provider 调用。`
    }
  }
  if (command === 'finalize') {
    return {
      title: '终审评测 Run',
      confirmText: '生成不可变终审结论',
      description: '终审会根据完整证据生成 approved 或 rejected 结论，之后不能继续修改审核记录。'
    }
  }
  return {
    title: '取消评测 Run',
    confirmText: '确认取消',
    description: run?.status === 'awaiting_review' && run.progress.failed_attempts > 0
      ? `该 Run 包含 ${run.progress.failed_attempts} 条技术失败证据。取消会保留冻结证据并释放发布占位；已预留或可能已经发生的模型调用成本不会退还。`
      : '取消只停止后续执行，不会回收已经预留或可能已经发生的模型调用成本。',
    danger: true
  }
}

export const EvaluationReleaseWorkspace: React.FC = () => {
  const [status, setStatus] = useState<AIEvaluationStatus | ''>('')
  const [runs, setRuns] = useState<AIEvaluationRunSummary[]>([])
  const [nextCursor, setNextCursor] = useState('')
  const [selected, setSelected] = useState<AIEvaluationRun | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [commandLoading, setCommandLoading] = useState(false)
  const [startPreparing, setStartPreparing] = useState(false)
  const [expectedStartProviderInvocations, setExpectedStartProviderInvocations] = useState(0)
  const [command, setCommand] = useState<CommandKind | null>(null)
  const [error, setError] = useState('')
  const [manualRunID, setManualRunID] = useState('')

  const load = useCallback(async (cursor = '', append = false) => {
    setLoading(true)
    setError('')
    const [requestError, response] = await listAIEvaluationRuns({
      status: status || undefined,
      cursor: cursor || undefined,
      limit: 20
    })
    setLoading(false)
    if (requestError || !response) {
      setError(errorMessage(requestError, '评测 Run 列表获取失败'))
      return
    }
    const items = response.data?.items || []
    setRuns((current) => append ? [...current, ...items] : items)
    setNextCursor(response.data?.next_cursor || '')
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  const refreshCollectingRuns = useCallback(async () => {
    const selectedRunID = selected?.status === 'collecting' ? selected.run_id : ''
    const listRequest = listAIEvaluationRuns({ status: status || undefined, limit: 20 })
    const detailRequest = selectedRunID ? getAIEvaluationRun(selectedRunID) : null
    const listResult = await listRequest
    const detailResult = detailRequest ? await detailRequest : null

    const [listError, listResponse] = listResult
    if (!listError && listResponse) {
      setRuns(listResponse.data?.items || [])
      setNextCursor(listResponse.data?.next_cursor || '')
      setError('')
    }

    if (detailResult) {
      const [detailError, detailResponse] = detailResult
      if (!detailError && detailResponse) {
        setSelected(detailResponse.data)
      }
    }
  }, [selected?.run_id, selected?.status, status])

  const pollingEnabled = runs.some((run) => run.status === 'collecting') || selected?.status === 'collecting'
  useSimplePolling({
    enabled: pollingEnabled,
    intervalMs: POLLING_INTERVAL_MS,
    onTick: refreshCollectingRuns
  })

  const openRun = async (run: AIEvaluationRunSummary) => {
    setDetailLoading(true)
    const [requestError, response] = await getAIEvaluationRun(run.run_id)
    setDetailLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '评测详情获取失败'))
      return
    }
    setSelected(response.data)
  }

  const findRunByID = async (runID: string) => {
    if (!runID.trim()) return
    setDetailLoading(true)
    const [requestError, response] = await getAIEvaluationRun(runID.trim())
    setDetailLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '指定评测 Run 获取失败'))
      return
    }
    const run = response.data
    setRuns((current) => [run, ...current.filter((item) => item.run_id !== run.run_id)])
    setSelected(run)
  }

  const prepareStart = async () => {
    setStartPreparing(true)
    const [requestError, response] = await getAIEvaluationCapacity()
    setStartPreparing(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '启动成本与容量获取失败，不能提交过期成本确认'))
      return
    }
    const capacity = response.data
    if (capacity.over_limit || capacity.available_full_run_starts < 1) {
      message.warning('当前机构没有可用的完整评测容量')
      return
    }
    setExpectedStartProviderInvocations(capacity.provider_invocations_per_start)
    setCommand('start')
  }

  const executeCommand = async (reason: string) => {
    if (!command) return
    setCommandLoading(true)
    let result: [any, { data: AIEvaluationRun } | undefined]
    if (command === 'start') {
      if (expectedStartProviderInvocations < 1) {
        setCommandLoading(false)
        message.error('启动成本确认已失效，请重新发起')
        return
      }
      result = await startAIEvaluation(
        expectedStartProviderInvocations,
        reason
      ) as [any, { data: AIEvaluationRun } | undefined]
    } else if (!selected) {
      setCommandLoading(false)
      return
    } else if (command === 'recover') {
      result = await recoverAIEvaluation(
        selected.run_id,
        selected.recovery_max_provider_invocations,
        reason
      ) as [any, { data: AIEvaluationRun } | undefined]
    } else if (command === 'finalize') {
      result = await finalizeAIEvaluation(selected.run_id, reason) as [any, { data: AIEvaluationRun } | undefined]
    } else {
      result = await cancelAIEvaluation(selected.run_id, reason) as [any, { data: AIEvaluationRun } | undefined]
    }
    setCommandLoading(false)
    const [requestError, response] = result
    if (requestError || !response) {
      message.error(errorMessage(requestError, '评测治理操作失败'))
      return
    }
    setCommand(null)
    setSelected(response.data)
    message.success('评测治理操作已提交并记录审计')
    load()
  }

  const generationPercent = useMemo(() => {
    if (!selected?.progress.planned_generation_attempts) return 0
    return Math.round(
      selected.progress.generation_attempts / selected.progress.planned_generation_attempts * 100
    )
  }, [selected])
  const reviewPercent = selected?.progress.required_reviews
    ? Math.round(selected.progress.recorded_reviews / selected.progress.required_reviews * 100)
    : 0

  const columns = [
    {
      title: 'Run',
      dataIndex: 'run_id',
      render: renderRunID
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value: AIEvaluationStatus) => evaluationStatusTag(value)
    },
    {
      title: '生成执行 / 35',
      render: (_: unknown, value: AIEvaluationRunSummary) =>
        `${value.progress.generation_attempts}/${value.progress.planned_generation_attempts || 35}`
    },
    {
      title: '人工审核 / 70',
      render: (_: unknown, value: AIEvaluationRunSummary) =>
        `${value.progress.recorded_reviews}/${value.progress.required_reviews || 70}`
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      render: formatTime
    }
  ]
  const copy = command ? commandCopy(command, selected, expectedStartProviderInvocations) : null

  return (
    <div className="ai-governance-workspace">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>评测发布</Title>
          <Paragraph type="secondary">每个 Run 冻结完整发布身份；质量证据通过不等于自动发布 Profile。</Paragraph>
        </div>
        <Space wrap>
          <Input.Search
            value={manualRunID}
            onChange={(event) => setManualRunID(event.target.value)}
            onSearch={findRunByID}
            enterButton={<SearchOutlined />}
            placeholder="按 Run ID 定位"
            style={{ width: 240 }}
          />
          <Select value={status} options={statusOptions} onChange={setStatus} style={{ width: 160 }} />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => load()}>刷新</Button>
          <Button
            type="primary"
            icon={<CaretRightOutlined />}
            loading={startPreparing}
            onClick={prepareStart}
          >
            启动评测
          </Button>
        </Space>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          message="评测目录暂不可用"
          description={`${error}。仍可按 Run ID 精确定位；前端不会用静态样例代替真实评测 Run。`}
        />
      ) : null}

      <Table
        className="ai-governance-selectable-table"
        rowKey="run_id"
        loading={loading}
        dataSource={runs}
        columns={columns}
        pagination={false}
        size="middle"
        onRow={(record) => ({ onClick: () => openRun(record) })}
        rowClassName={(record) => record.run_id === selected?.run_id ? 'is-selected' : ''}
        locale={{ emptyText: <Empty description="当前筛选条件下没有评测 Run" /> }}
      />
      {nextCursor ? <Button className="ai-governance-load-more" onClick={() => load(nextCursor, true)}>加载更多</Button> : null}

      {selected ? (
        <Card
          className="ai-governance-detail-card"
          loading={detailLoading}
          title={<Space>{evaluationStatusTag(selected.status)}<Text code>{selected.run_id}</Text></Space>}
          extra={(
            <Space>
              {selected.status === 'collecting' && selected.recovery_max_provider_invocations > 0 ? (
                <Button onClick={() => setCommand('recover')}>恢复</Button>
              ) : null}
              {selected.can_cancel ? (
                <Button danger icon={<StopOutlined />} onClick={() => setCommand('cancel')}>取消</Button>
              ) : null}
              {selected.can_finalize ? (
                <Button type="primary" onClick={() => setCommand('finalize')}>终审</Button>
              ) : null}
            </Space>
          )}
        >
          <Descriptions size="small" column={3}>
            <Descriptions.Item label="申请人">{selected.requested_by || '—'}</Descriptions.Item>
            <Descriptions.Item label="申请理由">{selected.request_reason || '—'}</Descriptions.Item>
            <Descriptions.Item label="版本">{selected.version}</Descriptions.Item>
          </Descriptions>
          {selected.status === 'collecting' ? (
            <Alert
              className="ai-governance-inline-alert"
              type="info"
              showIcon
              message="评测正在串行执行，页面每 15 秒自动刷新"
              description={(
                <Space direction="vertical" size={2}>
                  <Text>
                    {selected.execution
                      ? `当前 ${selected.execution.case_id} 第 ${selected.execution.attempt} 次：${executionPhaseText(selected.execution.phase)}`
                      : '当前执行记录正在调度中'}
                  </Text>
                  <Text type="secondary">
                    每条先执行生成；仅当输出通过结构校验且存在语义检查项时，才调用独立模型裁判，因此裁判次数最多为 35 次。
                  </Text>
                </Space>
              )}
            />
          ) : null}
          <div className="ai-governance-progress-grid">
            <Card size="small" title="35 次生成 + 最多 35 次独立模型裁判">
              <Progress
                percent={generationPercent}
                status={selected.progress.failed_attempts > 0 || selected.status === 'rejected' ? 'exception' : 'active'}
              />
              <Space wrap>
                <Text>{selected.progress.generation_attempts}/35 次生成执行完成</Text>
                {selected.progress.failed_attempts > 0 ? (
                  <Tag color="red">{selected.progress.failed_attempts} 条技术失败</Tag>
                ) : null}
              </Space>
            </Card>
            <Card size="small" title="双角色人工审核">
              <Progress percent={reviewPercent} status={selected.progress.rejected_reviews ? 'exception' : 'active'} />
              <Space wrap>
                <Text>{selected.progress.recorded_reviews}/70 条审核完成</Text>
                {selected.progress.rejected_reviews ? <Tag color="red">{selected.progress.rejected_reviews} 条拒绝</Tag> : null}
              </Space>
            </Card>
          </div>
          {selected.status === 'awaiting_review' && selected.progress.failed_attempts > 0 ? (
            <Alert
              className="ai-governance-inline-alert"
              type="error"
              showIcon
              message="该 Run 不可进入人工审核"
              description="生成执行记录完整不代表生成与独立模型裁判成功。请审计取消该 Run，修复技术故障后启动新的冻结评测。"
            />
          ) : null}
          <ReleaseIdentityCard release={selected.release} />
          {selected.gate ? (
            <Alert
              className="ai-governance-inline-alert"
              type={selected.gate.passed ? 'success' : 'error'}
              showIcon
              message={selected.gate.passed ? '发布质量门禁通过' : '发布质量门禁未通过'}
              description={selected.gate.reasons.map((item) => item.detail).join('；') || '所有冻结门禁均通过。'}
            />
          ) : null}
        </Card>
      ) : null}

      {copy ? (
        <ReasonCommandModal
          visible
          title={copy.title}
          description={copy.description}
          confirmText={copy.confirmText}
          danger={copy.danger}
          loading={commandLoading}
          onCancel={() => setCommand(null)}
          onConfirm={executeCommand}
        />
      ) : null}
    </div>
  )
}
