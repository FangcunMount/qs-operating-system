import { internalGet, internalPost } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import type { ICacheGovernanceStatusResponse } from './cacheGovernance'
import type { IEventStatusResponse } from './eventGovernance'
import type { IResilienceComponentStatus, IResilienceRuntimeSnapshot } from './resilienceGovernance'

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

export interface DomainSummary {
  severity: SignalSeverity | string
  signal_count: number
}

export interface GovernanceOverviewResponse {
  generated_at?: string
  window?: string
  overall_severity: SignalSeverity | string
  health: GovernanceHealth
  signals: Signal[]
  metrics: GovernanceMetricsMeta
  domains?: Record<string, DomainSummary>
}

export interface GovernanceActionsResponse {
  actions: ActionDescriptor[]
}

export interface EventTypeStatus {
  store?: string
  event_type: string
  pending_count: number
  failed_count: number
  oldest_age_seconds: number
  degraded: boolean
  reason?: string
}

export interface GovernanceEventsResponse extends IEventStatusResponse {
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: Signal[]
  snapshot?: IEventStatusResponse
  event_types?: EventTypeStatus[]
}

export interface GovernanceCacheResponse extends ICacheGovernanceStatusResponse {
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: Signal[]
  snapshot?: ICacheGovernanceStatusResponse
}

export interface GovernanceResilienceResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  components: IResilienceComponentStatus[]
  signals?: Signal[]
  metric_evidence?: MetricEvidence[]
  raw_components?: Record<string, RawComponentResilience>
}

export interface ActionRunRequest {
  input?: Record<string, unknown>
  confirm?: boolean
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
  healthy: 2,
  info: 3
}

type RawEvidence = string | string[] | Record<string, unknown> | null | undefined

type RawSignal = Omit<Signal, 'evidence' | 'metric_evidence'> & {
  evidence?: RawEvidence
  metric_evidence?: MetricEvidence[]
}

interface RawOverviewResponse {
  generated_at?: string
  window?: string
  overall_severity?: SignalSeverity | string
  health?: GovernanceHealth | SignalSeverity | string
  signals?: RawSignal[]
  metrics?: GovernanceMetricsMeta
  domains?: Record<string, DomainSummary>
}

interface RawEventTypeBucket {
  event_type?: string
  EventType?: string
  status?: string
  Status?: string
  count?: number
  Count?: number
  oldest_created_at?: string
  OldestCreatedAt?: string
  oldest_age_seconds?: number
  OldestAgeSeconds?: number
}

interface RawEventTypeGroup {
  store?: string
  buckets?: RawEventTypeBucket[]
  error?: string
}

interface RawEventsResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSignal[]
  snapshot?: IEventStatusResponse
  catalog?: IEventStatusResponse['catalog']
  outboxes?: IEventStatusResponse['outboxes']
  event_types?: RawEventTypeGroup[] | EventTypeStatus[]
}

interface RawCacheResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSignal[]
  snapshot?: ICacheGovernanceStatusResponse
  summary?: ICacheGovernanceStatusResponse['summary']
  families?: ICacheGovernanceStatusResponse['families']
  warmup?: ICacheGovernanceStatusResponse['warmup']
  component?: string
}

export interface RawComponentResilience {
  available?: boolean
  reason?: string
  snapshot?: IResilienceRuntimeSnapshot
}

interface RawResilienceResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSignal[]
  components?: Record<string, RawComponentResilience> | IResilienceComponentStatus[]
  metric_evidence?: MetricEvidence[]
}

const EMPTY_EVENT_CATALOG: IEventStatusResponse['catalog'] = {
  topic_count: 0,
  event_count: 0,
  best_effort_count: 0,
  durable_outbox_count: 0
}

const EMPTY_CACHE_SUMMARY: ICacheGovernanceStatusResponse['summary'] = {
  family_total: 0,
  available_count: 0,
  degraded_count: 0,
  unavailable_count: 0,
  ready: true
}

const EMPTY_CACHE_WARMUP: ICacheGovernanceStatusResponse['warmup'] = {
  enabled: false,
  startup: {
    static: false,
    query: false
  },
  hotset: {
    enable: false,
    top_n: 0,
    max_items_per_kind: 0
  },
  latest_runs: []
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeMetricEvidence = (items: unknown): MetricEvidence[] =>
  Array.isArray(items) ? items as MetricEvidence[] : []

const stringifyEvidenceValue = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (_error) {
      return String(value)
    }
  }
  return String(value)
}

