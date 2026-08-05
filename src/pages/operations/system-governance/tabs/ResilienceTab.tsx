import React, { useMemo } from 'react'
import { Alert, Descriptions, Empty, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  GovernanceResilienceResponse,
  ResilienceBackpressureRow,
  ResilienceCapabilityRow,
  ResilienceQueueRow
} from '@/api/path/systemGovernance'
import type { IResilienceComponentStatus } from '@/api/path/resilienceGovernance'
import {
  formatDateTime,
  renderBooleanAvailabilityTag,
  renderDegradedTag,
  renderHealthTag,
  renderTooltipText
} from '../../shared/utils/formatters'
import { renderMetricEvidence, renderSeverityTag } from '../components/GovernanceEvidence'

const { Text } = Typography

interface ResilienceTabProps {
  data: GovernanceResilienceResponse | null
  loading?: boolean
  section?: 'queues' | 'dependencies' | 'capabilities'
}

const formatPercent = (value?: number) => typeof value === 'number' ? `${(value * 100).toFixed(1)}%` : '-'

const renderStatusCounts = (counts?: Record<string, number>) => {
  if (!counts || !Object.keys(counts).length) return '-'
  return Object.keys(counts)
    .sort()
    .map((key) => `${key}:${counts[key]}`)
    .join(' / ')
}

export const ResilienceTab: React.FC<ResilienceTabProps> = ({ data, loading, section = 'queues' }) => {
  const queueColumns = useMemo<ColumnsType<ResilienceQueueRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 150, render: renderTooltipText },
      { title: 'Queue', dataIndex: 'name', key: 'name', width: 180, render: renderTooltipText },
      { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 160, render: renderTooltipText },
      { title: 'Depth', dataIndex: 'depth', key: 'depth', width: 90 },
      { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 100 },
      { title: '利用率', dataIndex: 'utilization', key: 'utilization', width: 110, render: formatPercent },
      { title: '状态计数', dataIndex: 'status_counts', key: 'status_counts', width: 160, render: renderStatusCounts },
      { title: '生命周期', dataIndex: 'lifecycle_boundary', key: 'lifecycle_boundary', ellipsis: true, render: renderTooltipText },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100, render: renderSeverityTag },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 280, render: renderMetricEvidence }
    ],
    []
  )

  const backpressureColumns = useMemo<ColumnsType<ResilienceBackpressureRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 150, render: renderTooltipText },
      { title: 'Name', dataIndex: 'name', key: 'name', width: 150, render: renderTooltipText },
      { title: 'Dependency', dataIndex: 'dependency', key: 'dependency', width: 150, render: renderTooltipText },
      { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 140, render: renderTooltipText },
      { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 90, render: renderBooleanAvailabilityTag },
      { title: 'In Flight', dataIndex: 'in_flight', key: 'in_flight', width: 100 },
      { title: 'Max', dataIndex: 'max_inflight', key: 'max_inflight', width: 90 },
      { title: '利用率', dataIndex: 'utilization', key: 'utilization', width: 110, render: formatPercent },
      { title: '超时', dataIndex: 'timeout_millis', key: 'timeout_millis', width: 100, render: (value: number) => value ? `${value} ms` : '-' },
      { title: '降级', dataIndex: 'degraded', key: 'degraded', width: 90, render: renderDegradedTag },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100, render: renderSeverityTag },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 280, render: renderMetricEvidence }
    ],
    []
  )

  const capabilityColumns = useMemo<ColumnsType<ResilienceCapabilityRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 150, render: renderTooltipText },
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 170, render: renderTooltipText },
      { title: 'Name', dataIndex: 'name', key: 'name', width: 180, render: renderTooltipText },
      { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 160, render: renderTooltipText },
      { title: '配置', dataIndex: 'configured', key: 'configured', width: 90, render: renderBooleanAvailabilityTag },
      { title: '降级', dataIndex: 'degraded', key: 'degraded', width: 90, render: renderDegradedTag },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100, render: renderSeverityTag },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const componentColumns = useMemo<ColumnsType<IResilienceComponentStatus>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 180 },
      { title: 'Source', dataIndex: 'source', key: 'source', ellipsis: true, render: renderTooltipText },
      {
        title: '状态',
        key: 'health',
        width: 120,
        render: (_value, record) => renderHealthTag(record.degraded, record.configured)
      },
      {
        title: 'Generated At',
        key: 'generated_at',
        width: 180,
        render: (_value, record) => formatDateTime(record.snapshot?.generated_at)
      },
      { title: '错误', dataIndex: 'error', key: 'error', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={16}>
      <Alert
        type="info"
        showIcon
        message={section === 'queues' ? '先判断队列是否正在接近容量边界' : section === 'dependencies' ? '检查下游依赖是否正在限制吞吐' : '核对保护能力是否配置并正常工作'}
        description={section === 'queues'
          ? '利用率升高代表需要定位流量或下游瓶颈，不等于应立即扩大限流预算。'
          : section === 'dependencies'
            ? 'In Flight 接近上限表示并发预算正在生效；应结合超时和降级状态判断是否异常。'
            : '保护能力和组件快照用于确认限流、租约等运行时保护是否可用。'}
      />
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
        <Descriptions.Item label="组件">{data?.summary.component_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="不可用组件">{data?.summary.unavailable_component_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="未就绪组件">{data?.summary.not_ready_component_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="队列">{data?.summary.queue_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="队列告警">{data ? `${data.summary.critical_queue_count}/${data.summary.warning_queue_count}` : '-'}</Descriptions.Item>
        <Descriptions.Item label="最高队列利用率">{formatPercent(data?.summary.max_queue_utilization)}</Descriptions.Item>
        <Descriptions.Item label="依赖并发保护">{data?.summary.backpressure_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="最高并发利用率">{formatPercent(data?.summary.max_backpressure_utilization)}</Descriptions.Item>
        <Descriptions.Item label="能力降级">{data?.summary.degraded_capability_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(data?.generated_at)}</Descriptions.Item>
      </Descriptions>

      {section === 'queues' ? (
        <>
          <Text strong>队列承压</Text>
          <Table
            rowKey={(record) => `${record.component}:${record.name}`}
            columns={queueColumns}
            dataSource={data?.queue_rows || []}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 1700 }}
            locale={{ emptyText: <Empty description="暂无队列承压数据" /> }}
          />
        </>
      ) : null}

      {section === 'dependencies' ? (
        <>
          <Text strong>依赖并发保护</Text>
          <Table
            rowKey={(record) => `${record.component}:${record.name}:${record.dependency}`}
            columns={backpressureColumns}
            dataSource={data?.backpressure_rows || []}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 1800 }}
            locale={{ emptyText: <Empty description="暂无 backpressure 数据" /> }}
          />
        </>
      ) : null}

      {section === 'capabilities' ? (
        <>
          <Text strong>保护能力</Text>
          <Table
            rowKey={(record) => `${record.component}:${record.kind}:${record.name}`}
            columns={capabilityColumns}
            dataSource={data?.capability_rows || []}
            loading={loading}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            size="small"
            scroll={{ x: 1200 }}
            locale={{ emptyText: <Empty description="暂无保护能力数据" /> }}
          />
          <Text strong>组件状态</Text>
          <Table
            rowKey={(record) => record.component}
            columns={componentColumns}
            dataSource={data?.components || []}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 1000 }}
            locale={{ emptyText: <Empty description="暂无承压保护快照" /> }}
          />
        </>
      ) : null}
    </Space>
  )
}
