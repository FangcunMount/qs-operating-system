import React, { useMemo, useState } from 'react'
import { Button, Descriptions, Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  ActionDescriptor,
  CacheFamilyRow,
  CacheHotsetItem,
  CacheHotsetView,
  CacheWarmupKind,
  GovernanceCacheResponse,
  MetricEvidence
} from '@/api/path/systemGovernance'
import { renderBooleanAvailabilityTag, renderDegradedTag, renderTooltipText } from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'
import { renderMetricEvidence, renderSeverityTag } from '../components/GovernanceEvidence'

const { Text } = Typography

interface CacheTabProps {
  data: GovernanceCacheResponse | null
  loading?: boolean
  manualWarmupAction?: ActionDescriptor
}

interface HotsetRecommendation extends CacheHotsetItem {
  row_key: string
  available: boolean
  degraded: boolean
  message?: string
  metric_evidence?: MetricEvidence[]
}

const flattenHotsets = (hotsets: CacheHotsetView[] = []): HotsetRecommendation[] =>
  hotsets.flatMap((hotset) => {
    if (!hotset.items.length) {
      return [{
        row_key: `${hotset.kind || 'unknown'}:empty`,
        family: hotset.family || '',
        kind: hotset.kind || '',
        scope: '',
        score: 0,
        available: hotset.available,
        degraded: hotset.degraded,
        message: hotset.message,
        metric_evidence: hotset.metric_evidence
      }]
    }
    return hotset.items.map((item) => ({
      ...item,
      row_key: `${item.kind}:${item.scope}`,
      available: hotset.available,
      degraded: hotset.degraded,
      message: hotset.message,
      metric_evidence: hotset.metric_evidence
    }))
  })

export const CacheTab: React.FC<CacheTabProps> = ({ data, loading, manualWarmupAction }) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [initialInput, setInitialInput] = useState<Record<string, unknown> | undefined>()

  const familyColumns = useMemo<ColumnsType<CacheFamilyRow>>(
    () => [
      { title: 'Family', dataIndex: 'family', key: 'family', width: 140 },
      { title: 'Component', dataIndex: 'component', key: 'component', width: 140 },
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
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100, render: renderSeverityTag },
      { title: '最近错误', dataIndex: 'last_error', key: 'last_error', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 260, render: renderMetricEvidence }
    ],
    []
  )

  const warmupKindColumns = useMemo<ColumnsType<CacheWarmupKind>>(
    () => [
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 220, render: renderTooltipText },
      { title: 'Family', dataIndex: 'family', key: 'family', width: 140 },
      { title: 'Scope 示例', dataIndex: 'scope_example', key: 'scope_example', ellipsis: true, render: renderTooltipText },
      {
        title: '手工预热',
        dataIndex: 'supports_manual_warmup',
        key: 'supports_manual_warmup',
        width: 110,
        render: renderBooleanAvailabilityTag
      }
    ],
    []
  )

  const openWarmupDrawer = (target: HotsetRecommendation) => {
    if (!target.kind || !target.scope) {
      return
    }
    setInitialInput({ targets: [{ kind: target.kind, scope: target.scope }] })
    setDrawerVisible(true)
  }

  const renderHotsetAction = (_value: unknown, record: HotsetRecommendation) => React.createElement(
    Button,
    {
      type: 'link',
      disabled: !manualWarmupAction?.enabled || !record.kind || !record.scope,
      onClick: () => openWarmupDrawer(record)
    },
    '预热'
  )

  const hotsetColumns: ColumnsType<HotsetRecommendation> = [
    { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 220, render: renderTooltipText },
    { title: 'Family', dataIndex: 'family', key: 'family', width: 140 },
    { title: 'Scope', dataIndex: 'scope', key: 'scope', ellipsis: true, render: renderTooltipText },
    { title: 'Score', dataIndex: 'score', key: 'score', width: 100 },
    { title: '可用', dataIndex: 'available', key: 'available', width: 90, render: renderBooleanAvailabilityTag },
    { title: '降级', dataIndex: 'degraded', key: 'degraded', width: 90, render: renderDegradedTag },
    { title: '原因', dataIndex: 'message', key: 'message', ellipsis: true, render: renderTooltipText },
    { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 240, render: renderMetricEvidence },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: renderHotsetAction
    }
  ]

  const hotsetRows = useMemo(() => flattenHotsets(data?.hotsets || []), [data?.hotsets])
  const componentEntries = Object.entries(data?.components || {})

  return (
    <>
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
        <Descriptions.Item label="Ready">{data?.summary?.ready ? '是' : '否'}</Descriptions.Item>
        <Descriptions.Item label="Family">{data?.summary?.family_total ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Degraded">{data?.summary?.degraded_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Unavailable">{data?.summary?.unavailable_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="Warmup">{data?.warmup?.enabled ? '启用' : '关闭'}</Descriptions.Item>
        <Descriptions.Item label="Hotset">{data?.warmup?.hotset?.enable ? '启用' : '关闭'}</Descriptions.Item>
        <Descriptions.Item label="组件数">{componentEntries.length}</Descriptions.Item>
        <Descriptions.Item label="最近运行">{data?.warmup?.latest_runs?.[0]?.result || '-'}</Descriptions.Item>
      </Descriptions>

      <Text strong>组件状态</Text>
      <Space wrap style={{ display: 'flex', marginTop: 8, marginBottom: 16 }}>
        {componentEntries.length ? componentEntries.map(([name, component]) => (
          <Tag key={name} color={component.available ? 'green' : 'orange'}>
            {name}: {component.available ? '可用' : component.reason || '不可用'}
          </Tag>
        )) : <Text type="secondary">暂无组件快照</Text>}
      </Space>

      <Text strong>缓存族健康</Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => `${record.component}:${record.family}:${record.namespace}`}
        columns={familyColumns}
        dataSource={data?.family_rows || []}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 1500 }}
        locale={{ emptyText: <Empty description="暂无缓存族状态" /> }}
      />

      <Text strong style={{ display: 'block', marginTop: 16 }}>可治理预热类型</Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => record.kind}
        columns={warmupKindColumns}
        dataSource={data?.warmup_kinds || []}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty description="暂无预热类型" /> }}
      />

      <Text strong style={{ display: 'block', marginTop: 16 }}>推荐预热目标</Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => record.row_key}
        columns={hotsetColumns}
        dataSource={hotsetRows}
        loading={loading}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        size="small"
        scroll={{ x: 1500 }}
        locale={{ emptyText: <Empty description="暂无 hotset 推荐目标" /> }}
      />

      <ActionRunDrawer
        action={manualWarmupAction || null}
        visible={drawerVisible}
        initialInput={initialInput}
        onClose={() => setDrawerVisible(false)}
      />
    </>
  )
}
