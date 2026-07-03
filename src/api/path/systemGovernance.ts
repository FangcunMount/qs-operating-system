import { internalGet, internalPost } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import type { ICacheGovernanceStatusResponse } from './cacheGovernance'
import type { IEventStatusResponse } from './eventGovernance'
import type { IResilienceComponentStatus } from './resilienceGovernance'

export type GovernanceWindow = '5m' | '15m' | '1h'
export type SignalSeverity = 'critical' | 'warning' | 'info'
export type SignalDomain = 'events' | 'cache' | 'resilience' | 'system'
export type GovernanceHealth = 'healthy' | 'degraded' | 'critical'

export interface MetricEvidence {
  name: string
  window: string
  value: number | string
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

export interface ActionDescriptor {
  id: string
  domain: string
  label: string
  risk_level: string
  enabled: boolean
  planned: boolean
  requires_confirmation: boolean
  input_schema?: Record<string, unknown>
}

export interface GovernanceMetricsMeta {
  available: boolean
  reason?: string
  window?: string
}

export interface GovernanceOverviewResponse {
  generated_at?: string
  health: GovernanceHealth
  signals: Signal[]
  metrics: GovernanceMetricsMeta
}

export interface GovernanceActionsResponse {
  actions: ActionDescriptor[]
}

export interface EventTypeStatus {
  event_type: string
  pending_count: number
  failed_count: number
  oldest_age_seconds: number
  degraded: boolean
  reason?: string
}

export interface GovernanceEventsResponse extends IEventStatusResponse {
  event_types?: EventTypeStatus[]
}

export interface GovernanceCacheResponse extends ICacheGovernanceStatusResponse {
  signals?: Signal[]
}

export interface GovernanceResilienceResponse {
  generated_at?: string
  components: IResilienceComponentStatus[]
  signals?: Signal[]
  metric_evidence?: MetricEvidence[]
}

export interface ActionRunRequest {
  input?: Record<string, unknown>
  confirmation?: string
}

export interface ActionRunResponse {
  action_id: string
  status: string
  started_at?: string
  finished_at?: string
  result?: Record<string, unknown>
  message?: string
}

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  info: 2
}

export const normalizeSignalEvidence = (evidence: unknown): string[] => {
  if (Array.isArray(evidence)) {
    return evidence.map((line) => String(line)).filter((line) => line.length > 0)
  }
  if (typeof evidence === 'string') {
    const trimmed = evidence.trim()
    return trimmed ? [trimmed] : []
  }
  return []
}

export const normalizeSignals = (signals: Signal[] = []): Signal[] =>
  signals.map((signal) => ({
    ...signal,
    evidence: normalizeSignalEvidence(signal.evidence),
    metric_evidence: Array.isArray(signal.metric_evidence) ? signal.metric_evidence : []
  }))

export const sortSignalsBySeverity = (signals: Signal[] = []): Signal[] =>
  [...signals].sort((left, right) => {
    const leftOrder = SEVERITY_ORDER[left.severity] ?? 99
    const rightOrder = SEVERITY_ORDER[right.severity] ?? 99
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }
    return left.title.localeCompare(right.title)
  })

const withWindow = (window: GovernanceWindow = '5m') => ({ window })

export const getSystemGovernanceOverview = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceOverviewResponse> | undefined]> =>
  internalGet<GovernanceOverviewResponse>('/system-governance/overview', withWindow(window))

export const getSystemGovernanceEvents = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceEventsResponse> | undefined]> =>
  internalGet<GovernanceEventsResponse>('/system-governance/events', withWindow(window))

export const getSystemGovernanceCache = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceCacheResponse> | undefined]> =>
  internalGet<GovernanceCacheResponse>('/system-governance/cache', withWindow(window))

export const getSystemGovernanceResilience = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceResilienceResponse> | undefined]> =>
  internalGet<GovernanceResilienceResponse>('/system-governance/resilience', withWindow(window))

export const getSystemGovernanceActions = (): Promise<[any, QSResponse<GovernanceActionsResponse> | undefined]> =>
  internalGet<GovernanceActionsResponse>('/system-governance/actions')

export const postSystemGovernanceActionRun = (
  actionId: string,
  data: ActionRunRequest = {}
): Promise<[any, QSResponse<ActionRunResponse> | undefined]> =>
  internalPost<ActionRunResponse>(`/system-governance/actions/${encodeURIComponent(actionId)}/runs`, data)
