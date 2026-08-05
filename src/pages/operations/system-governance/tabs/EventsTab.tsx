import React, { useMemo } from 'react'
import { Alert, Button, Descriptions, Empty, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getEventGovernanceLinks } from '@/api/path/eventGovernance'
import type { IEventRuntimeConsumer, IEventRuntimeEvent, IEventRuntimeProfile } from '@/api/path/eventGovernance'
import type { EventOutboxRow, EventTypeRow, GovernanceEventsResponse } from '@/api/path/systemGovernance'
import {
  formatDateTime,
  formatDurationSeconds,
  renderBooleanAvailabilityTag,
  renderHealthTag,
  renderTooltipText
} from '../../shared/utils/formatters'
import { renderMetricEvidence, renderSeverityTag } from '../components/GovernanceEvidence'

const { Text } = Typography

interface EventsTabProps {
  data: GovernanceEventsResponse | null
  loading?: boolean
}

export const EventsTab: React.FC<EventsTabProps> = ({ data, loading }) => {
  const snapshot = data?.snapshot || data
  const links = useMemo(() => getEventGovernanceLinks(), [])
  const profileRows = snapshot?.profiles || []
  const consumerRows = snapshot?.consumers || []
  const eventRows = snapshot?.events || []

  const outboxColumns = useMemo<ColumnsType<EventOutboxRow>>(
    () => [
      { title: '事件队列', dataIndex: 'name', key: 'name', width: 180, render: renderTooltipText },
      { title: '存储', dataIndex: 'store', key: 'store', width: 180, render: renderTooltipText },
      { title: '待处理', dataIndex: 'pending_count', key: 'pending_count', width: 100 },
      { title: '失败', dataIndex: 'failed_count', key: 'failed_count', width: 100 },
      { title: '发布中', dataIndex: 'publishing_count', key: 'publishing_count', width: 110 },
      {
        title: '最老 Pending',
        dataIndex: 'oldest_pending_age_seconds',
        key: 'oldest_pending_age_seconds',
        width: 130,
        render: (value: number) => formatDurationSeconds(value)
      },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 110, render: renderSeverityTag },
      { title: '读取器', dataIndex: 'degraded', key: 'degraded', width: 100, render: (value: boolean) => renderHealthTag(value) },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 260, render: renderMetricEvidence }
    ],
    []
  )

  const eventTypeColumns = useMemo<ColumnsType<EventTypeRow>>(
    () => [
      { title: '存储', dataIndex: 'store', key: 'store', width: 120, render: renderTooltipText },
      { title: '事件类型', dataIndex: 'event_type', key: 'event_type', width: 240, render: renderTooltipText },
      { title: '待处理', dataIndex: 'pending_count', key: 'pending_count', width: 100 },
      { title: '失败', dataIndex: 'failed_count', key: 'failed_count', width: 100 },
      {
        title: '最老年龄',
        dataIndex: 'oldest_age_seconds',
        key: 'oldest_age_seconds',
        width: 120,
        render: (value: number) => formatDurationSeconds(value)
      },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 110, render: renderSeverityTag },
      { title: '状态', dataIndex: 'degraded', key: 'degraded', width: 100, render: (value: boolean) => renderHealthTag(value) },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 280, render: renderMetricEvidence }
    ],
    []
  )

  const profileColumns = useMemo<ColumnsType<IEventRuntimeProfile>>(
    () => [
      { title: '运行配置', dataIndex: 'name', key: 'name', width: 220, render: renderTooltipText },
      { title: '事件数', dataIndex: 'event_count', key: 'event_count', width: 90 },
      {
        title: '即时处理事件',
        dataIndex: 'immediate_event_types',
        key: 'immediate_event_types',
        width: 320,
        render: (items: string[]) => items?.join(', ') || '-'
      },
      { title: '运行', dataIndex: 'running', key: 'running', width: 90, render: renderBooleanAvailabilityTag },
      { title: 'Relay', dataIndex: 'relay_enabled', key: 'relay_enabled', width: 90, render: renderBooleanAvailabilityTag },
      { title: 'Ready-index', dataIndex: 'reconciler_enabled', key: 'reconciler_enabled', width: 120, render: renderBooleanAvailabilityTag },
      { title: 'Immediate', dataIndex: 'immediate_enabled', key: 'immediate_enabled', width: 110, render: renderBooleanAvailabilityTag }
    ],
    []
  )

  const consumerColumns = useMemo<ColumnsType<IEventRuntimeConsumer>>(
    () => [
      { title: '消费任务', dataIndex: 'id', key: 'id', width: 260, render: renderTooltipText },
      { title: '事件类型', dataIndex: 'event_type', key: 'event_type', width: 220, render: renderTooltipText },
      { title: '运行位置', dataIndex: 'runtime', key: 'runtime', width: 130 },
      { title: '主题', dataIndex: 'topic', key: 'topic', width: 180, render: renderTooltipText },
      { title: '消费通道', dataIndex: 'channel', key: 'channel', width: 280, render: renderTooltipText },
      { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 90, render: renderBooleanAvailabilityTag },
      {
        title: '健康',
        key: 'healthy',
        width: 100,
        render: (_value, record) => renderHealthTag(!record.healthy, record.enabled)
      },
      { title: '结算', dataIndex: 'settlement', key: 'settlement', width: 170, render: renderTooltipText },
      { title: '最近错误', dataIndex: 'last_error', key: 'last_error', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const eventColumns = useMemo<ColumnsType<IEventRuntimeEvent>>(
    () => [
      { title: '事件类型', dataIndex: 'type', key: 'type', width: 240, render: renderTooltipText },
      { title: '负责模块', dataIndex: 'owner', key: 'owner', width: 180, render: renderTooltipText },
      { title: '投递方式', dataIndex: 'delivery', key: 'delivery', width: 150 },
      { title: '运行配置', dataIndex: 'profile', key: 'profile', width: 200, render: renderTooltipText },
      { title: '即时处理', dataIndex: 'immediate', key: 'immediate', width: 100, render: renderBooleanAvailabilityTag },
      { title: '优先级', dataIndex: 'priority', key: 'priority', width: 100, render: renderTooltipText },
      { title: '主处理器', dataIndex: 'handler', key: 'handler', width: 220, render: renderTooltipText },
      { title: '幂等保护', dataIndex: 'idempotency', key: 'idempotency', width: 300, render: renderTooltipText },
      { title: '失败结算', dataIndex: 'settlement', key: 'settlement', width: 180, render: renderTooltipText }
    ],
    []
  )

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
        <Descriptions.Item label="事件主题">{data?.catalog?.topic_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="事件数">{data?.catalog?.event_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="待处理">{data?.summary?.pending_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="失败">{data?.summary?.failed_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="最老等待">{formatDurationSeconds(data?.summary?.oldest_pending_age_seconds)}</Descriptions.Item>
        <Descriptions.Item label="异常事件类型">{data?.summary?.stale_event_type_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="读取器异常">{data?.summary?.reader_error_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(data?.generated_at)}</Descriptions.Item>
      </Descriptions>

      <Alert
        type="info"
        showIcon
        message="先判断是否真的发生事件阻塞"
        description="优先看待处理数、失败数和最老等待时间。三项均为零表示当前没有排水压力；只有出现积压时，再下钻到事件类型和消费任务定位责任链。"
      />

      {Object.keys(links).length > 0 ? (
        <Space wrap>
          {links.overview ? <Button type="link" href={links.overview} target="_blank" rel="noreferrer">发布概览</Button> : null}
          {links.outbox ? <Button type="link" href={links.outbox} target="_blank" rel="noreferrer">Outbox 指标</Button> : null}
          {links.worker ? <Button type="link" href={links.worker} target="_blank" rel="noreferrer">Worker 结算</Button> : null}
        </Space>
      ) : null}

      <Text strong>事件排队与失败（先看这里）</Text>
      <Table
        rowKey={(record) => `${record.store}:${record.name}`}
        columns={outboxColumns}
        dataSource={data?.outbox_rows || []}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1400 }}
        locale={{ emptyText: <Empty description="暂无 outbox 数据" /> }}
      />
      <Text strong>按事件类型定位堵点</Text>
      <Table
        rowKey={(record) => `${record.store}:${record.event_type}`}
        columns={eventTypeColumns}
        dataSource={data?.event_type_rows || []}
        loading={loading}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        size="small"
        scroll={{ x: 1500 }}
        locale={{ emptyText: <Empty description="暂无 event_type 维度数据" /> }}
      />

      <Text strong>运行配置</Text>
      <Table
        rowKey="name"
        columns={profileColumns}
        dataSource={profileRows}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1200 }}
        locale={{ emptyText: <Empty description="当前快照未提供 profile 运行时数据" /> }}
      />

      <Text strong>独立消费任务</Text>
      <Table
        rowKey="id"
        columns={consumerColumns}
        dataSource={consumerRows}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1800 }}
        locale={{ emptyText: <Empty description="暂无独立 consumer" /> }}
      />

      <Text strong>事件契约</Text>
      <Table
        rowKey="type"
        columns={eventColumns}
        dataSource={eventRows}
        loading={loading}
        pagination={{ pageSize: 12, hideOnSinglePage: true }}
        size="small"
        scroll={{ x: 1800 }}
        locale={{ emptyText: <Empty description="当前快照未提供事件契约" /> }}
      />
    </Space>
  )
}
