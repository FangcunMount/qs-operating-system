import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getSystemGovernanceDeliveryReplayReviews, getSystemGovernancePendingReplayAudits } from '@/api/path/systemGovernance'
import type { ActionDescriptor, DeliveryReplayReview, DeliveryReplayReviewTarget, PendingReplayAudit, Signal } from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { formatDateTime, renderActionStatusTags } from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'
import { DeliveryResolutionDrawer } from '../components/DeliveryResolutionDrawer'
import { actionPresentation, domainPresentation } from '../presentation'

const { Text } = Typography

interface ActionsTabProps {
  actions: ActionDescriptor[]
  signals?: Signal[]
}

function renderActionRunButton(
  _value: unknown,
  record: ActionDescriptor,
  openDrawer: (action: ActionDescriptor) => void
) {
  return (
    <Button
      type="link"
      disabled={!record.enabled}
      onClick={() => openDrawer(record)}
    >
      执行
    </Button>
  )
}

function renderActionIdentity(_value: unknown, record: ActionDescriptor) {
  return (
    <Space direction="vertical" size={0}>
      <Text strong>{actionPresentation(record).label}</Text>
      <Text type="secondary" code>{record.id}</Text>
    </Space>
  )
}

function renderRiskLevel(value: string) {
  return (
    <Tag color={value === 'high' ? 'red' : value === 'medium' ? 'orange' : 'blue'}>
      {value === 'high' ? '高' : value === 'medium' ? '中' : '低'}
    </Tag>
  )
}

function renderPendingRequestID(value: string) {
  return <Text code copyable>{value}</Text>
}

const deliveryDispositionLabels: Record<string, string> = {
  automatic: '已占用，待核对',
  manual_required: '待人工处理',
  terminal: '已标记终态',
  archived_mock: '历史 mock 已归档',
  resolved_verified: '已按业务事实结案',
  unavailable: '未找到或不在当前机构'
}

function renderDeliveryTargets(
  _value: unknown,
  record: DeliveryReplayReview,
  openResolution: (review: DeliveryReplayReview, target: DeliveryReplayReviewTarget) => void
) {
  if (!record.targets_readable) return <Text type="warning">原目标无法解析，请人工核对审计</Text>
  return (
    <details>
      <summary>{record.targets.length} 条目标</summary>
      <Space direction="vertical" size={2}>
        {record.targets.map((target) => (
          <Space key={target.dead_letter_id} wrap>
            <Text code copyable>#{target.dead_letter_id}</Text>
            <Tag color={target.disposition === 'automatic' ? 'orange' : undefined}>
              {deliveryDispositionLabels[target.disposition] || target.disposition}
            </Tag>
            {target.linked_to_request ? <Text type="warning">关联本操作</Text> : null}
            {!target.linked_to_request && target.disposition === 'automatic'
              ? <Text type="warning">由其他操作占用</Text> : null}
            {['failed', 'timeout', 'pending_reconciliation'].includes(record.status) &&
              target.disposition === 'automatic' && target.linked_to_request &&
              target.event_type === 'interpretation.report.generated' &&
              target.event_id && target.delivery_attempts && target.delivery_attempts > 0
              ? <Button type="link" onClick={() => openResolution(record, target)}>核实业务事实后结案</Button> : null}
          </Space>
        ))}
      </Space>
    </details>
  )
}

