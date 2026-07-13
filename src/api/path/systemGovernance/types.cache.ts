import type { ICacheGovernanceFamilyStatus, ICacheGovernanceStatusResponse } from '../cacheGovernance'
import type {
  GovernanceMetricsMeta,
  MetricEvidence,
  RawSystemGovernanceSignal,
  Signal,
  SignalSeverity
} from './types.shared'

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
