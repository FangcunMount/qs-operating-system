import React, { useMemo } from 'react'
import { Alert, Button, Descriptions, Empty, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getEventGovernanceLinks } from '@/api/path/eventGovernance'
import type { IEventRuntimeConsumer, IEventRuntimeEvent } from '@/api/path/eventGovernance'
import type { GovernanceEventsResponse } from '@/api/path/systemGovernance'
import {
  formatDateTime,
  renderBooleanAvailabilityTag,
  renderHealthTag,
  renderTooltipText
} from '../../shared/utils/formatters'

const { Text } = Typography

interface EventsTabProps {
  data: GovernanceEventsResponse | null
  loading?: boolean
  section?: 'drain' | 'runtime'
}

export const EventsTab: React.FC<EventsTabProps> = ({ data, loading, section = 'drain' }) => {
  const snapshot = data?.snapshot || data
  const links = useMemo(() => getEventGovernanceLinks(), [])
  const consumerRows = snapshot?.consumers || []
  const eventRows = snapshot?.events || []

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
      { title: '投递方式', dataIndex: 'delivery', key: 'delivery', width: 150, render: (value: string) => value === 'durable_outbox' ? '事务消息' : value },
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
        <Descriptions.Item label="消息模式">RocketMQ 事务消息</Descriptions.Item>
        <Descriptions.Item label="事件主题">{data?.catalog?.topic_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="事件契约">{data?.catalog?.event_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(data?.generated_at)}</Descriptions.Item>
      </Descriptions>
      <Alert type="info" showIcon message="分别检查事务确认、消费处理和业务回执"
        description="请在事务消息指标中查看确认缺口与业务回执等待情况，并结合 Worker 结算定位问题。采样不可用时不能判断为没有积压。" />
      {Object.keys(links).length > 0 ? (
        <Space wrap>
          {links.overview ? <Button type="link" href={links.overview} target="_blank" rel="noreferrer">发布概览</Button> : null}
          {links.outbox ? <Button type="link" href={links.outbox} target="_blank" rel="noreferrer">事务消息指标</Button> : null}
          {links.worker ? <Button type="link" href={links.worker} target="_blank" rel="noreferrer">Worker 结算</Button> : null}
        </Space>
      ) : null}

      {section === 'runtime' ? (
        <>
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
        </>
      ) : null}
    </Space>
  )
}
