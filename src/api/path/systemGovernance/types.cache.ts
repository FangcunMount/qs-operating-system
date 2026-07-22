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
}

export interface CacheCapabilityWorkload {
  hit_rate?: MetricEvidence
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

export interface CacheEffectiveRegistrySnapshot {
  snapshot_version: number
  catalog_version: string
  generated_at?: string
  capabilities: CacheCapabilityPolicyView[]
  reload: CachePolicyReloadStatus
}

export interface CacheStatusSnapshot extends ICacheGovernanceStatusResponse {
  effective_registry?: CacheEffectiveRegistrySnapshot
}

export interface CacheComponent {
  available: boolean
  reason?: string
  snapshot?: CacheRuntimeSnapshot
}

export interface CacheFamilyRow extends ICacheGovernanceFamilyStatus {
  severity: SignalSeverity | string
  reason?: string
  metric_evidence?: MetricEvidence[]
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
}