export const ActionsTab: React.FC<ActionsTabProps> = ({ actions, signals = [] }) => {
  const [selectedAction, setSelectedAction] = useState<ActionDescriptor | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<PendingReplayAudit | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [pendingAudits, setPendingAudits] = useState<PendingReplayAudit[]>([])
  const [pendingCursor, setPendingCursor] = useState('')
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState('')
  const replayAction = actions.find((action) => action.id === 'events.replay_pending')
  const deliveryReplayAction = actions.find((action) => action.id === 'events.replay_delivery')
  const [deliveryReviews, setDeliveryReviews] = useState<DeliveryReplayReview[]>([])
  const [deliveryCursor, setDeliveryCursor] = useState('')
  const [deliveryLoading, setDeliveryLoading] = useState(false)
  const [deliveryError, setDeliveryError] = useState('')
  const [resolutionReview, setResolutionReview] = useState<DeliveryReplayReview | null>(null)
  const [resolutionTarget, setResolutionTarget] = useState<DeliveryReplayReviewTarget | null>(null)
  const [resolutionVisible, setResolutionVisible] = useState(false)

  const openResolution = (review: DeliveryReplayReview, target: DeliveryReplayReviewTarget) => {
    setResolutionReview(review)
    setResolutionTarget(target)
    setResolutionVisible(true)
  }

  const loadPending = useCallback(async (cursor?: string) => {
    setPendingLoading(true)
    const [requestError, response] = await getSystemGovernancePendingReplayAudits({
      ...(cursor ? { cursor } : {}), limit: 50
    })
    if (requestError || !response?.data) {
      setPendingError(extractErrorMessage(requestError, '获取待核对操作失败'))
      setPendingLoading(false)
      return
    }
    setPendingAudits((current) => cursor ? [...current, ...(response.data.items || [])] : response.data.items || [])
    setPendingCursor(response.data.next_cursor || '')
    setPendingError('')
    setPendingLoading(false)
  }, [])

  useEffect(() => {
    if (replayAction) void loadPending()
  }, [loadPending, replayAction?.id])

  const loadDeliveryReviews = useCallback(async (cursor?: string) => {
    setDeliveryLoading(true)
    const [requestError, response] = await getSystemGovernanceDeliveryReplayReviews({
      ...(cursor ? { cursor } : {}), limit: 50
    })
    if (requestError || !response?.data) {
      setDeliveryError(extractErrorMessage(requestError, '获取传输重放审计失败'))
      setDeliveryLoading(false)
      return
    }
    setDeliveryReviews((current) => cursor ? [...current, ...(response.data.items || [])] : response.data.items || [])
    setDeliveryCursor(response.data.next_cursor || '')
    setDeliveryError('')
    setDeliveryLoading(false)
  }, [])

  useEffect(() => {
    if (deliveryReplayAction) void loadDeliveryReviews()
  }, [deliveryReplayAction?.id, loadDeliveryReviews])

  const openDrawer = (action: ActionDescriptor, audit?: PendingReplayAudit) => {
    setSelectedAction(action)
    setSelectedAudit(audit || null)
    setDrawerVisible(true)
  }

  function renderReconcileButton(_value: unknown, record: PendingReplayAudit) {
    return (
      <Button type="link" disabled={!replayAction?.enabled} onClick={() => replayAction && openDrawer(replayAction, record)}>
        按原编号核对
      </Button>
    )
  }

  const pendingColumns: ColumnsType<PendingReplayAudit> = [
    { title: '操作编号', dataIndex: 'request_id', key: 'request_id', width: 220, render: renderPendingRequestID },
    { title: '存储', dataIndex: 'store', key: 'store', width: 180 },
    { title: '原操作者', dataIndex: 'actor_user_id', key: 'actor_user_id', width: 150 },
    { title: '进入待核对时间', dataIndex: 'updated_at', key: 'updated_at', width: 190, render: formatDateTime },
    { title: '操作', key: 'reconcile', width: 150, render: renderReconcileButton }
  ]

  const deliveryColumns: ColumnsType<DeliveryReplayReview> = [
    { title: '原操作编号', dataIndex: 'request_id', key: 'request_id', width: 230, render: renderPendingRequestID },
    { title: '原操作者', dataIndex: 'actor_user_id', key: 'actor_user_id', width: 130 },
    { title: '审计状态', dataIndex: 'status', key: 'status', width: 190, render: (value: string) => ({
      running: '仍标记运行中',
      pending_reconciliation: '待核对',
      failed: '操作失败，投递待核对',
      timeout: '操作超时，投递待核对'
    }[value] || value) },
    { title: '开始时间', dataIndex: 'started_at', key: 'started_at', width: 190, render: formatDateTime },
    { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 190, render: formatDateTime },
    { title: '目标当前状态', key: 'targets', render: (value, record) => renderDeliveryTargets(value, record, openResolution) }
  ]

  const columns: ColumnsType<ActionDescriptor> = [
    {
      title: '治理动作',
      key: 'label',
      width: 240,
      render: renderActionIdentity
    },
    {
      title: '适用场景',
      key: 'description',
      render: (_value, record) => actionPresentation(record).description
    },
    {
      title: '领域',
      dataIndex: 'domain',
      key: 'domain',
      width: 130,
      render: (value: string) => domainPresentation(value).label
    },
    {
      title: '风险',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: renderRiskLevel
    },
    {
      title: '状态',
      key: 'status',
      width: 160,
      render: (_value, record) => renderActionStatusTags(record)
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (value, record) => renderActionRunButton(value, record, openDrawer)
    }
  ]

  const recommendedIDs = new Set(signals.flatMap((signal) => signal.action_ids || []))
  const recommendedActions = actions.filter((action) => recommendedIDs.has(action.id))

  return (
    <>
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message="治理动作不是日常操作入口"
        description="请先从运行总览定位问题并核对证据。所有动作都要求明确输入，并由服务端执行确认、并发保护和审计记录。"
      />
      {replayAction ? (
        <section className="system-governance-pending-replay-audits">
          <Typography.Title level={5}>待核对的重放操作</Typography.Title>
          <Alert
            type="warning"
            showIcon
            message="结果未知时只核对原操作"
            description="请由原操作者沿用列表中的操作编号与原输入；不要新建操作编号或修改审批内容。"
            style={{ marginBottom: 12 }}
          />
          {pendingError ? <Alert type="error" message={pendingError} style={{ marginBottom: 12 }} /> : null}
          <Table
            rowKey="request_id"
            columns={pendingColumns}
            dataSource={pendingAudits}
            loading={pendingLoading && !pendingAudits.length}
            pagination={false}
            size="small"
            scroll={{ x: 900 }}
            locale={{ emptyText: '当前没有待核对的重放操作' }}
          />
          {pendingCursor ? <Button loading={pendingLoading} onClick={() => void loadPending(pendingCursor)}>加载更多待核对操作</Button> : null}
        </section>
      ) : null}
      {deliveryReplayAction ? (
        <section className="system-governance-delivery-replay-reviews">
          <Typography.Title level={5}>传输重放待核对操作</Typography.Title>
          <Alert
            type="warning"
            showIcon
            message="先核对业务事实，不能据此再次投递"
            description="请结合原操作编号、死信记录和下游业务事实核对。报告生成事件满足条件时可提交按事实结案；操作失败不代表消息一定没有发出，运行中审计也可能仍在执行。"
            style={{ marginBottom: 12 }}
          />
          {deliveryError ? <Alert type="error" message={deliveryError} style={{ marginBottom: 12 }} /> : null}
          <Table
            rowKey="request_id"
            columns={deliveryColumns}
            dataSource={deliveryReviews}
            loading={deliveryLoading && !deliveryReviews.length}
            pagination={false}
            size="small"
            scroll={{ x: 950 }}
            locale={{ emptyText: '当前没有传输重放待核对操作' }}
          />
          <Space style={{ marginTop: 8 }}>
            <Button loading={deliveryLoading} onClick={() => void loadDeliveryReviews()}>刷新核对列表</Button>
            {deliveryCursor ? <Button loading={deliveryLoading} onClick={() => void loadDeliveryReviews(deliveryCursor)}>加载更多</Button> : null}
          </Space>
        </section>
      ) : null}
      {recommendedActions.length ? (
        <section className="system-governance-recommended-actions">
          <Typography.Title level={5}>根据当前问题建议</Typography.Title>
          <Row gutter={[12, 12]}>
            {recommendedActions.map((action) => (
              <Col xs={24} md={12} key={action.id}>
                <Card size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space wrap>
                      <Text strong>{actionPresentation(action).label}</Text>
                      {renderRiskLevel(action.risk_level)}
                    </Space>
                    <Text type="secondary">{actionPresentation(action).description}</Text>
                    <Button type="primary" disabled={!action.enabled} onClick={() => openDrawer(action)}>核对并执行</Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </section>
      ) : null}
      <Typography.Title level={5}>全部治理动作</Typography.Title>
      <Table
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={actions}
        pagination={false}
        size="small"
        scroll={{ x: 1100 }}
      />
      <ActionRunDrawer
        action={selectedAction}
        visible={drawerVisible}
        initialInput={selectedAudit?.input}
        initialRequestID={selectedAudit?.request_id}
        onClose={() => setDrawerVisible(false)}
        onFinished={() => { if (selectedAction?.id === 'events.replay_pending') void loadPending() }}
      />
      <DeliveryResolutionDrawer
        review={resolutionReview}
        target={resolutionTarget}
        visible={resolutionVisible}
        onClose={() => setResolutionVisible(false)}
        onResolved={() => { void loadDeliveryReviews() }}
      />
    </>
  )
}
