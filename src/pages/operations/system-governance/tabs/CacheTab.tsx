import React, { useMemo } from 'react'
import { Empty, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { GovernanceCacheResponse } from '@/api/path/systemGovernance'
import type { ICacheGovernanceFamilyStatus } from '@/api/path/cacheGovernance'
import { renderBooleanAvailabilityTag, renderDegradedTag, renderTooltipText } from '../../shared/utils/formatters'

interface CacheTabProps {
  data: GovernanceCacheResponse | null
  loading?: boolean
}

export const CacheTab: React.FC<CacheTabProps> = ({ data, loading }) => {
  const columns = useMemo<ColumnsType<ICacheGovernanceFamilyStatus>>(
    () => [
      { title: 'Family', dataIndex: 'family', key: 'family', width: 140 },
      { title: 'Profile', dataIndex: 'profile', key: 'profile', width: 140 },
      { title: 'Namespace', dataIndex: 'namespace', key: 'namespace', ellipsis: true, render: renderTooltipText },
      {
        title: '可用',
        dataIndex: 'available',
        key: 'available',
        width: 90,
        render: renderBooleanAvailabilityTag
      },
      {
        title: '降级',
        dataIndex: 'degraded',
        key: 'degraded',
        width: 90,
        render: renderDegradedTag
      },
      { title: '模式', dataIndex: 'mode', key: 'mode', width: 120 },
      { title: '最近错误', dataIndex: 'last_error', key: 'last_error', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  return (
    <Table
      rowKey={(record) => `${record.family}:${record.namespace}`}
      columns={columns}
      dataSource={data?.families || []}
      loading={loading}
      pagination={false}
      size="small"
      scroll={{ x: 1100 }}
      locale={{ emptyText: <Empty description="暂无缓存族状态" /> }}
    />
  )
}
