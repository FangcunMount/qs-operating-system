import type { GovernanceMetricsMeta, MetricEvidence, RawSystemGovernanceSignal, Signal, SignalSeverity } from './types.shared'

export interface CacheGovernanceSummary {
  family_total: number
  available_count: number
  degraded_count: number
  unavailable_count: number
  ready: boolean
}

export interface ICacheGovernanceFamilyStatus {
  component: string
  instance_id?: string
  family: string
  profile: string
  namespace: string
  allow_warmup: boolean
  configured: boolean
  available: boolean
  degraded: boolean
  mode: string
  last_error?: string
  last_success_at?: string
  last_failure_at?: string
  consecutive_failures: number
  updated_at?: string
}

export interface CacheGovernanceWarmupRun {
  trigger: string
  started_at?: string
  finished_at?: string
  result: string
  target_count: number
  ok_count: number
  error_count: number
  skipped_count: number
}

export interface CacheGovernanceWarmupConfig {
  enabled: boolean
  startup: { static: boolean; query: boolean }
  hotset: { enable: boolean; top_n: number; max_items_per_kind: number }
  latest_runs: CacheGovernanceWarmupRun[]
}

export interface ICacheGovernanceStatusResponse {
  generated_at?: string
  component?: string
  summary: CacheGovernanceSummary
  families: ICacheGovernanceFamilyStatus[]
  warmup: CacheGovernanceWarmupConfig
}

export interface CacheRuntimeSnapshot {
  generated_at?: string
  component?: string
  instance_id?: string
  generation?: string
  summary: ICacheGovernanceStatusResponse['summary']
  families: ICacheGovernanceFamilyStatus[]
  warmup?: ICacheGovernanceStatusResponse['warmup']
  effective_registry?: CacheEffectiveRegistrySnapshot
}

export interface CachePolicyView {
  ttl: string
  negative_ttl: string
  ttl_jitter_ratio: number
  compress: 'inherit' | 'enabled' | 'disabled' | string
  singleflight: 'inherit' | 'enabled' | 'disabled' | string
  negative: 'inherit' | 'enabled' | 'disabled' | string
}

export interface CacheCapabilityPolicyView {
  capability: string
  owner: string
  kind: string
  layer: string
  family: string
  enabled: boolean
  spec_default: CachePolicyView
  global_default: CachePolicyView
  family_default: CachePolicyView
  override: CachePolicyView
  effective: CachePolicyView
  source: string
  metric_label: string
  topology_group?: string
  topology_order?: number
  read_model?: string
}

export interface CacheCapabilityWorkload {
  hit_rate?: MetricEvidence
  samples?: MetricEvidence
  error_count?: MetricEvidence
  get_latency_p95?: MetricEvidence
}

export interface CacheCapabilityRow {
  capability: string
  family: string
  metric_label: string
  workload: CacheCapabilityWorkload
}

export interface CachePolicyReloadStatus {
  last_attempt_at?: string
  last_success_at?: string
  last_failure_at?: string
  last_error?: string
}

export interface CachePolicySource {
  component: string
  schema_version: string
  path: string
  policy_sha256: string
}

export interface CacheEffectiveRegistrySnapshot {
  snapshot_version: number
  catalog_version: string
  generated_at?: string
  capabilities: CacheCapabilityPolicyView[]
  reload: CachePolicyReloadStatus
  policy_source?: CachePolicySource
}

export interface CacheStatusSnapshot extends ICacheGovernanceStatusResponse {
  effective_registry?: CacheEffectiveRegistrySnapshot
}

export interface CacheComponent {
  available: boolean
  reason?: string
  snapshot?: CacheRuntimeSnapshot
  instances?: Record<string, CacheRuntimeSnapshot>
  discovered_instance_count?: number
  available_instance_count?: number
  partial?: boolean
  target_errors?: Record<string, string>
}

export interface CacheFamilyRow extends ICacheGovernanceFamilyStatus {
  generation?: string
  severity: SignalSeverity | string
  reason?: string
  metric_evidence?: MetricEvidence[]
}

export interface CacheComponentRegistryRow {
  component: string
  instance_id?: string
  generation?: string
  available: boolean
  reason?: string
  snapshot_version?: number
  catalog_version?: string
  policy_source?: CachePolicySource
  capabilities?: CacheCapabilityPolicyView[]
}

export interface CacheRegistryCapabilityVariant {
  policy_sha256?: string
  instance_ids: string[]
  owner: string
  kind: string
  layer: string
  family: string
  enabled: boolean
  metric_label: string
  effective_policy: CachePolicyView
  topology_group?: string
  topology_order?: number
  read_model?: string
}

