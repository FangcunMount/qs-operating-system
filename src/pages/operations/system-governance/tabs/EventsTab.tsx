import React, { useMemo } from 'react'
import { Descriptions, Empty, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { GovernanceEventsResponse } from '@/api/path/systemGovernance'
import { formatDateTime, formatDurationSeconds, renderHealthTag, renderTooltipText } from '../../shared/utils/formatters'

interface EventsTabProps {
  data: GovernanceEventsResponse | null
  loading?: boolean
}

export const EventsTab: React.FC<EventsTabProps> = ({ data, loading }) => {
  const outboxColumns = useMemo<ColumnsType<NonNullable<GovernanceEventsResponse['outboxes']>[number]>>(
    () => [
      { title: 'Outbox', dataIndex: 'name', key: 'name', width: 180, render: renderTooltipText },
      { title: 'Store', dataIndex: 'store', key: 'store', width: 180, render: renderTooltipText },
      { title: '状态', dataIndex: 'degraded', key: 'degraded', width: 120, render: (value: boolean) => renderHealthTag(value) },
      { title: '错误', dataIndex: 'error', key: 'error', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const eventTypeColumns = useMemo<ColumnsType<NonNullable<GovernanceEventsResponse['event_types']>[number]>>(
    () => [
      { title: 'Event Type', dataIndex: 'event_type', key: 'event_type', width: 220 },
      { title: 'Pending', dataIndex: 'pending_count', key: 'pending_count', width: 100 },
      { title: 'Failed', dataIndex: 'failed_count', key: 'failed_count', width: 100 },
      {
        title: '最老年龄',
        dataIndex: 'oldest_age_seconds',
        key: 'oldest_age_seconds',
        width: 120,
        render: (value: number) => formatDurationSeconds(value)
      },
      { title: '状态', dataIndex: 'degraded', key: 'degraded', width: 120, render: (value: boolean) => renderHealthTag(value) }
    ],
    []
  )

  return (
    <>
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
        <Descriptions.Item label="Topic 数">{data?.catalog?.topic_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="事件数">{data?.catalog?.event_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Best effort">{data?.catalog?.best_effort_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(data?.generated_at)}</Descriptions.Item>
      </Descriptions>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => record.name}
        columns={outboxColumns}
        dataSource={data?.outboxes || []}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: <Empty description="暂无 outbox 数据" /> }}
      />
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => record.event_type}
        columns={eventTypeColumns}
        dataSource={data?.event_types || []}
        loading={loading}
        pagination={false}
        size="small"
        locale={{ emptyText: <Empty description="暂无 event_type 维度数据" /> }}
      />
    </>
  )
}
