import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Descriptions, Empty, Row, Space, Table, Tag, Typography, message } from 'antd'
import { ReloadOutlined, RetweetOutlined } from '@ant-design/icons'
import {
  getAIEvaluationAttemptRecheck,
  listAIEvaluationAttemptRechecks,
  startAIEvaluationAttemptRecheck
} from '@/api/path/aiGovernance'
import type { AIAttemptRecheck, AIAttemptRecheckStatus } from '@/api/path/aiGovernance'
import { useSimplePolling } from '../../shared/hooks/useSimplePolling'
import { errorMessage, formatTime } from '../presentation'
import { JsonEvidence } from './JsonEvidence'
import { ReasonCommandModal } from './ReasonCommandModal'

const { Paragraph, Text } = Typography
const RECHECK_PROVIDER_INVOCATIONS = 2
const POLLING_INTERVAL_MS = 5000

const isActive = (value: AIAttemptRecheck): boolean =>
  value.status === 'queued' || value.status === 'dispatching'

function recheckStatusTag(status: AIAttemptRecheckStatus) {
  const values: Record<AIAttemptRecheckStatus, { color: string; label: string }> = {
    queued: { color: 'blue', label: '等待调度' },
    dispatching: { color: 'processing', label: '模型调用中' },
    completed: { color: 'green', label: '复测成功' },
    failed: { color: 'red', label: '技术失败' },
    result_unknown: { color: 'red', label: '结果未知' }
  }
  const value = values[status]
  return <Tag color={value.color}>{value.label}</Tag>
}

function renderRecheckID(value: string) {
  return <Text code>{value}</Text>
}

function renderRecheckRelease(_: unknown, value: AIAttemptRecheck) {
  return (
    <Space direction="vertical" size={0}>
      <Text>{value.release.provider.route_revision} / {value.release.provider.resolved_model}</Text>
      <Text type="secondary">
        裁判 {value.release.semantic_evaluator.provider.route_revision} / {value.release.semantic_evaluator.provider.resolved_model}
      </Text>
    </Space>
  )
}

interface AttemptRecheckPanelProps {
  runID: string
  caseID: string
  attempt: number
}

