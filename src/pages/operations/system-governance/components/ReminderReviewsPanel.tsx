import React, { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getSystemGovernanceReminderReviews } from '@/api/path/systemGovernance'
import type { ReminderReview } from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { formatDateTime } from '../../shared/utils/formatters'

const { Text } = Typography

function renderNumber(value: number) { return <Text code copyable>#{value}</Text> }
function renderIdentity(value: string) { return <Text code copyable>{value}</Text> }
function renderReminderState(value: ReminderReview['state']) {
  return <Tag color="orange">{value === 'sending' ? '调用中断，结果未知' : '需人工核对'}</Tag>
}
function renderOptionalTime(value?: string) { return value ? formatDateTime(value) : '—' }
function renderResolutionCode(value?: string) { return value || '—' }

const columns: ColumnsType<ReminderReview> = [
  { title: '账本编号', dataIndex: 'delivery_id', key: 'delivery_id', width: 120, render: renderNumber },
  { title: '任务编号', dataIndex: 'task_id', key: 'task_id', width: 210, render: renderIdentity },
  { title: '开放事件', dataIndex: 'opening_event_id', key: 'opening_event_id', width: 240, render: renderIdentity },
  { title: '受试者用户', dataIndex: 'user_id', key: 'user_id', width: 170, render: renderIdentity },
  { title: '状态', dataIndex: 'state', key: 'state', width: 150, render: renderReminderState },
  { title: '调用开始', dataIndex: 'external_call_started_at', key: 'external_call_started_at', width: 180, render: renderOptionalTime },
  { title: '线索', dataIndex: 'resolution_code', key: 'resolution_code', width: 160, render: renderResolutionCode },
  { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180, render: formatDateTime }
]

export const ReminderReviewsPanel: React.FC = () => {
  const [items, setItems] = useState<ReminderReview[]>([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (next?: string) => {
    setLoading(true)
    const [requestError, response] = await getSystemGovernanceReminderReviews({
      ...(next ? { cursor: next } : {}), limit: 50
    })
    if (requestError || !response?.data) {
      setError(extractErrorMessage(requestError, '获取提醒待核对记录失败'))
      setLoading(false)
      return
    }
    setItems((current) => next ? [...current, ...(response.data.items || [])] : response.data.items || [])
    setCursor(response.data.next_cursor || '')
    setError('')
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <section className="system-governance-reminder-reviews">
      <Typography.Title level={5}>任务开放提醒待核对</Typography.Title>
      <Alert
        type="warning"
        showIcon
        message="发送结果未知，先核对平台记录"
        description="调用中断或超时不代表微信没有接受提醒。请用任务、开放事件和账本编号核对；本页不提供补发。"
        style={{ marginBottom: 12 }}
      />
      {error ? <Alert type="error" message={error} style={{ marginBottom: 12 }} /> : null}
      <Table
        rowKey="delivery_id"
        columns={columns}
        dataSource={items}
        loading={loading && !items.length}
        pagination={false}
        size="small"
        scroll={{ x: 1250 }}
        locale={{ emptyText: '当前没有待核对的任务开放提醒' }}
      />
      <Space style={{ marginTop: 8 }}>
        <Button loading={loading} onClick={() => void load()}>刷新核对列表</Button>
        {cursor ? <Button loading={loading} onClick={() => void load(cursor)}>加载更多</Button> : null}
      </Space>
    </section>
  )
}
