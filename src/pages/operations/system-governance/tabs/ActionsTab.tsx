import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Row, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getSystemGovernancePendingReplayAudits } from '@/api/path/systemGovernance'
import type { ActionDescriptor, PendingReplayAudit, Signal } from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { formatDateTime, renderActionStatusTags } from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'
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

export const ActionsTab: React.FC<ActionsTabProps> = ({ actions, signals = [] }) => {
  const [selectedAction, setSelectedAction] = useState<ActionDescriptor | null>(null)
  const [selectedAudit, setSelectedAudit] = useState<PendingReplayAudit | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [pendingAudits, setPendingAudits] = useState<PendingReplayAudit[]>([])
  const [pendingCursor, setPendingCursor] = useState('')
  const [pendingLoading, setPendingLoading] = useState(false)
  const [pendingError, setPendingError] = useState('')
  const replayAction = actions.find((action) => action.id === 'events.replay_pending')

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
    </>
  )
}