export const AttemptRecheckPanel: React.FC<AttemptRecheckPanelProps> = ({ runID, caseID, attempt }) => {
  const [items, setItems] = useState<AIAttemptRecheck[]>([])
  const [selected, setSelected] = useState<AIAttemptRecheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [starting, setStarting] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [requestError, response] = await listAIEvaluationAttemptRechecks(runID, caseID, attempt)
    setLoading(false)
    if (requestError || !response) {
      setError(errorMessage(requestError, '单条复测历史获取失败'))
      return
    }
    const values = response.data || []
    setError('')
    setItems(values)
    setSelected((current) => {
      if (!current) return null
      const summary = values.find((item) => item.recheck_id === current.recheck_id)
      return summary ? { ...summary, result: current.result } : current
    })
  }, [attempt, caseID, runID])

  useEffect(() => {
    setItems([])
    setSelected(null)
    setError('')
    load()
  }, [load])

  const active = useMemo(() => items.find(isActive), [items])

  const refreshActive = useCallback(async () => {
    if (!active) return
    const [requestError, response] = await getAIEvaluationAttemptRecheck(
      runID,
      caseID,
      attempt,
      active.recheck_id
    )
    if (requestError || !response) return
    const value = response.data
    setItems((current) => [value, ...current.filter((item) => item.recheck_id !== value.recheck_id)])
    setSelected((current) => current?.recheck_id === value.recheck_id ? value : current)
  }, [active, attempt, caseID, runID])

  useSimplePolling({
    enabled: Boolean(active),
    intervalMs: POLLING_INTERVAL_MS,
    onTick: refreshActive
  })

  const openDetail = async (value: AIAttemptRecheck) => {
    setDetailLoading(true)
    const [requestError, response] = await getAIEvaluationAttemptRecheck(
      runID,
      caseID,
      attempt,
      value.recheck_id
    )
    setDetailLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '单条复测证据获取失败'))
      return
    }
    setSelected(response.data)
  }

  const start = async (reason: string) => {
    setStarting(true)
    const [requestError, response] = await startAIEvaluationAttemptRecheck(runID, caseID, attempt, reason)
    setStarting(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '单条复测启动失败'))
      return
    }
    const value = response.data
    setModalVisible(false)
    setItems((current) => [value, ...current.filter((item) => item.recheck_id !== value.recheck_id)])
    setSelected(value)
    message.success('单条诊断复测已提交，源 Run 证据和发布门禁保持不变')
  }

  function renderDetailAction(_: unknown, value: AIAttemptRecheck) {
    return <Button size="small" onClick={() => openDetail(value)}>打开</Button>
  }

  return (
    <Card
      size="small"
      className="ai-governance-recheck-panel"
      title="单条诊断复测"
      extra={(
        <Space>
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load}>刷新</Button>
          <Button
            size="small"
            type="primary"
            icon={<RetweetOutlined />}
            disabled={Boolean(active)}
            onClick={() => setModalVisible(true)}
          >
            重新测评该记录
          </Button>
        </Space>
      )}
    >
      <Alert
        type="info"
        showIcon
        message="复测只生成独立诊断证据"
        description="系统会冻结当前候选发布身份，最多调用 2 次 Provider；结果不会覆盖源记录、不会计入 35+35、不能人工审核，也不能作为 Profile 批准依据。"
      />
      {error ? <Alert className="ai-governance-inline-alert" type="warning" showIcon message={error} /> : null}
      <Table<AIAttemptRecheck>
        className="ai-governance-recheck-table"
        rowKey="recheck_id"
        loading={loading}
        dataSource={items}
        pagination={false}
        size="small"
        locale={{ emptyText: <Empty description="尚无单条复测记录" /> }}
        columns={[
          { title: '复测 ID', dataIndex: 'recheck_id', render: renderRecheckID },
          { title: '状态', dataIndex: 'status', render: recheckStatusTag },
          {
            title: '冻结模型路线',
            render: renderRecheckRelease
          },
          { title: '发起人', dataIndex: 'requested_by' },
          { title: '创建时间', dataIndex: 'created_at', render: formatTime },
          {
            title: '证据',
            render: renderDetailAction
          }
        ]}
      />

      {selected ? (
        <Card
          size="small"
          loading={detailLoading}
          className="ai-governance-recheck-detail"
          title={<Space>{recheckStatusTag(selected.status)}<Text code>{selected.recheck_id}</Text></Space>}
        >
          <Descriptions size="small" bordered column={3}>
            <Descriptions.Item label="源证据">{selected.source_case_id} #{selected.source_attempt}</Descriptions.Item>
            <Descriptions.Item label="发起理由">{selected.reason}</Descriptions.Item>
            <Descriptions.Item label="完成时间">{selected.finished_at ? formatTime(selected.finished_at) : '—'}</Descriptions.Item>
          </Descriptions>
          {selected.status === 'result_unknown' ? (
            <Alert
              className="ai-governance-inline-alert"
              type="error"
              showIcon
              message="Provider 调用结果未知"
              description="系统不会盲目重放；若需再次复测，必须等待本次终态并重新进行成本确认。"
            />
          ) : null}
          {selected.result?.failure ? (
            <Alert
              className="ai-governance-inline-alert"
              type="error"
              showIcon
              message={`${selected.result.failure.stage}: ${selected.result.failure.code}`}
              description={selected.result.failure.safe_message}
            />
          ) : null}
          {selected.result ? (
            <>
              <Row gutter={[16, 16]} className="ai-governance-evidence-grid">
                <Col xs={24} xl={12}>
                  <Card size="small" title="复测 AI 原始输出">
                    <JsonEvidence value={selected.result.raw_provider_output} emptyText="Provider 未返回输出" />
                  </Card>
                </Col>
                <Col xs={24} xl={12}>
                  <Card size="small" title="复测规范化输出">
                    <JsonEvidence value={selected.result.normalized_output} emptyText="输出未通过结构化解析" />
                  </Card>
                </Col>
              </Row>
              <Card size="small" title="复测校验证据">
                <Table
                  rowKey={(item) => `${item.type}:${item.scope}:${item.ordinal}`}
                  dataSource={selected.result.assertions || []}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: '校验', dataIndex: 'type' },
                    { title: '执行器', dataIndex: 'evaluator' },
                    { title: '结果', dataIndex: 'status' },
                    { title: '证据', dataIndex: 'detail' }
                  ]}
                />
              </Card>
            </>
          ) : (
            <Paragraph type="secondary" className="ai-governance-inline-alert">
              复测正在执行，页面每 5 秒刷新；源 Run 不受影响。
            </Paragraph>
          )}
        </Card>
      ) : null}

      {modalVisible ? (
        <ReasonCommandModal
          visible
          title="重新测评该记录"
          description={`本次最多产生 ${RECHECK_PROVIDER_INVOCATIONS} 次 Provider 调用，预算预留后不退还。复测仅供诊断，不改变源 Run 和发布门禁。`}
          confirmText="确认成本并启动复测"
          loading={starting}
          onCancel={() => setModalVisible(false)}
          onConfirm={start}
        />
      ) : null}
    </Card>
  )
}
