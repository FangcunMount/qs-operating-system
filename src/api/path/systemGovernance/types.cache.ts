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

export interface GovernanceCacheResponse extends ICacheGovernanceStatusResponse {
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: Signal[]
  snapshot?: ICacheGovernanceStatusResponse
  components?: Record<string, CacheComponent>
  family_rows: CacheFamilyRow[]
  warmup_kinds: CacheWarmupKind[]
  hotsets: CacheHotsetView[]
}

export interface RawSystemGovernanceCacheResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSystemGovernanceSignal[]
  snapshot?: ICacheGovernanceStatusResponse
  summary?: ICacheGovernanceStatusResponse['summary']
  families?: ICacheGovernanceStatusResponse['families']
  warmup?: ICacheGovernanceStatusResponse['warmup']
  component?: string
  components?: Record<string, CacheComponent>
  family_rows?: CacheFamilyRow[]
  warmup_kinds?: CacheWarmupKind[]
  hotsets?: CacheHotsetView[]
}
