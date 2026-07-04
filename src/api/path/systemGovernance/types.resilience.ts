import type { IResilienceComponentStatus, IResilienceRuntimeSnapshot } from '../resilienceGovernance'
import type {
  GovernanceMetricsMeta,
  MetricEvidence,
  RawSystemGovernanceSignal,
  Signal,
  SignalSeverity
} from './types.shared'

export interface GovernanceResilienceResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  components: IResilienceComponentStatus[]
  signals?: Signal[]
  metric_evidence?: MetricEvidence[]
  raw_components?: Record<string, RawSystemGovernanceComponentResilience>
  summary: ResilienceSummary
  queue_rows: ResilienceQueueRow[]
  backpressure_rows: ResilienceBackpressureRow[]
  capability_rows: ResilienceCapabilityRow[]
}

export interface ResilienceSummary {
  component_count: number
  unavailable_component_count: number
  not_ready_component_count: number
  queue_count: number
  warning_queue_count: number
  critical_queue_count: number
  max_queue_utilization: number
  backpressure_count: number
  warning_backpressure_count: number
  critical_backpressure_count: number
  max_backpressure_utilization: number
  degraded_capability_count: number
}

export interface ResilienceQueueRow {
  component: string
  name: string
  strategy: string
  depth: number
  capacity: number
  utilization: number
  status_counts?: Record<string, number>
  lifecycle_boundary?: string
  severity: SignalSeverity | string
  reason?: string
  metric_evidence?: MetricEvidence[]
}

export interface ResilienceBackpressureRow {
  component: string
  name: string
  dependency: string
  strategy: string
  enabled: boolean
  in_flight: number
  max_inflight: number
  utilization: number
  timeout_millis: number
  degraded: boolean
  severity: SignalSeverity | string
  reason?: string
  metric_evidence?: MetricEvidence[]
}

export interface ResilienceCapabilityRow {
  component: string
  kind: string
  name: string
  strategy: string
  configured: boolean
  degraded: boolean
  severity: SignalSeverity | string
  reason?: string
}

export interface RawSystemGovernanceComponentResilience {
  available?: boolean
  reason?: string
  snapshot?: IResilienceRuntimeSnapshot
}

export interface RawSystemGovernanceResilienceResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSystemGovernanceSignal[]
  components?: Record<string, RawSystemGovernanceComponentResilience> | IResilienceComponentStatus[]
  metric_evidence?: MetricEvidence[]
  summary?: Partial<ResilienceSummary>
  queue_rows?: ResilienceQueueRow[]
  backpressure_rows?: ResilienceBackpressureRow[]
  capability_rows?: ResilienceCapabilityRow[]
}
