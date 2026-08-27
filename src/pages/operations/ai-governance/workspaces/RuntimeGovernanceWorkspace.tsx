import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Progress,
  Radio,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { ReloadOutlined, SafetyCertificateOutlined, WarningOutlined } from '@ant-design/icons'
import {
  getAIEvaluationCapacity,
  getAIParticipantCapacity,
  retryAIParticipantGeneration
} from '@/api/path/aiGovernance'
import type { AIEvaluationCapacity, AIParticipantCapacity } from '@/api/path/aiGovernance'
import { GovernanceStatGrid } from '../../shared/components/GovernanceStatGrid'
import { errorMessage, formatTime } from '../presentation'

const { Paragraph, Text, Title } = Typography

type FailureKind = 'failed' | 'result_unknown'

interface RetryFormState {
  generationID: string
  requestID: string
  reason: string
  confirmCost: boolean
  failureKind: FailureKind
  acceptUnknownRisk: boolean
}

export const retryAuthorizationBlocker = (value: RetryFormState): string => {
  if (!value.generationID.trim()) return 'Generation ID 不能为空'
  if (!value.requestID.trim()) return 'request_id 不能为空'
  if (!value.reason.trim()) return '恢复理由不能为空'
  if (!value.confirmCost) return '必须确认新增 Provider 调用成本'
  if (value.failureKind === 'result_unknown' && !value.acceptUnknownRisk) {
    return 'result_unknown 重试必须接受潜在重复外部调用风险'
  }
  return ''
}

