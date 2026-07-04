import type {
  DomainSummary,
  GovernanceHealth,
  GovernanceMetricsMeta,
  RawSystemGovernanceSignal,
  Signal,
  SignalSeverity
} from './types.shared'

export interface GovernanceOverviewResponse {
  generated_at?: string
  window?: string
  overall_severity: SignalSeverity | string
  health: GovernanceHealth
  signals: Signal[]
  metrics: GovernanceMetricsMeta
  domains?: Record<string, DomainSummary>
}

export interface RawSystemGovernanceOverviewResponse {
  generated_at?: string
  window?: string
  overall_severity?: SignalSeverity | string
  health?: GovernanceHealth | SignalSeverity | string
  signals?: RawSystemGovernanceSignal[]
  metrics?: GovernanceMetricsMeta
  domains?: Record<string, DomainSummary>
}
