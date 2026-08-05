import React, { useMemo, useState } from 'react'
import { Alert, Button, Descriptions, Empty, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  ActionDescriptor,
  CacheCapabilityPolicyView,
  CacheCapabilityWorkload,
  CacheFamilyRow,
  CacheHotsetItem,
  CacheHotsetView,
  CachePolicyView,
  CacheWarmupKind,
  GovernanceCacheResponse,
  MetricEvidence
} from '@/api/path/systemGovernance'
import { formatDateTime, renderBooleanAvailabilityTag, renderDegradedTag, renderTooltipText } from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'
import { MetricEvidenceList, renderMetricEvidence, renderSeverityTag } from '../components/GovernanceEvidence'

const { Text } = Typography

interface CacheTabProps {
  data: GovernanceCacheResponse | null
  loading?: boolean
  manualWarmupAction?: ActionDescriptor
  reloadPolicyAction?: ActionDescriptor
  onGovernanceActionFinished?: () => void
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

const renderPolicySwitch = (value?: string): React.ReactElement => {
  const color = value === 'enabled' ? 'green' : value === 'disabled' ? 'default' : 'blue'
  return <Tag color={color}>{value || 'inherit'}</Tag>
}

const renderPolicySummary = (policy?: CachePolicyView): React.ReactElement => (
  <Space size={4} wrap>
    <Tag>TTL {policy?.ttl || '-'}</Tag>
    <Tag>Negative TTL {policy?.negative_ttl || '-'}</Tag>
    {renderPolicySwitch(policy?.compress)}
    {renderPolicySwitch(policy?.singleflight)}
    {renderPolicySwitch(policy?.negative)}
  </Space>
)

const metricNumber = (value?: number | string): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const metricEvidenceItems = (workload?: CacheCapabilityWorkload): MetricEvidence[] =>
  [workload?.hit_rate, workload?.error_count, workload?.get_latency_p95].filter((item): item is MetricEvidence => Boolean(item))

const renderWorkloadSummary = (workload?: CacheCapabilityWorkload): React.ReactElement => {
  const hitRate = metricNumber(workload?.hit_rate?.value)
  const errors = metricNumber(workload?.error_count?.value)
  const latency = metricNumber(workload?.get_latency_p95?.value)
  const unavailable = metricEvidenceItems(workload).find((item) => !item.available)
  if (unavailable) {
    return <Text type="secondary">指标不可用：{unavailable.reason || 'Prometheus 未返回数据'}</Text>
  }
  if (hitRate === undefined && errors === undefined && latency === undefined) {
    return <Text type="secondary">暂无近窗口样本</Text>
  }
  return (
    <Space size={4} wrap>
      <Tag color="blue">Hit {hitRate === undefined ? '-' : `${(hitRate * 100).toFixed(1)}%`}</Tag>
      <Tag color={errors && errors > 0 ? 'red' : 'green'}>Errors {errors ?? '-'}</Tag>
      <Tag color="purple">Get p95 {latency === undefined ? '-' : `${(latency * 1000).toFixed(1)}ms`}</Tag>
    </Space>
  )
}

const renderWarmupResultTag = (value?: string): React.ReactElement => {
  const color = value === 'ok' ? 'green' : value === 'error' ? 'red' : 'orange'
  return <Tag color={color}>{value || '-'}</Tag>
}

const renderCapabilityExpandedRow = (
  record: CacheCapabilityPolicyView,
  workload?: CacheCapabilityWorkload
): React.ReactElement => (
  <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
    <Descriptions.Item label="Spec default">{renderPolicySummary(record.spec_default)}</Descriptions.Item>
    <Descriptions.Item label="Global default">{renderPolicySummary(record.global_default)}</Descriptions.Item>
    <Descriptions.Item label="Family default">{renderPolicySummary(record.family_default)}</Descriptions.Item>
    <Descriptions.Item label="Override">{renderPolicySummary(record.override)}</Descriptions.Item>
    <Descriptions.Item label="Metric evidence" span={4}>
      <MetricEvidenceList items={metricEvidenceItems(workload)} />
    </Descriptions.Item>
  </Descriptions>
)

export const CacheTab: React.FC<CacheTabProps> = ({
  data,
  loading,
  manualWarmupAction,
  reloadPolicyAction,
  onGovernanceActionFinished
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [initialInput, setInitialInput] = useState<Record<string, unknown> | undefined>()
  const [selectedAction, setSelectedAction] = useState<ActionDescriptor | null>(null)

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
    setSelectedAction(manualWarmupAction || null)
    setDrawerVisible(true)
  }

  const openReloadPolicyDrawer = () => {
    const version = data?.effective_registry?.snapshot_version
    if (!reloadPolicyAction || !version) {
      return
    }
    setInitialInput({ expected_version: version })
    setSelectedAction(reloadPolicyAction)
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
  const registry = data?.effective_registry
  const reloadStatus = registry?.reload
  const workloadByCapability = useMemo(
    () => new Map((data?.capability_rows || []).map((row) => [row.capability, row.workload])),
    [data?.capability_rows]
  )

  const capabilityColumns = useMemo<ColumnsType<CacheCapabilityPolicyView>>(
    () => [
      { title: 'Capability', dataIndex: 'capability', key: 'capability', width: 250, render: renderTooltipText },
      { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 120 },
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 130 },
      { title: 'Layer', dataIndex: 'layer', key: 'layer', width: 100 },
      { title: 'Family', dataIndex: 'family', key: 'family', width: 120 },
      { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 90, render: renderBooleanAvailabilityTag },
      { title: 'Effective policy', dataIndex: 'effective', key: 'effective', width: 420, render: renderPolicySummary },
      {
        title: '近窗口 workload',
        key: 'workload',
        width: 320,
        render: (_value, record) => renderWorkloadSummary(workloadByCapability.get(record.capability))
      },
      { title: 'Metric label', dataIndex: 'metric_label', key: 'metric_label', width: 150, render: renderTooltipText },
      { title: 'Source', dataIndex: 'source', key: 'source', ellipsis: true, render: renderTooltipText }
    ],
    [workloadByCapability]
  )

  const warmupRunColumns = useMemo<ColumnsType<NonNullable<GovernanceCacheResponse['warmup']>['latest_runs'][number]>>(
    () => [
      { title: 'Trigger', dataIndex: 'trigger', key: 'trigger', width: 120 },
      { title: 'Result', dataIndex: 'result', key: 'result', width: 100, render: renderWarmupResultTag },
      { title: 'Targets', dataIndex: 'target_count', key: 'target_count', width: 90 },
      { title: 'OK', dataIndex: 'ok_count', key: 'ok_count', width: 80 },
      { title: 'Skipped', dataIndex: 'skipped_count', key: 'skipped_count', width: 90 },
      { title: 'Error', dataIndex: 'error_count', key: 'error_count', width: 80 },
      { title: 'Finished at', dataIndex: 'finished_at', key: 'finished_at', width: 180, render: formatDateTime }
    ],
    []
  )

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="先判断缓存问题是否影响业务"
        description="先看组件连接状态和缓存族异常；命中率、延迟与预热建议用于解释性能，不应把指标缺失直接判断为缓存故障。"
      />
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
        <Descriptions.Item label="整体可用">{data?.summary?.ready ? '是' : '否'}</Descriptions.Item>
        <Descriptions.Item label="缓存族">{data?.summary?.family_total ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="降级">{data?.summary?.degraded_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="不可用">{data?.summary?.unavailable_count ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="自动预热">{data?.warmup?.enabled ? '启用' : '关闭'}</Descriptions.Item>
        <Descriptions.Item label="热点推荐">{data?.warmup?.hotset?.enable ? '启用' : '关闭'}</Descriptions.Item>
        <Descriptions.Item label="组件数">{componentEntries.length}</Descriptions.Item>
        <Descriptions.Item label="最近运行">{data?.warmup?.latest_runs?.[0]?.result || '-'}</Descriptions.Item>
        <Descriptions.Item label="策略版本">{registry?.snapshot_version ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="目录版本">{registry?.catalog_version || '-'}</Descriptions.Item>
      </Descriptions>

      <Text strong>组件连接状态</Text>
      <Space wrap style={{ display: 'flex', marginTop: 8, marginBottom: 16 }}>
        {componentEntries.length ? componentEntries.map(([name, component]) => (
          <Tag key={name} color={component.available ? 'green' : 'orange'}>
            {name}: {component.available ? '可用' : component.reason || '不可用'}
          </Tag>
        )) : <Text type="secondary">暂无组件快照</Text>}
      </Space>

      <Text strong>缓存族状态</Text>
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

      <Text strong style={{ display: 'block', marginTop: 16 }}>生效策略与近窗口表现</Text>
      {registry ? (
        <>
          {reloadStatus?.last_error ? (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message="最近一次策略重载失败"
              description={`${formatDateTime(reloadStatus.last_failure_at)}：${reloadStatus.last_error}`}
            />
          ) : null}
          <Descriptions size="small" style={{ marginTop: 12 }} column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="Snapshot">v{registry.snapshot_version}</Descriptions.Item>
            <Descriptions.Item label="Generated">{formatDateTime(registry.generated_at)}</Descriptions.Item>
            <Descriptions.Item label="Last success">{formatDateTime(reloadStatus?.last_success_at)}</Descriptions.Item>
            <Descriptions.Item label="Last attempt">{formatDateTime(reloadStatus?.last_attempt_at)}</Descriptions.Item>
          </Descriptions>
          <Space style={{ marginTop: 12 }}>
            <Button
              type="primary"
              disabled={!reloadPolicyAction?.enabled}
              onClick={openReloadPolicyDrawer}
            >
              重载策略
            </Button>
            <Text type="secondary">重载仅影响后续操作与新写入；当前版本会作为并发保护参数提交。</Text>
          </Space>
          <Table
            style={{ marginTop: 16 }}
            rowKey={(record) => record.capability}
            columns={capabilityColumns}
            dataSource={registry.capabilities}
            loading={loading}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            size="small"
            scroll={{ x: 1750 }}
            expandable={{
              expandedRowRender: (record) => renderCapabilityExpandedRow(
                record,
                workloadByCapability.get(record.capability)
              )
            }}
            locale={{ emptyText: <Empty description="暂无 capability policy" /> }}
          />
        </>
      ) : (
        <Alert
          style={{ marginTop: 12 }}
          type="info"
          showIcon
          message="当前快照未提供 Effective Registry"
          description="Redis family 健康与预热信息仍可用；策略版本和 reload 状态需要 apiserver 提供 effective_registry。"
        />
      )}

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

      <Text strong style={{ display: 'block', marginTop: 16 }}>最近预热运行</Text>
      <Table
        style={{ marginTop: 16 }}
        rowKey={(record) => `${record.trigger}:${record.started_at || record.finished_at || record.result}`}
        columns={warmupRunColumns}
        dataSource={data?.warmup?.latest_runs || []}
        loading={loading}
        pagination={false}
        size="small"
        scroll={{ x: 900 }}
        locale={{ emptyText: <Empty description="暂无预热运行记录" /> }}
      />

      <ActionRunDrawer
        action={selectedAction}
        visible={drawerVisible}
        initialInput={initialInput}
        onClose={() => {
          setDrawerVisible(false)
          setSelectedAction(null)
        }}
        onFinished={onGovernanceActionFinished}
      />
    </>
  )
}