export interface CacheRegistryCapabilityRow {
  component: string
  capability: string
  layer: string
  consistent: boolean
  instance_ids: string[]
  policy_sha256?: string
  owner?: string
  kind?: string
  family?: string
  enabled?: boolean
  metric_label?: string
  effective_policy?: CachePolicyView
  variants?: CacheRegistryCapabilityVariant[]
  topology_group?: string
  topology_order?: number
  read_model?: string
}

export interface CacheRegistryDrift {
  component: string
  kind: string
  message: string
  instance_ids?: string[]
  values?: Record<string, string[]>
}

export interface CacheRegistryView {
  component_registries: CacheComponentRegistryRow[]
  capability_rows: CacheRegistryCapabilityRow[]
  registry_drift: CacheRegistryDrift[]
}

export interface CacheRuntimeFormalSummary {
  ready: boolean
  component_total: number
  healthy_component_count: number
  discovered_instance_count: number
  healthy_instance_count: number
  family_group_count: number
  abnormal_family_group_count: number
  abnormal_l1_capability_count: number
}

export interface CacheRuntimeFamilyGroup {
  component: string
  family: string
  profile: string
  namespace: string
  healthy_instance_count: number
  discovered_instance_count: number
  degraded_instance_count: number
  unavailable_instance_count: number
  severity: SignalSeverity | string
  last_error?: string
  operation_p95?: MetricEvidence
  operation_errors?: MetricEvidence
  metric_evidence?: MetricEvidence[]
}

export interface CacheRuntimeView {
  summary: CacheRuntimeFormalSummary
  l1_capability_runtime: CacheL1CapabilityRuntimeRow[]
  family_groups: CacheRuntimeFamilyGroup[]
  instance_rows: CacheFamilyRow[]
}

export interface CacheL1BucketRuntime {
  bucket: string
  entries: number
  max_entries: number
  hits: number
  misses: number
  fifo_evictions: number
  ttl_expirations: number
  explicit_deletions: number
  signal_deletions: number
}

export interface CacheSignalWatcherStatus {
  configured: boolean
  status: string
  last_signal_at?: string
  last_eviction_at?: string
  last_error_at?: string
  last_error?: string
  reconnect_count: number
}

export interface CacheL1CapabilityRuntimeRow {
  component: string
  instance_id: string
  generation?: string
  capability: string
  enabled: boolean
  buckets: CacheL1BucketRuntime[]
  signal_watcher: CacheSignalWatcherStatus
  hit_rate?: MetricEvidence
  samples?: MetricEvidence
}

export interface CacheTopologyNode {
  id: string
  component: string
  capability: string
  layer: string
  enabled?: boolean
  registry_consistent: boolean
  runtime_health: string
  policy_source?: string
  hit_rate?: MetricEvidence
  samples?: MetricEvidence
  order: number
}

export interface CacheTopology {
  topology_group: string
  read_model: string
  status: string
  nodes: CacheTopologyNode[]
  edges: Array<{ from: string; to: string; kind: string }>
  source: { id: string; read_model: string; source_kind: string }
  window_evidence: Record<string, MetricEvidence | undefined>
}

export interface CacheTopologyView {
  topologies: CacheTopology[]
}

export interface CacheWarmupKind {
  kind: string
  family: string
  scope_example: string
  supports_manual_warmup: boolean
}

export interface CacheHotsetItem {
  family: string
  kind: string
  scope: string
  score: number
}

export interface CacheHotsetView {
  family?: string
  kind?: string
  limit?: number
  available: boolean
  degraded: boolean
  message?: string
  items: CacheHotsetItem[]
  metric_evidence?: MetricEvidence[]
}

export interface GovernanceCacheResponse extends CacheStatusSnapshot {
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: Signal[]
  snapshot?: CacheStatusSnapshot
  components?: Record<string, CacheComponent>
  family_rows: CacheFamilyRow[]
  capability_rows: CacheCapabilityRow[]
  warmup_kinds: CacheWarmupKind[]
  hotsets: CacheHotsetView[]
  registry_view?: CacheRegistryView
  runtime_view?: CacheRuntimeView
  topology_view?: CacheTopologyView
}

export interface RawSystemGovernanceCacheResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSystemGovernanceSignal[]
  snapshot?: CacheStatusSnapshot | Record<string, unknown>
  summary?: ICacheGovernanceStatusResponse['summary']
  families?: ICacheGovernanceStatusResponse['families']
  warmup?: ICacheGovernanceStatusResponse['warmup']
  component?: string
  components?: Record<string, CacheComponent>
  family_rows?: CacheFamilyRow[]
  capability_rows?: CacheCapabilityRow[]
  warmup_kinds?: CacheWarmupKind[]
  hotsets?: CacheHotsetView[]
  registry_view?: CacheRegistryView | Record<string, unknown>
  runtime_view?: CacheRuntimeView | Record<string, unknown>
  topology_view?: CacheTopologyView | Record<string, unknown>
}
