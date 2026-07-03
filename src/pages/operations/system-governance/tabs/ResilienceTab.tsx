import React, { useMemo } from 'react'
import { Empty, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { GovernanceResilienceResponse } from '@/api/path/systemGovernance'
import type { IResilienceComponentStatus } from '@/api/path/resilienceGovernance'
import { formatDateTime, renderHealthTag, renderTooltipText } from '../../shared/utils/formatters'

interface ResilienceTabProps {
  data: GovernanceResilienceResponse | null
  loading?: boolean
}

export const ResilienceTab: React.FC<ResilienceTabProps> = ({ data, loading }) => {
  const columns = useMemo<ColumnsType<IResilienceComponentStatus>>(
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
      {(data?.metric_evidence || []).map((metric) => (
        <Tag key={metric.name} color={metric.available ? 'blue' : 'default'}>
          {metric.name}: {metric.available ? `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}` : metric.reason || '不可用'}
        </Tag>
      ))}
      <Table
        rowKey={(record) => record.component}
        columns={columns}
        dataSource={data?.components || []}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1000 }}
        locale={{ emptyText: <Empty description="暂无承压保护快照" /> }}
      />
    </Space>
  )
}
