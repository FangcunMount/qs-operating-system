import React, { useMemo } from 'react'
import { Descriptions, Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { EventOutboxRow, EventTypeRow, GovernanceEventsResponse, MetricEvidence } from '@/api/path/systemGovernance'
import { formatDateTime, formatDurationSeconds, renderHealthTag, renderTooltipText } from '../../shared/utils/formatters'

const { Text } = Typography

interface EventsTabProps {
  data: GovernanceEventsResponse | null
  loading?: boolean
}

const severityColor = (severity?: string) => {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'orange'
  if (severity === 'healthy') return 'green'
  return 'default'
}

const renderSeverity = (severity?: string) => <Tag color={severityColor(severity)}>{severity || '-'}</Tag>

const renderMetricEvidence = (items?: MetricEvidence[]) => {
  if (!items?.length) return '-'
  return (
    <Space direction="vertical" size={0}>
      {items.map((item) => (
        <Text key={item.name} type={item.available ? undefined : 'secondary'}>
          {item.name}: {item.available ? `${item.value ?? '-'}${item.unit ? ` ${item.unit}` : ''}` : item.reason || '不可用'}
        </Text>
      ))}
    </Space>
  )
}

export const EventsTab: React.FC<EventsTabProps> = ({ data, loading }) => {
  const outboxColumns = useMemo<ColumnsType<EventOutboxRow>>(
    () => [
      { title: 'Outbox', dataIndex: 'name', key: 'name', width: 180, render: renderTooltipText },
      { title: 'Store', dataIndex: 'store', key: 'store', width: 180, render: renderTooltipText },
      { title: 'Pending', dataIndex: 'pending_count', key: 'pending_count', width: 100 },
      { title: 'Failed', dataIndex: 'failed_count', key: 'failed_count', width: 100 },
      { title: 'Publishing', dataIndex: 'publishing_count', key: 'publishing_count', width: 110 },
      {
        title: '最老 Pending',
        dataIndex: 'oldest_pending_age_seconds',
        key: 'oldest_pending_age_seconds',
        width: 130,
        render: (value: number) => formatDurationSeconds(value)
      },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 110, render: renderSeverity },
      { title: 'Reader', dataIndex: 'degraded', key: 'degraded', width: 100, render: (value: boolean) => renderHealthTag(value) },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 260, render: renderMetricEvidence }
    ],
    []
  )

  const eventTypeColumns = useMemo<ColumnsType<EventTypeRow>>(
    () => [
      { title: 'Store', dataIndex: 'store', key: 'store', width: 120, render: renderTooltipText },
      { title: 'Event Type', dataIndex: 'event_type', key: 'event_type', width: 240, render: renderTooltipText },
      { title: 'Pending', dataIndex: 'pending_count', key: 'pending_count', width: 100 },
      { title: 'Failed', dataIndex: 'failed_count', key: 'failed_count', width: 100 },
      {
        title: '最老年龄',
        dataIndex: 'oldest_age_seconds',
        key: 'oldest_age_seconds',
        width: 120,
        render: (value: number) => formatDurationSeconds(value)
      },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 110, render: renderSeverity },
      { title: '状态', dataIndex: 'degraded', key: 'degraded', width: 100, render: (value: boolean) => renderHealthTag(value) },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 280, render: renderMetricEvidence }
    ],
    []
  )

  return (
    <>
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
        <Descriptions.Item label="Topic 数">{data?.catalog?.topic_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="事件数">{data?.catalog?.event_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Pending">{data?.summary?.pending_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Failed">{data?.summary?.failed_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="最老 Pending">{formatDurationSeconds(data?.summary?.oldest_pending_age_seconds)}</Descriptions.Item>
        <Descriptions.Item label="Event Type 堵点">{data?.summary?.stale_event_type_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Reader 异常">{data?.summary?.reader_error_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(data?.generated_at)}</Descriptions.Item>
      </Descriptions>
      <Text strong>Outbox 排水</Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => `${record.store}:${record.name}`}
        columns={outboxColumns}
        dataSource={data?.outbox_rows || []}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1400 }}
        locale={{ emptyText: <Empty description="暂无 outbox 数据" /> }}
      />
      <Text strong style={{ display: 'block', marginTop: 16 }}>Event Type 堵点</Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => `${record.store}:${record.event_type}`}
        columns={eventTypeColumns}
        dataSource={data?.event_type_rows || []}
        loading={loading}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        size="small"
        scroll={{ x: 1500 }}
        locale={{ emptyText: <Empty description="暂无 event_type 维度数据" /> }}
      />
    </>
  )
}
