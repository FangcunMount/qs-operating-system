import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  getSystemGovernanceRetryCandidates,
  RetryCandidate
} from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { formatDateTime, renderTooltipText } from '../../shared/utils/formatters'

const { Text } = Typography

const KIND_LABELS: Record<string, string> = {
  evaluation: '评估任务',
  interpretation: '报告任务',
  outbox: 'Outbox 事件',
  transport_delivery: '传输死信',
  retry_hold: '暂停重试'
}

const DISPOSITION_LABELS: Record<string, string> = {
  automatic: '自动重试',
  manual_required: '需要人工处理',
  terminal: '终态'
}

const renderDisposition = (value: string): React.ReactElement => (
  <Tag color={value === 'manual_required' ? 'orange' : 'blue'}>
    {DISPOSITION_LABELS[value] || value}
  </Tag>
)

interface EventRetryTabProps {
  refreshKey?: number
  onOpenActions?: () => void
}

export const EventRetryTab: React.FC<EventRetryTabProps> = ({ refreshKey = 0, onOpenActions }) => {
  const [items, setItems] = useState<RetryCandidate[]>([])
  const [nextCursor, setNextCursor] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async (cursor?: string) => {
    setLoading(true)
    const [requestError, response] = await getSystemGovernanceRetryCandidates({
      ...(cursor ? { cursor } : {}),
      limit: 50
    })
    if (requestError || !response?.data) {
      setError(extractErrorMessage(requestError, '获取重试候选失败'))
      setLoading(false)
      return
    }
    setItems((current) => cursor ? [...current, ...(response.data.items || [])] : response.data.items || [])
    setNextCursor(response.data.next_cursor || '')
    setError('')
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const columns = useMemo<ColumnsType<RetryCandidate>>(
    () => [
      { title: '任务类型', dataIndex: 'kind', key: 'kind', width: 130, render: (value: string) => KIND_LABELS[value] || value },
      { title: '存储', dataIndex: 'store', key: 'store', width: 100 },
      { title: '资源标识', dataIndex: 'resource_id', key: 'resource_id', width: 220, render: renderTooltipText },
      { title: '尝试次数', dataIndex: 'attempt', key: 'attempt', width: 100 },
      {
        title: '处理方式',
        dataIndex: 'retry_disposition',
        key: 'retry_disposition',
        width: 150,
        render: renderDisposition
      },
      { title: '最近错误', dataIndex: 'last_error_kind', key: 'last_error_kind', width: 180, render: renderTooltipText },
      { title: '下次尝试', dataIndex: 'next_attempt_at', key: 'next_attempt_at', width: 180, render: formatDateTime },
      { title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180, render: formatDateTime }
    ],
    []
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="这里只列出有界的重试候选"
        description="候选记录不等于可以直接重试。请核对处理方式、尝试次数和最近错误，再进入操作中心执行受控动作。"
        action={onOpenActions ? <Button onClick={onOpenActions}>前往操作中心</Button> : undefined}
      />
      {error ? <Alert type="error" showIcon message="重试候选获取失败" description={error} /> : null}
      <Table
        rowKey={(record) => `${record.kind}:${record.store}:${record.resource_id}:${record.attempt}`}
        columns={columns}
        dataSource={items}
        loading={loading && !items.length}
        pagination={false}
        size="small"
        scroll={{ x: 1250 }}
        locale={{ emptyText: <Empty description="当前没有需要人工处理的重试候选" /> }}
      />
      <div className="system-governance-load-more">
        {nextCursor ? (
          <Button loading={loading} onClick={() => void load(nextCursor)}>加载更多</Button>
        ) : items.length ? <Text type="secondary">已加载全部候选</Text> : null}
      </div>
    </Space>
  )
}