export const RuntimeGovernanceWorkspace: React.FC = () => {
  const [evaluationCapacity, setEvaluationCapacity] = useState<AIEvaluationCapacity | null>(null)
  const [participantCapacity, setParticipantCapacity] = useState<AIParticipantCapacity | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generationID, setGenerationID] = useState('')
  const [expectedAttempt, setExpectedAttempt] = useState(1)
  const [requestID, setRequestID] = useState('')
  const [failureKind, setFailureKind] = useState<FailureKind>('failed')
  const [reason, setReason] = useState('')
  const [confirmCost, setConfirmCost] = useState(false)
  const [acceptUnknownRisk, setAcceptUnknownRisk] = useState(false)
  const [retrying, setRetrying] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [evaluationResult, participantResult] = await Promise.all([
      getAIEvaluationCapacity(),
      getAIParticipantCapacity()
    ])
    setLoading(false)
    const [evaluationError, evaluationResponse] = evaluationResult
    const [participantError, participantResponse] = participantResult
    if (evaluationResponse) setEvaluationCapacity(evaluationResponse.data)
    if (participantResponse) setParticipantCapacity(participantResponse.data)
    if (evaluationError || participantError) {
      setError([
        evaluationError ? errorMessage(evaluationError, '评测容量获取失败') : '',
        participantError ? errorMessage(participantError, '用户调用容量获取失败') : ''
      ].filter(Boolean).join('；'))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const retry = async () => {
    const blocker = retryAuthorizationBlocker({
      generationID,
      requestID,
      reason,
      confirmCost,
      failureKind,
      acceptUnknownRisk
    })
    if (blocker) {
      message.error(blocker)
      return
    }
    setRetrying(true)
    const [requestError, response] = await retryAIParticipantGeneration(generationID.trim(), {
      expected_attempt: expectedAttempt,
      request_id: requestID.trim(),
      confirm: true,
      expected_provider_invocations: 1,
      accept_result_unknown_risk: failureKind === 'result_unknown' && acceptUnknownRisk,
      reason: reason.trim()
    })
    setRetrying(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Generation 人工重试授权失败'))
      return
    }
    message.success(response.data.created ? '已创建下一次受控执行' : '相同 request_id 已存在，返回原有结果')
    setConfirmCost(false)
    setAcceptUnknownRisk(false)
    setReason('')
    load()
  }

  const evaluationPercent = evaluationCapacity?.daily_provider_invocation_limit
    ? Math.min(100, Math.round(
      evaluationCapacity.reserved_provider_invocations /
      evaluationCapacity.daily_provider_invocation_limit * 100
    ))
    : 0
  const participantPercent = participantCapacity?.daily_provider_invocation_limit_per_org
    ? Math.min(100, Math.round(
      participantCapacity.reserved_provider_invocations /
      participantCapacity.daily_provider_invocation_limit_per_org * 100
    ))
    : 0

  return (
    <div className="ai-governance-workspace">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>运行治理</Title>
          <Paragraph type="secondary">容量账本只追加外部调用预留；失败和 result_unknown 不自动退款。</Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>刷新运行状态</Button>
      </div>

      {error ? <Alert type="error" showIcon message="部分运行治理数据不可用" description={error} /> : null}

      <GovernanceStatGrid items={[
        {
          key: 'evaluation-remaining',
          title: '今日剩余评测调用',
          value: evaluationCapacity?.remaining_provider_invocations ?? '—',
          prefix: <SafetyCertificateOutlined />
        },
        {
          key: 'evaluation-starts',
          title: '可启动完整评测',
          value: evaluationCapacity?.available_full_run_starts ?? '—',
          suffix: '次'
        },
        {
          key: 'participant-remaining',
          title: '今日剩余用户调用',
          value: participantCapacity?.remaining_org_provider_invocations ?? '—'
        },
        {
          key: 'participant-active',
          title: '当前活跃 Provider 执行',
          value: participantCapacity?.active_provider_executions ?? '—',
          suffix: participantCapacity ? `/${participantCapacity.max_active_provider_executions_per_org}` : ''
        }
      ]} />

      <Row gutter={[16, 16]} className="ai-governance-capacity-grid">
        <Col xs={24} xl={12}>
          <Card title="Prompt 评测容量">
            {evaluationCapacity ? (
              <>
                <Progress
                  percent={evaluationPercent}
                  status={evaluationCapacity.over_limit ? 'exception' : 'active'}
                  format={() => `${evaluationCapacity.reserved_provider_invocations}/${evaluationCapacity.daily_provider_invocation_limit}`}
                />
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="预算日">{formatTime(evaluationCapacity.budget_day)}</Descriptions.Item>
                  <Descriptions.Item label="单次启动成本">{evaluationCapacity.provider_invocations_per_start}</Descriptions.Item>
                  <Descriptions.Item label="机构活跃上限">{evaluationCapacity.max_active_runs_per_org}</Descriptions.Item>
                  <Descriptions.Item label="超限">{evaluationCapacity.over_limit ? <Tag color="red">是</Tag> : '否'}</Descriptions.Item>
                </Descriptions>
                <Table
                  rowKey="run_id"
                  size="small"
                  pagination={false}
                  dataSource={evaluationCapacity.reservations}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="今日暂无评测预留" /> }}
                  columns={[
                    { title: 'Run', dataIndex: 'run_id' },
                    { title: '申请人', dataIndex: 'requested_by' },
                    { title: '调用', dataIndex: 'provider_invocations' },
                    { title: '预留时间', dataIndex: 'reserved_at', render: formatTime }
                  ]}
                />
              </>
            ) : <Empty description="评测容量暂不可用" />}
          </Card>
        </Col>
        <Col xs={24} xl={12}>
          <Card title="用户调用容量">
            {participantCapacity ? (
              <>
                <Progress
                  percent={participantPercent}
                  status={participantCapacity.over_org_limit ? 'exception' : 'active'}
                  format={() => `${participantCapacity.reserved_provider_invocations}/${participantCapacity.daily_provider_invocation_limit_per_org}`}
                />
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="每用户日上限">{participantCapacity.daily_provider_invocation_limit_per_user}</Descriptions.Item>
                  <Descriptions.Item label="每测评日上限">{participantCapacity.daily_provider_invocation_limit_per_assessment}</Descriptions.Item>
                  <Descriptions.Item label="活跃槽剩余">{participantCapacity.remaining_org_active_provider_executions}</Descriptions.Item>
                  <Descriptions.Item label="已脱敏账本调用">{participantCapacity.redacted_provider_invocations}</Descriptions.Item>
                </Descriptions>
              </>
            ) : <Empty description="用户调用容量暂不可用" />}
          </Card>
        </Col>
      </Row>

      <Card title="当前活跃 Provider 调用" className="ai-governance-detail-card">
        <Table
          rowKey="run_id"
          size="small"
          pagination={false}
          dataSource={participantCapacity?.active_reservations || []}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前没有活跃 Provider 调用" /> }}
          columns={[
            { title: 'Generation', dataIndex: 'generation_id' },
            { title: 'Run', dataIndex: 'run_id' },
            { title: '用户', dataIndex: 'user_id' },
            { title: '测评', dataIndex: 'assessment_id' },
            { title: '占用时间', dataIndex: 'acquired_at', render: formatTime }
          ]}
        />
      </Card>

      <Card title="失败 Generation / result_unknown 人工恢复" className="ai-governance-detail-card">
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="当前 qs-server 尚未提供失败 Generation 候选列表契约"
          description="本页面不会把容量预留或活跃槽记录误判成失败任务。请使用告警、审计或支持单提供的 Generation ID 执行受控恢复。"
        />
        <div className="ai-governance-retry-form">
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Text strong>Generation ID</Text>
              <Input value={generationID} onChange={(event) => setGenerationID(event.target.value)} />
            </Col>
            <Col xs={24} md={6}>
              <Text strong>期望当前 attempt</Text>
              <InputNumber min={1} value={expectedAttempt} onChange={(value) => setExpectedAttempt(value || 1)} />
            </Col>
            <Col xs={24} md={6}>
              <Text strong>故障类型</Text>
              <Radio.Group value={failureKind} onChange={(event) => setFailureKind(event.target.value)}>
                <Radio.Button value="failed">明确失败</Radio.Button>
                <Radio.Button value="result_unknown">result_unknown</Radio.Button>
              </Radio.Group>
            </Col>
          </Row>
          <Text strong>幂等 request_id</Text>
          <Input value={requestID} maxLength={256} onChange={(event) => setRequestID(event.target.value)} />
          <Text strong>恢复理由</Text>
          <Input.TextArea
            rows={3}
            maxLength={1000}
            showCount
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <Space direction="vertical">
            <Checkbox checked={confirmCost} onChange={(event) => setConfirmCost(event.target.checked)}>
              我确认本次恢复最多新增 1 次 Provider 调用，且不会退还既有预算
            </Checkbox>
            {failureKind === 'result_unknown' ? (
              <Checkbox checked={acceptUnknownRisk} onChange={(event) => setAcceptUnknownRisk(event.target.checked)}>
                我接受原调用可能已成功、再次执行可能产生重复外部调用的风险
              </Checkbox>
            ) : null}
          </Space>
          <Button
            type="primary"
            danger={failureKind === 'result_unknown'}
            loading={retrying}
            disabled={Boolean(retryAuthorizationBlocker({
              generationID,
              requestID,
              reason,
              confirmCost,
              failureKind,
              acceptUnknownRisk
            }))}
            onClick={retry}
          >
            授权下一次人工重试
          </Button>
        </div>
      </Card>
    </div>
  )
}
