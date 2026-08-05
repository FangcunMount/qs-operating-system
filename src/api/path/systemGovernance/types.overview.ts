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
  checkpoints?: GovernanceCheckpointView
}

export interface GovernanceCheckpointSnapshot {
  EvaluationRunRunning?: number
  EvaluationRunFailedRetryable?: number
  evaluation_run_running?: number
  evaluation_run_failed_retryable?: number
}

export interface GovernanceCheckpointView {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: Signal[]
  snapshot?: GovernanceCheckpointSnapshot
  available: boolean
  reason?: string
}

export interface RawSystemGovernanceOverviewResponse {
  generated_at?: string
  window?: string
  overall_severity?: SignalSeverity | string
  health?: GovernanceHealth | SignalSeverity | string
  signals?: RawSystemGovernanceSignal[]
  metrics?: GovernanceMetricsMeta
  domains?: Record<string, DomainSummary>
  checkpoints?: GovernanceCheckpointView
}
