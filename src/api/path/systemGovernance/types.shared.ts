export type GovernanceWindow = '5m' | '15m' | '1h'
export type SignalSeverity = 'critical' | 'warning' | 'healthy' | 'info'
export type SignalDomain = 'events' | 'cache' | 'resilience' | 'system'
export type GovernanceHealth = 'healthy' | 'degraded' | 'critical'

export interface MetricEvidence {
  name: string
  window: string
  value?: number | string
  unit?: string
  available: boolean
  reason?: string
}

export interface Signal {
  id: string
  domain: SignalDomain | string
  severity: SignalSeverity | string
  status: string
  title: string
  evidence: string[]
  metric_evidence?: MetricEvidence[]
  dashboard_key?: string
  action_ids?: string[]
}

export interface GovernanceMetricsMeta {
  available: boolean
  reason?: string
  window?: string
}

export interface DomainSummary {
  severity: SignalSeverity | string
  signal_count: number
}

export type RawSystemGovernanceEvidence = string | string[] | Record<string, unknown> | null | undefined

export type RawSystemGovernanceSignal = Omit<Signal, 'evidence' | 'metric_evidence'> & {
  evidence?: RawSystemGovernanceEvidence
  metric_evidence?: MetricEvidence[]
}