export const normalizeSignalEvidence = (evidence: unknown): string[] => {
  if (Array.isArray(evidence)) {
    return evidence.map((line) => String(line)).filter((line) => line.length > 0)
  }
  if (typeof evidence === 'string') {
    const trimmed = evidence.trim()
    return trimmed ? [trimmed] : []
  }
  if (isRecord(evidence)) {
    return Object.keys(evidence)
      .sort()
      .map((key) => {
        const value = stringifyEvidenceValue(evidence[key])
        return value ? `${key}: ${value}` : key
      })
      .filter((line) => line.length > 0)
  }
  return []
}

export const normalizeSignals = (signals: RawSignal[] = []): Signal[] =>
  signals.map((signal) => ({
    ...signal,
    evidence: normalizeSignalEvidence(signal.evidence),
    metric_evidence: normalizeMetricEvidence(signal.metric_evidence)
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

const severityToHealth = (severity?: string): GovernanceHealth => {
  if (severity === 'critical') {
    return 'critical'
  }
  if (severity === 'warning' || severity === 'degraded') {
    return 'degraded'
  }
  return 'healthy'
}

const normalizeOverview = (raw: RawOverviewResponse = {}): GovernanceOverviewResponse => {
  const overallSeverity = raw.overall_severity || raw.health || 'healthy'
  return {
    generated_at: raw.generated_at,
    window: raw.window,
    overall_severity: overallSeverity,
    health: severityToHealth(overallSeverity),
    signals: sortSignalsBySeverity(normalizeSignals(raw.signals || [])),
    metrics: raw.metrics || { available: false, reason: 'metrics metadata unavailable' },
    domains: raw.domains
  }
}

const numberFrom = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const stringFrom = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback

const ageSecondsFrom = (bucket: RawEventTypeBucket, generatedAt?: string): number => {
  const explicit = numberFrom(bucket.oldest_age_seconds ?? bucket.OldestAgeSeconds, -1)
  if (explicit >= 0) {
    return explicit
  }
  const oldestCreatedAt = bucket.oldest_created_at || bucket.OldestCreatedAt
  if (!oldestCreatedAt || !generatedAt) {
    return 0
  }
  const oldest = Date.parse(oldestCreatedAt)
  const generated = Date.parse(generatedAt)
  if (!Number.isFinite(oldest) || !Number.isFinite(generated) || generated < oldest) {
    return 0
  }
  return Math.floor((generated - oldest) / 1000)
}

const normalizeEventTypes = (raw: RawEventsResponse['event_types'], generatedAt?: string): EventTypeStatus[] => {
  if (!Array.isArray(raw)) {
    return []
  }
  if (raw.length > 0 && 'event_type' in raw[0]) {
    return raw as EventTypeStatus[]
  }
  const rows = new Map<string, EventTypeStatus>()
  ;(raw as RawEventTypeGroup[]).forEach((group) => {
    const store = group.store || ''
    ;(group.buckets || []).forEach((bucket) => {
      const eventType = stringFrom(bucket.event_type ?? bucket.EventType, 'unknown')
      const status = stringFrom(bucket.status ?? bucket.Status, 'unknown')
      const count = numberFrom(bucket.count ?? bucket.Count)
      const key = `${store}:${eventType}`
      const current = rows.get(key) || {
        store,
        event_type: eventType,
        pending_count: 0,
        failed_count: 0,
        oldest_age_seconds: 0,
        degraded: false,
        reason: group.error
      }
      if (status === 'pending') {
        current.pending_count += count
        current.oldest_age_seconds = Math.max(current.oldest_age_seconds, ageSecondsFrom(bucket, generatedAt))
      }
      if (status === 'failed') {
        current.failed_count += count
        current.degraded = current.degraded || count > 0
      }
      current.degraded = current.degraded || Boolean(group.error)
      rows.set(key, current)
    })
    if (group.error && (!group.buckets || group.buckets.length === 0)) {
      rows.set(`${store}:reader_error`, {
        store,
        event_type: 'reader_error',
        pending_count: 0,
        failed_count: 0,
        oldest_age_seconds: 0,
        degraded: true,
        reason: group.error
      })
    }
  })
  return Array.from(rows.values())
}

const normalizeEvents = (raw: RawEventsResponse = {}): GovernanceEventsResponse => {
  const snapshot = raw.snapshot || raw as IEventStatusResponse
  return {
    generated_at: raw.generated_at || snapshot.generated_at,
    window: raw.window,
    metrics: raw.metrics,
    signals: normalizeSignals(raw.signals || []),
    snapshot,
    catalog: snapshot.catalog || raw.catalog || EMPTY_EVENT_CATALOG,
    outboxes: snapshot.outboxes || raw.outboxes || [],
    event_types: normalizeEventTypes(raw.event_types, raw.generated_at || snapshot.generated_at)
  }
}

const normalizeCache = (raw: RawCacheResponse = {}): GovernanceCacheResponse => {
  const snapshot = raw.snapshot || raw as ICacheGovernanceStatusResponse
  return {
    generated_at: raw.generated_at || snapshot.generated_at,
    component: snapshot.component || raw.component,
    window: raw.window,
    metrics: raw.metrics,
    signals: normalizeSignals(raw.signals || []),
    snapshot,
    summary: snapshot.summary || raw.summary || EMPTY_CACHE_SUMMARY,
    families: snapshot.families || raw.families || [],
    warmup: snapshot.warmup || raw.warmup || EMPTY_CACHE_WARMUP
  }
}

const componentFromRaw = (name: string, item: RawComponentResilience | IResilienceComponentStatus): IResilienceComponentStatus => {
  const oldShape = item as IResilienceComponentStatus
  if (oldShape.component && typeof oldShape.degraded === 'boolean') {
    return oldShape
  }
  const raw = item as RawComponentResilience
  const snapshot = raw.snapshot
  const available = raw.available !== false
  return {
    component: name,
    source: `/internal/v1/system-governance/resilience#${name}`,
    configured: available || Boolean(snapshot),
    degraded: !available || Boolean(snapshot && !snapshot.summary?.ready),
    error: raw.reason,
    snapshot
  }
}

const normalizeResilienceComponents = (
  components: RawResilienceResponse['components']
): { list: IResilienceComponentStatus[]; raw: Record<string, RawComponentResilience> } => {
  if (Array.isArray(components)) {
    const raw = components.reduce<Record<string, RawComponentResilience>>((acc, item) => {
      acc[item.component] = {
        available: !item.degraded,
        reason: item.error,
        snapshot: item.snapshot
      }
      return acc
    }, {})
    return { list: components, raw }
  }
  const raw = components || {}
  const list = Object.keys(raw)
    .sort()
    .map((name) => componentFromRaw(name, raw[name]))
  return { list, raw }
}

const normalizeResilience = (raw: RawResilienceResponse = {}): GovernanceResilienceResponse => {
  const components = normalizeResilienceComponents(raw.components)
  const signals = normalizeSignals(raw.signals || [])
  return {
    generated_at: raw.generated_at,
    window: raw.window,
    metrics: raw.metrics,
    components: components.list,
    raw_components: components.raw,
    signals,
    metric_evidence: [
      ...normalizeMetricEvidence(raw.metric_evidence),
      ...signals.flatMap((signal) => signal.metric_evidence || [])
    ]
  }
}

const normalizeResponse = <Raw, Normalized>(
  promise: Promise<[any, QSResponse<Raw> | undefined]>,
  normalize: (raw: Raw) => Normalized
): Promise<[any, QSResponse<Normalized> | undefined]> =>
    promise.then(([error, response]) => {
      if (error || !response) {
        return [error, undefined]
      }
      return [null, {
        ...response,
        data: normalize(response.data)
      }]
    })

export const getSystemGovernanceOverview = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceOverviewResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawOverviewResponse>('/system-governance/overview', withWindow(window)),
    normalizeOverview
  )

export const getSystemGovernanceEvents = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceEventsResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawEventsResponse>('/system-governance/events', withWindow(window)),
    normalizeEvents
  )

export const getSystemGovernanceCache = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceCacheResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawCacheResponse>('/system-governance/cache', withWindow(window)),
    normalizeCache
  )

export const getSystemGovernanceResilience = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceResilienceResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawResilienceResponse>('/system-governance/resilience', withWindow(window)),
    normalizeResilience
  )

export const getSystemGovernanceActions = (): Promise<[any, QSResponse<GovernanceActionsResponse> | undefined]> =>
  internalGet<GovernanceActionsResponse>('/system-governance/actions')

export const postSystemGovernanceActionRun = (
  actionId: string,
  data: ActionRunRequest = {}
): Promise<[any, QSResponse<ActionRunResponse> | undefined]> =>
  internalPost<ActionRunResponse>(`/system-governance/actions/${encodeURIComponent(actionId)}/runs`, data)
