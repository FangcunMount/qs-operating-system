import React, { useMemo, useState } from 'react'
import { Alert, Button, Descriptions, Empty, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type {
  ActionDescriptor,
  CacheCapabilityPolicyView,
  CacheCapabilityWorkload,
  CacheComponentRegistryRow,
  CacheHotsetItem,
  CacheHotsetView,
  CacheL1BucketRuntime,
  CacheL1CapabilityRuntimeRow,
  CachePolicyView,
  CacheRegistryCapabilityRow,
  CacheTopology,
  CacheWarmupKind,
  GovernanceCacheResponse,
  MetricEvidence
} from '@/api/path/systemGovernance'
import type {
  CacheFamilyGroup,
  CacheFamilyInstanceRow
} from '@/api/path/systemGovernance/cacheRuntimeProjection'
import { projectCacheRuntime, projectFormalCacheRuntime } from '@/api/path/systemGovernance/cacheRuntimeProjection'
import {
  formatDateTime,
  formatExecutionDateTime,
  renderBooleanAvailabilityTag,
  renderDegradedTag,
  renderTooltipText
} from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'
import { MetricEvidenceList, renderMetricEvidence, renderSeverityTag } from '../components/GovernanceEvidence'

const { Text } = Typography

interface CacheTabProps {
  data: GovernanceCacheResponse | null
  loading?: boolean
  section?: 'runtime' | 'policies' | 'topology' | 'warmup'
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
  [workload?.hit_rate, workload?.samples, workload?.error_count, workload?.get_latency_p95].filter((item): item is MetricEvidence => Boolean(item))

const renderWorkloadSummary = (workload?: CacheCapabilityWorkload): React.ReactElement => {
  const hitRate = metricNumber(workload?.hit_rate?.value)
  const samples = metricNumber(workload?.samples?.value)
  const errors = metricNumber(workload?.error_count?.value)
  const latency = metricNumber(workload?.get_latency_p95?.value)
  const unavailable = metricEvidenceItems(workload).find((item) => !item.available)
  if (unavailable) {
    return <Text type="secondary">指标不可用：{unavailable.reason || 'Prometheus 未返回数据'}</Text>
  }
  if (hitRate === undefined && samples === undefined && errors === undefined && latency === undefined) {
    return <Text type="secondary">暂无近窗口样本</Text>
  }
  return (
    <Space size={4} wrap>
      <Tag color="blue">Hit {hitRate === undefined ? '-' : `${(hitRate * 100).toFixed(1)}%`}</Tag>
      <Tag>Samples {samples === 0 ? '暂无窗口样本' : samples ?? '-'}</Tag>
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

const renderHealthyInstanceCount = (_value: unknown, record: CacheFamilyGroup): React.ReactElement => (
  <Tag color={record.healthy_instance_count === record.discovered_instance_count ? 'green' : 'orange'}>
    {record.healthy_instance_count}/{record.discovered_instance_count}
  </Tag>
)

const renderDegradedInstanceCount = (value: number): React.ReactElement => (
  <Tag color={value > 0 ? 'orange' : 'green'}>{value}</Tag>
)

const renderUnavailableInstanceCount = (value: number): React.ReactElement => (
  <Tag color={value > 0 ? 'red' : 'green'}>{value}</Tag>
)

const renderInstanceID = (value: string, record: CacheFamilyInstanceRow): React.ReactElement => (
  record.instance_id_reported
    ? renderTooltipText(value)
    : <Tag color="orange">未上报实例 ID</Tag>
)

interface FamilyInstanceTableProps {
  record: CacheFamilyGroup
  columns: ColumnsType<CacheFamilyInstanceRow>
}

const FamilyInstanceTable: React.FC<FamilyInstanceTableProps> = ({ record, columns }) => (
  <Table
    rowKey={(instance) => instance.row_key}
    columns={columns}
    dataSource={record.instances}
    pagination={false}
    size="small"
    scroll={{ x: 1300 }}
  />
)

FamilyInstanceTable.displayName = 'FamilyInstanceTable'

const renderRegistryConsistency = (value: boolean): React.ReactElement => (
  <Tag color={value ? 'green' : 'orange'}>{value ? '一致' : '存在漂移'}</Tag>
)

const renderOptionalEnabled = (value?: boolean): React.ReactElement => (
  value === undefined ? <Tag color="orange">按 variants 查看</Tag> : renderBooleanAvailabilityTag(value)
)

const renderRegistryEffectivePolicy = (value?: CachePolicyView): React.ReactElement => renderPolicySummary(value)

const renderRegistryPolicySHA = (value?: string): React.ReactElement => value ? (
  <Tooltip title={value}><Text code>{value.slice(0, 12)}</Text></Tooltip>
) : <Text type="secondary">-</Text>

const renderInstanceIDs = (value: string[] = []): string => value.join(', ')

const renderRuntimeHealth = (value?: string): React.ReactElement => {
  const color = value === 'healthy' || value === 'running' || value === 'disabled_by_policy'
    ? 'green'
    : value === 'degraded' || value === 'reconnecting' ? 'orange' : 'default'
  return <Tag color={color}>{value || 'unknown'}</Tag>
}

const renderMetricValue = (metric?: MetricEvidence): React.ReactElement => {
  if (!metric?.available) return <Text type="secondary">暂无窗口样本</Text>
  if (metric.name.includes('samples') && metricNumber(metric.value) === 0) {
    return <Text type="secondary">暂无窗口样本</Text>
  }
  return <Text>{metric.value ?? '-'}</Text>
}

const renderBucketUsage = (buckets: CacheL1BucketRuntime[] = []): React.ReactElement => (
  <Space size={4} wrap>
    {buckets.map((bucket) => (
      <Tag key={bucket.bucket}>{bucket.bucket} {bucket.entries}/{bucket.max_entries}</Tag>
    ))}
  </Space>
)

const renderBucketEvictions = (buckets: CacheL1BucketRuntime[] = []): React.ReactElement => (
  <Space size={4} wrap>
    {buckets.map((bucket) => (
      <Tag key={bucket.bucket}>
        {bucket.bucket}: FIFO {bucket.fifo_evictions} / TTL {bucket.ttl_expirations} / Signal {bucket.signal_deletions}
      </Tag>
    ))}
  </Space>
)

interface TopologyNodeRow {
  row_key: string
  topology_group: string
  read_model: string
  status: string
  order: number
  node_type: 'cache' | 'source'
  component: string
  capability: string
  layer: string
  enabled?: boolean
  registry_consistent: boolean
  runtime_health: string
  policy_source?: string
  hit_rate?: MetricEvidence
  samples?: MetricEvidence
}

const flattenTopologies = (topologies: CacheTopology[] = []): TopologyNodeRow[] => topologies.flatMap((topology) => [
  ...topology.nodes.map((node) => ({
    row_key: `${topology.topology_group}:${node.id}`,
    topology_group: topology.topology_group, read_model: topology.read_model, status: topology.status,
    order: node.order, node_type: 'cache' as const, component: node.component, capability: node.capability,
    layer: node.layer, enabled: node.enabled, registry_consistent: node.registry_consistent,
    runtime_health: node.runtime_health, policy_source: node.policy_source,
    hit_rate: node.hit_rate, samples: node.samples
  })),
  {
    row_key: `${topology.topology_group}:${topology.source.id}`,
    topology_group: topology.topology_group, read_model: topology.read_model, status: topology.status,
    order: 100, node_type: 'source' as const, component: 'source', capability: topology.source.source_kind,
    layer: 'source', enabled: true, registry_consistent: true, runtime_health: 'logical_source'
  }
])

interface RegistryVariantsProps {
  record: CacheRegistryCapabilityRow
}

const RegistryVariants: React.FC<RegistryVariantsProps> = ({ record }) => (
  <Table
    rowKey={(variant) => [variant.policy_sha256, ...variant.instance_ids].join(':')}
    columns={[
      { title: 'Policy SHA', dataIndex: 'policy_sha256', key: 'policy_sha256', width: 160, render: renderRegistryPolicySHA },
      { title: 'Instances', dataIndex: 'instance_ids', key: 'instance_ids', width: 220, render: renderInstanceIDs },
      { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 100 },
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 100 },
      { title: 'Family', dataIndex: 'family', key: 'family', width: 120 },
      { title: 'Enabled', dataIndex: 'enabled', key: 'enabled', width: 90, render: renderBooleanAvailabilityTag },
      { title: 'Effective policy', dataIndex: 'effective_policy', key: 'effective_policy', render: renderPolicySummary }
    ]}
    dataSource={record.variants || []}
    pagination={false}
    size="small"
    scroll={{ x: 1100 }}
  />
)

RegistryVariants.displayName = 'RegistryVariants'

const renderRegistryVariants = (record: CacheRegistryCapabilityRow): React.ReactElement => (
  <RegistryVariants record={record} />
)

export const CacheTab: React.FC<CacheTabProps> = ({
  data,
  loading,
  section = 'runtime',
  manualWarmupAction,
  reloadPolicyAction,
  onGovernanceActionFinished
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [initialInput, setInitialInput] = useState<Record<string, unknown> | undefined>()
  const [selectedAction, setSelectedAction] = useState<ActionDescriptor | null>(null)
  const [showAllRuntime, setShowAllRuntime] = useState(false)
  const [showAllCapabilityKinds, setShowAllCapabilityKinds] = useState(false)

  const familyColumns = useMemo<ColumnsType<CacheFamilyGroup>>(
    () => [
      { title: 'Family', dataIndex: 'family', key: 'family', width: 140 },
      { title: 'Component', dataIndex: 'component', key: 'component', width: 140 },
      { title: 'Profile', dataIndex: 'profile', key: 'profile', width: 140 },
      { title: 'Namespace', dataIndex: 'namespace', key: 'namespace', ellipsis: true, render: renderTooltipText },
      {
        title: '健康实例',
        key: 'healthy_instances',
        width: 120,
        render: renderHealthyInstanceCount
      },
      {
        title: '降级实例',
        dataIndex: 'degraded_instance_count',
        key: 'degraded_instance_count',
        width: 90,
        render: renderDegradedInstanceCount
      },
      {
        title: '不可用实例',
        dataIndex: 'unavailable_instance_count',
        key: 'unavailable_instance_count',
        width: 110,
        render: renderUnavailableInstanceCount
      },
      { title: '严重度', dataIndex: 'severity', key: 'severity', width: 100, render: renderSeverityTag },
      { title: 'Cache operation errors', dataIndex: 'operation_errors', key: 'operation_errors', width: 190, render: renderMetricValue },
      { title: 'Cache operation P95', dataIndex: 'operation_p95', key: 'operation_p95', width: 170, render: renderMetricValue },
      { title: '最近错误', dataIndex: 'last_error', key: 'last_error', ellipsis: true, render: renderTooltipText },
      { title: '指标证据', dataIndex: 'metric_evidence', key: 'metric_evidence', width: 260, render: renderMetricEvidence }
    ],
    []
  )

  const instanceColumns = useMemo<ColumnsType<CacheFamilyInstanceRow>>(
    () => [
      {
        title: 'Instance ID',
        dataIndex: 'instance_id',
        key: 'instance_id',
        width: 180,
        render: renderInstanceID
      },
      { title: 'Generation', dataIndex: 'generation', key: 'generation', width: 160, render: renderTooltipText },
      { title: '可用', dataIndex: 'available', key: 'available', width: 80, render: renderBooleanAvailabilityTag },
      { title: '降级', dataIndex: 'degraded', key: 'degraded', width: 80, render: renderDegradedTag },
      { title: '模式', dataIndex: 'mode', key: 'mode', width: 120 },
      { title: '最近成功', dataIndex: 'last_success_at', key: 'last_success_at', width: 170, render: formatDateTime },
      { title: '最近失败', dataIndex: 'last_failure_at', key: 'last_failure_at', width: 170, render: formatDateTime },
      { title: '连续失败', dataIndex: 'consecutive_failures', key: 'consecutive_failures', width: 90 },
      { title: '最近错误', dataIndex: 'last_error', key: 'last_error', ellipsis: true, render: renderTooltipText }
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
  const runtimeProjection = useMemo(
    () => data?.runtime_view
      ? projectFormalCacheRuntime(data.runtime_view)
      : projectCacheRuntime(data?.components || {}, data?.family_rows || []),
    [data?.components, data?.family_rows, data?.runtime_view]
  )
  const visibleFamilyGroups = useMemo(
    () => showAllRuntime
      ? runtimeProjection.family_groups
      : runtimeProjection.family_groups.filter((row) => row.severity !== 'healthy'),
    [runtimeProjection.family_groups, showAllRuntime]
  )
  const visibleL1Runtime = useMemo(() => {
    const rows = data?.runtime_view?.l1_capability_runtime || []
    if (showAllRuntime) return rows
    return rows.filter((row) => {
      if (!row.enabled) return false
      if (!row.buckets.length) return true
      const watcher = row.signal_watcher
      return Boolean(watcher.last_error) || (watcher.configured && watcher.status !== 'running')
    })
  }, [data?.runtime_view?.l1_capability_runtime, showAllRuntime])
  const renderExpandedFamilyRow = (record: CacheFamilyGroup): React.ReactElement => (
    <FamilyInstanceTable record={record} columns={instanceColumns} />
  )
  const registry = data?.effective_registry
  const registryView = data?.registry_view
  const reloadStatus = registry?.reload
  const workloadByCapability = useMemo(
    () => new Map((data?.capability_rows || []).map((row) => [row.capability, row.workload])),
    [data?.capability_rows]
  )

  const registryCapabilityRows = useMemo(
    () => (registryView?.capability_rows || []).filter((row) =>
      showAllCapabilityKinds || row.kind === 'cache' || row.variants?.some((variant) => variant.kind === 'cache')
    ),
    [registryView?.capability_rows, showAllCapabilityKinds]
  )

  const registryCapabilityColumns = useMemo<ColumnsType<CacheRegistryCapabilityRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 160 },
      { title: 'Capability', dataIndex: 'capability', key: 'capability', width: 260, render: renderTooltipText },
      { title: 'Layer', dataIndex: 'layer', key: 'layer', width: 80 },
      { title: '一致性', dataIndex: 'consistent', key: 'consistent', width: 110, render: renderRegistryConsistency },
      { title: 'Owner', dataIndex: 'owner', key: 'owner', width: 110 },
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 120 },
      { title: 'Family', dataIndex: 'family', key: 'family', width: 120 },
      { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 120, render: renderOptionalEnabled },
      { title: 'Instances', dataIndex: 'instance_ids', key: 'instance_ids', width: 220, render: renderInstanceIDs },
      { title: 'Policy SHA', dataIndex: 'policy_sha256', key: 'policy_sha256', width: 160, render: renderRegistryPolicySHA },
      { title: 'Effective policy', dataIndex: 'effective_policy', key: 'effective_policy', width: 420, render: renderRegistryEffectivePolicy }
    ],
    []
  )

  const componentRegistryColumns = useMemo<ColumnsType<CacheComponentRegistryRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 160 },
      { title: 'Instance ID', dataIndex: 'instance_id', key: 'instance_id', width: 180, render: renderTooltipText },
      { title: 'Generation', dataIndex: 'generation', key: 'generation', width: 160, render: renderTooltipText },
      { title: '可用', dataIndex: 'available', key: 'available', width: 80, render: renderBooleanAvailabilityTag },
      { title: 'Catalog', dataIndex: 'catalog_version', key: 'catalog_version', width: 90 },
      { title: 'Schema', dataIndex: ['policy_source', 'schema_version'], key: 'schema_version', width: 90 },
      { title: 'Policy path', dataIndex: ['policy_source', 'path'], key: 'policy_path', width: 300, render: renderTooltipText },
      { title: 'Policy SHA', dataIndex: ['policy_source', 'policy_sha256'], key: 'policy_sha256', width: 160, render: renderRegistryPolicySHA },
      { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const l1RuntimeColumns = useMemo<ColumnsType<CacheL1CapabilityRuntimeRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 150 },
      { title: 'Instance ID', dataIndex: 'instance_id', key: 'instance_id', width: 180, render: renderTooltipText },
      { title: 'Capability', dataIndex: 'capability', key: 'capability', width: 260, render: renderTooltipText },
      { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80, render: renderBooleanAvailabilityTag },
      { title: '窗口 Hit rate', dataIndex: 'hit_rate', key: 'hit_rate', width: 150, render: renderMetricValue },
      { title: '窗口 Samples', dataIndex: 'samples', key: 'samples', width: 150, render: renderMetricValue },
      { title: '容量', dataIndex: 'buckets', key: 'capacity', width: 330, render: renderBucketUsage },
      { title: '淘汰', dataIndex: 'buckets', key: 'evictions', width: 520, render: renderBucketEvictions },
      { title: 'Signal watcher', dataIndex: ['signal_watcher', 'status'], key: 'signal_status', width: 150, render: renderRuntimeHealth },
      { title: 'Watcher error', dataIndex: ['signal_watcher', 'last_error'], key: 'signal_error', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const topologyRows = useMemo(() => flattenTopologies(data?.topology_view?.topologies), [data?.topology_view?.topologies])
  const topologyColumns = useMemo<ColumnsType<TopologyNodeRow>>(
    () => [
      { title: 'Topology', dataIndex: 'topology_group', key: 'topology_group', width: 170 },
      { title: '拓扑状态', dataIndex: 'status', key: 'status', width: 120, render: renderRuntimeHealth },
      { title: '顺序', dataIndex: 'order', key: 'order', width: 70 },
      { title: '节点', dataIndex: 'node_type', key: 'node_type', width: 90 },
      { title: 'Component', dataIndex: 'component', key: 'component', width: 160 },
      { title: 'Capability / Source', dataIndex: 'capability', key: 'capability', width: 280, render: renderTooltipText },
      { title: 'Layer', dataIndex: 'layer', key: 'layer', width: 80 },
      { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 80, render: renderOptionalEnabled },
      { title: 'Registry', dataIndex: 'registry_consistent', key: 'registry_consistent', width: 100, render: renderRegistryConsistency },
      { title: 'Runtime', dataIndex: 'runtime_health', key: 'runtime_health', width: 130, render: renderRuntimeHealth },
      { title: '窗口 Hit rate', dataIndex: 'hit_rate', key: 'hit_rate', width: 150, render: renderMetricValue },
      { title: '窗口 Samples', dataIndex: 'samples', key: 'samples', width: 150, render: renderMetricValue },
      { title: 'Policy source', dataIndex: 'policy_source', key: 'policy_source', width: 260, ellipsis: true, render: renderTooltipText },
      { title: 'Read model', dataIndex: 'read_model', key: 'read_model', ellipsis: true, render: renderTooltipText }
    ],
    []
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
        message={section === 'runtime'
          ? '先判断缓存问题是否影响业务'
          : section === 'policies'
            ? '这里解释当前真正生效的缓存策略'
            : section === 'topology' ? '沿固定逻辑路径查看 L1 → L2 → source' : '只对明确目标执行预热'}
        description={section === 'runtime'
          ? 'L1 capability 关注本地容量、命中与 Signal；L2 family 关注 Redis 连接、降级、错误与 cache operation P95。'
          : section === 'policies'
            ? '按 capability 查看合并后的生效策略和近窗口表现；重载操作使用当前版本进行并发保护。'
            : section === 'topology'
              ? '这是代码定义的逻辑请求路径和窗口聚合证据，不是单请求分布式 Trace。'
              : '热点推荐用于选择预热目标，预热结果用于核对执行质量；不要把预热当作组件故障修复。'}
      />
      {section === 'runtime' ? (
        <>
          <Descriptions size="small" column={5}>
            <Descriptions.Item label="整体可用">{runtimeProjection.summary.ready ? '是' : '否'}</Descriptions.Item>
            <Descriptions.Item label="健康组件">
              {runtimeProjection.summary.healthy_component_count}/{runtimeProjection.summary.component_total}
            </Descriptions.Item>
            <Descriptions.Item label="健康实例">
              {runtimeProjection.summary.healthy_instance_count}/{runtimeProjection.summary.discovered_instance_count}
            </Descriptions.Item>
            <Descriptions.Item label="缓存族">{runtimeProjection.summary.family_group_count}</Descriptions.Item>
            <Descriptions.Item label="异常缓存族">{runtimeProjection.summary.abnormal_family_group_count}</Descriptions.Item>
            <Descriptions.Item label="异常 L1 capability">{runtimeProjection.summary.abnormal_l1_capability_count}</Descriptions.Item>
          </Descriptions>
          <Text strong>组件连接状态</Text>
          <Space wrap style={{ display: 'flex', marginTop: 8, marginBottom: 16 }}>
            {componentEntries.length ? componentEntries.map(([name, component]) => (
              <Tag key={name} color={component.available && !component.partial ? 'green' : 'orange'}>
                {name}: {component.available ? (component.partial ? '部分可用' : '可用') : component.reason || '不可用'}
                {component.discovered_instance_count ? ` (${component.available_instance_count || 0}/${component.discovered_instance_count})` : ''}
              </Tag>
            )) : <Text type="secondary">暂无组件快照</Text>}
          </Space>
          <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>L1 capability runtime</Text>
            <Space>
              <Text type="secondary">运行状态默认仅看异常</Text>
              <Switch checked={showAllRuntime} onChange={setShowAllRuntime} checkedChildren="查看全部" unCheckedChildren="仅异常" />
            </Space>
          </Space>
          <Table
            style={{ marginTop: 16, marginBottom: 20 }}
            rowKey={(record) => [record.component, record.capability, record.instance_id].join(':')}
            columns={l1RuntimeColumns}
            dataSource={visibleL1Runtime}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 2100 }}
            locale={{ emptyText: <Empty description={showAllRuntime ? '暂无 L1 capability runtime（组件可能尚未上报新合同）' : '当前没有异常 L1 capability'} /> }}
          />
          <Text strong>L2 Redis family runtime</Text>
          <Table
            style={{ marginTop: 16 }}
            rowKey={(record) => record.row_key}
            columns={familyColumns}
            dataSource={visibleFamilyGroups}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 1500 }}
            expandable={{
              expandedRowRender: renderExpandedFamilyRow
            }}
            locale={{ emptyText: <Empty description={showAllRuntime ? '暂无缓存族状态' : '当前没有异常缓存族'} /> }}
          />
        </>
      ) : null}

      {section === 'topology' ? (
        <>
          <Alert
            type="info"
            showIcon
            message="固定拓扑首版"
            description="覆盖 questionnaire、published-model、assessment-detail、assessment-access；typology 的条件式多路径未被错误画成固定链路。"
          />
          <Table
            style={{ marginTop: 16 }}
            rowKey={(record) => record.row_key}
            columns={topologyColumns}
            dataSource={topologyRows}
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 1900 }}
            locale={{ emptyText: <Empty description="暂无拓扑数据；Registry 或 runtime 缺失时会局部降级而非阻断页面" /> }}
          />
        </>
      ) : null}

      {section === 'policies' ? (
        <>
          <Descriptions size="small" column={4}>
            <Descriptions.Item label="策略版本">{registry?.snapshot_version ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="目录版本">{registry?.catalog_version || '-'}</Descriptions.Item>
            <Descriptions.Item label="最近成功">{formatExecutionDateTime(reloadStatus?.last_success_at)}</Descriptions.Item>
            <Descriptions.Item label="最近尝试">{formatExecutionDateTime(reloadStatus?.last_attempt_at)}</Descriptions.Item>
            <Descriptions.Item label="Policy component">{registry?.policy_source?.component || '-'}</Descriptions.Item>
            <Descriptions.Item label="Schema version">{registry?.policy_source?.schema_version || '-'}</Descriptions.Item>
            <Descriptions.Item label="Policy path" span={2}>{renderTooltipText(registry?.policy_source?.path)}</Descriptions.Item>
            <Descriptions.Item label="Policy SHA256" span={4}>
              {registry?.policy_source?.policy_sha256 ? (
                <Tooltip title={registry.policy_source.policy_sha256}>
                  <Text code>{registry.policy_source.policy_sha256.slice(0, 16)}</Text>
                </Tooltip>
              ) : '-'}
            </Descriptions.Item>
          </Descriptions>
          <Text strong style={{ display: 'block', marginTop: 16 }}>跨组件 Registry</Text>
          {registryView?.registry_drift.length ? (
            <Alert
              style={{ marginTop: 12 }}
              type="warning"
              showIcon
              message={`检测到 ${registryView.registry_drift.length} 项 Registry 漂移`}
              description={registryView.registry_drift.map((item) => `${item.component}: ${item.message}`).join('；')}
            />
          ) : null}
          {registryView ? (
            <Table
              style={{ marginTop: 12 }}
              rowKey={(record) => [record.component, record.instance_id || 'unavailable'].join(':')}
              columns={componentRegistryColumns}
              dataSource={registryView.component_registries}
              loading={loading}
              pagination={false}
              size="small"
              scroll={{ x: 1400 }}
              locale={{ emptyText: <Empty description="暂无组件 Registry" /> }}
            />
          ) : null}
          <Space style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Text strong>生效策略与近窗口表现</Text>
            {registryView ? (
              <Space>
                <Text type="secondary">默认仅 cache</Text>
                <Switch
                  checked={showAllCapabilityKinds}
                  onChange={setShowAllCapabilityKinds}
                  checkedChildren="全部类型"
                  unCheckedChildren="仅 cache"
                />
              </Space>
            ) : null}
          </Space>
          {registry || registryView ? (
            <>
              {reloadStatus?.last_error ? (
                <Alert
                  style={{ marginTop: 12 }}
                  type="warning"
                  showIcon
                  message="最近一次策略重载失败"
                  description={`${formatExecutionDateTime(reloadStatus.last_failure_at)}：${reloadStatus.last_error}`}
                />
              ) : null}
              {registry ? <Space style={{ marginTop: 12 }}>
                <Button type="primary" disabled={!reloadPolicyAction?.enabled} onClick={openReloadPolicyDrawer}>重载策略</Button>
                <Text type="secondary">重载仅影响后续操作与新写入；当前版本会作为并发保护参数提交。</Text>
              </Space> : null}
              {registryView ? (
                <Table
                  style={{ marginTop: 16 }}
                  rowKey={(record) => [record.component, record.capability, record.layer].join(':')}
                  columns={registryCapabilityColumns}
                  dataSource={registryCapabilityRows}
                  loading={loading}
                  pagination={{ pageSize: 10, hideOnSinglePage: true }}
                  size="small"
                  scroll={{ x: 1900 }}
                  expandable={{ expandedRowRender: renderRegistryVariants, rowExpandable: (record) => !record.consistent }}
                  locale={{ emptyText: <Empty description="暂无跨组件 capability policy" /> }}
                />
              ) : registry ? (
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
              ) : null}
            </>
          ) : (
            <Alert
              style={{ marginTop: 12 }}
              type="info"
              showIcon
              message="当前快照未提供 Effective Registry"
              description="策略版本和 reload 状态需要 apiserver 提供 effective_registry。"
            />
          )}
        </>
      ) : null}

      {section === 'warmup' ? (
        <>
          <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="自动预热">{data?.warmup?.enabled ? '启用' : '关闭'}</Descriptions.Item>
            <Descriptions.Item label="热点推荐">{data?.warmup?.hotset?.enable ? '启用' : '关闭'}</Descriptions.Item>
            <Descriptions.Item label="最近运行">{data?.warmup?.latest_runs?.[0]?.result || '-'}</Descriptions.Item>
            <Descriptions.Item label="最近错误数">{data?.warmup?.latest_runs?.[0]?.error_count ?? '-'}</Descriptions.Item>
          </Descriptions>
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
        </>
      ) : null}

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
