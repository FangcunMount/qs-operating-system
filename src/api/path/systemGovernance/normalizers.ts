import type { ICacheGovernanceStatusResponse } from '../cacheGovernance'
import type { IEventStatusResponse } from '../eventGovernance'
import type { IResilienceComponentStatus } from '../resilienceGovernance'
import type {
  CacheFamilyRow,
  CacheHotsetItem,
  CacheHotsetView,
  CacheWarmupKind,
  EventTypeStatus,
  EventDrainSummary,
  EventOutboxRow,
  EventTypeRow,
  GovernanceCacheResponse,
  GovernanceEventsResponse,
  GovernanceHealth,
  GovernanceOverviewResponse,
  GovernanceResilienceResponse,
  MetricEvidence,
  RawSystemGovernanceCacheResponse,
  RawSystemGovernanceComponentResilience,
  RawSystemGovernanceEventTypeBucket,
  RawSystemGovernanceEventTypeGroup,
  RawSystemGovernanceEventsResponse,
  RawSystemGovernanceOverviewResponse,
  RawSystemGovernanceResilienceResponse,
  RawSystemGovernanceSignal,
  ResilienceBackpressureRow,
  ResilienceCapabilityRow,
  ResilienceQueueRow,
  ResilienceSummary,
  Signal
} from './types'

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
  info: 3
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

const EMPTY_EVENT_SUMMARY: EventDrainSummary = {
  outbox_count: 0,
  degraded_reader_count: 0,
  pending_count: 0,
  failed_count: 0,
  oldest_pending_age_seconds: 0,
  stale_event_type_count: 0,
  reader_error_count: 0
}

const EMPTY_RESILIENCE_SUMMARY: ResilienceSummary = {
  component_count: 0,
  unavailable_component_count: 0,
  not_ready_component_count: 0,
  queue_count: 0,
  warning_queue_count: 0,
  critical_queue_count: 0,
  max_queue_utilization: 0,
  backpressure_count: 0,
  warning_backpressure_count: 0,
  critical_backpressure_count: 0,
  max_backpressure_utilization: 0,
  degraded_capability_count: 0
}

const DEFAULT_CACHE_WARMUP_KINDS: CacheWarmupKind[] = [
  { kind: 'static.scale', family: 'static_meta', scope_example: 'scale:S-001', supports_manual_warmup: true },
  { kind: 'static.questionnaire', family: 'static_meta', scope_example: 'questionnaire:Q-001', supports_manual_warmup: true },
  { kind: 'static.scale_list', family: 'static_meta', scope_example: 'published', supports_manual_warmup: true },
  { kind: 'static.personality_model', family: 'static_meta', scope_example: 'personality_model:M-001', supports_manual_warmup: true },
  { kind: 'query.stats_overview', family: 'query_result', scope_example: 'org:1:preset:30d', supports_manual_warmup: true },
  { kind: 'query.stats_system', family: 'query_result', scope_example: 'org:1', supports_manual_warmup: true },
  { kind: 'query.stats_questionnaire', family: 'query_result', scope_example: 'org:1:questionnaire:Q-001', supports_manual_warmup: true },
  { kind: 'query.stats_plan', family: 'query_result', scope_example: 'org:1:plan:99', supports_manual_warmup: true }
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeMetricEvidence = (items: unknown): MetricEvidence[] =>
  Array.isArray(items) ? items as MetricEvidence[] : []

const dedupeMetricEvidence = (items: MetricEvidence[]): MetricEvidence[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.name}:${item.window}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

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

export const normalizeSignals = (signals: RawSystemGovernanceSignal[] = []): Signal[] =>
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

const severityToHealth = (severity?: string): GovernanceHealth => {
  if (severity === 'critical') {
    return 'critical'
  }
  if (severity === 'warning' || severity === 'degraded') {
    return 'degraded'
  }
  return 'healthy'
}

export const normalizeSystemGovernanceOverview = (
  raw: RawSystemGovernanceOverviewResponse = {}
): GovernanceOverviewResponse => {
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

const ageSecondsFrom = (bucket: RawSystemGovernanceEventTypeBucket, generatedAt?: string): number => {
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

const normalizeEventTypes = (
  raw: RawSystemGovernanceEventsResponse['event_types'],
  generatedAt?: string
): EventTypeStatus[] => {
  if (!Array.isArray(raw)) {
    return []
  }
  if (raw.length > 0 && 'event_type' in raw[0]) {
    return raw as EventTypeStatus[]
  }
  const rows = new Map<string, EventTypeStatus>()
  const groups = raw as RawSystemGovernanceEventTypeGroup[]
  groups.forEach((group) => {
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

const severityFromEventOutbox = (row: Pick<EventOutboxRow, 'degraded' | 'failed_count' | 'pending_count' | 'oldest_pending_age_seconds'>): string => {
  if (row.degraded || row.failed_count > 0 || row.oldest_pending_age_seconds >= 900) {
    return 'critical'
  }
  if (row.pending_count > 0 && row.oldest_pending_age_seconds >= 300) {
    return 'warning'
  }
  return 'healthy'
}

const normalizeOutboxRows = (
  rows: EventOutboxRow[] | undefined,
  outboxes: IEventStatusResponse['outboxes'] = []
): EventOutboxRow[] => {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row) => ({
      ...row,
      pending_count: numberFrom(row.pending_count),
      failed_count: numberFrom(row.failed_count),
      publishing_count: numberFrom(row.publishing_count),
      oldest_pending_age_seconds: numberFrom(row.oldest_pending_age_seconds),
      degraded: Boolean(row.degraded),
      severity: row.severity || severityFromEventOutbox(row),
      metric_evidence: normalizeMetricEvidence(row.metric_evidence)
    }))
  }
  return outboxes.map((outbox) => {
    const row: EventOutboxRow = {
      name: outbox.name,
      store: outbox.store || outbox.name,
      degraded: Boolean(outbox.degraded),
      pending_count: 0,
      failed_count: 0,
      publishing_count: 0,
      oldest_pending_age_seconds: 0,
      severity: 'healthy',
      reason: outbox.error,
      metric_evidence: []
    }
    ;(outbox.buckets || []).forEach((bucket) => {
      if (bucket.status === 'pending') {
        row.pending_count += numberFrom(bucket.count)
        row.oldest_pending_age_seconds = Math.max(row.oldest_pending_age_seconds, numberFrom(bucket.oldest_age_seconds))
      } else if (bucket.status === 'failed') {
        row.failed_count += numberFrom(bucket.count)
      } else if (bucket.status === 'publishing') {
        row.publishing_count += numberFrom(bucket.count)
      }
    })
    row.severity = severityFromEventOutbox(row)
    return row
  })
}

const normalizeEventTypeRows = (
  rows: EventTypeRow[] | undefined,
  eventTypes: EventTypeStatus[]
): EventTypeRow[] => {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row) => ({
      ...row,
      pending_count: numberFrom(row.pending_count),
      failed_count: numberFrom(row.failed_count),
      oldest_age_seconds: numberFrom(row.oldest_age_seconds),
      degraded: Boolean(row.degraded),
      severity: row.severity || (row.degraded ? 'warning' : 'healthy'),
      metric_evidence: normalizeMetricEvidence(row.metric_evidence)
    }))
  }
  return eventTypes.map((row) => ({
    ...row,
    severity: row.failed_count > 0 ? 'critical' : row.degraded || row.oldest_age_seconds >= 300 ? 'warning' : 'healthy',
    metric_evidence: []
  }))
}

const normalizeEventSummary = (
  rawSummary: Partial<EventDrainSummary> | undefined,
  outboxRows: EventOutboxRow[],
  eventTypeRows: EventTypeRow[]
): EventDrainSummary => {
  const oldestPendingAge = Math.max(0, ...outboxRows.map((row) => row.oldest_pending_age_seconds))
  const staleEventTypeCount = eventTypeRows.filter((row) => row.pending_count > 0 && row.oldest_age_seconds >= 300).length
  const readerErrorCount = eventTypeRows.filter((row) => row.event_type === 'reader_error' && row.degraded).length
  return {
    ...EMPTY_EVENT_SUMMARY,
    ...rawSummary,
    outbox_count: numberFrom(rawSummary?.outbox_count, outboxRows.length),
    degraded_reader_count: numberFrom(rawSummary?.degraded_reader_count, outboxRows.filter((row) => row.degraded).length),
    pending_count: numberFrom(rawSummary?.pending_count, outboxRows.reduce((sum, row) => sum + row.pending_count, 0)),
    failed_count: numberFrom(rawSummary?.failed_count, outboxRows.reduce((sum, row) => sum + row.failed_count, 0)),
    oldest_pending_age_seconds: numberFrom(rawSummary?.oldest_pending_age_seconds, oldestPendingAge),
    stale_event_type_count: numberFrom(rawSummary?.stale_event_type_count, staleEventTypeCount),
    reader_error_count: numberFrom(rawSummary?.reader_error_count, readerErrorCount)
  }
}

export const normalizeSystemGovernanceEvents = (
  raw: RawSystemGovernanceEventsResponse = {}
): GovernanceEventsResponse => {
  const snapshot = raw.snapshot || raw as IEventStatusResponse
  const eventTypes = normalizeEventTypes(raw.event_types, raw.generated_at || snapshot.generated_at)
  const outboxRows = normalizeOutboxRows(raw.outbox_rows, snapshot.outboxes || raw.outboxes || [])
  const eventTypeRows = normalizeEventTypeRows(raw.event_type_rows, eventTypes)
  return {
    generated_at: raw.generated_at || snapshot.generated_at,
    window: raw.window,
    metrics: raw.metrics,
    signals: normalizeSignals(raw.signals || []),
    snapshot,
    catalog: snapshot.catalog || raw.catalog || EMPTY_EVENT_CATALOG,
    outboxes: snapshot.outboxes || raw.outboxes || [],
    event_types: eventTypes,
    summary: normalizeEventSummary(raw.summary, outboxRows, eventTypeRows),
    outbox_rows: outboxRows,
    event_type_rows: eventTypeRows
  }
}

const normalizeCacheFamilyRows = (
  rows: CacheFamilyRow[] | undefined,
  families: ICacheGovernanceStatusResponse['families'] = []
): CacheFamilyRow[] => {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row) => ({
      ...row,
      available: Boolean(row.available),
      degraded: Boolean(row.degraded),
      severity: row.severity || (!row.available ? 'critical' : row.degraded ? 'warning' : 'healthy'),
      reason: row.reason || row.last_error,
      metric_evidence: normalizeMetricEvidence(row.metric_evidence)
    }))
  }
  return families.map((family) => ({
    ...family,
    severity: !family.available ? 'critical' : family.degraded ? 'warning' : 'healthy',
    reason: family.last_error,
    metric_evidence: []
  }))
}

const normalizeCacheHotsetItem = (item: unknown): CacheHotsetItem => {
  const raw = isRecord(item) ? item : {}
  const target = isRecord(raw.target) ? raw.target : isRecord(raw.Target) ? raw.Target : {}
  return {
    family: stringFrom(raw.family ?? raw.Family ?? target.family ?? target.Family),
    kind: stringFrom(raw.kind ?? raw.Kind ?? target.kind ?? target.Kind),
    scope: stringFrom(raw.scope ?? raw.Scope ?? target.scope ?? target.Scope),
    score: numberFrom(raw.score ?? raw.Score)
  }
}

const normalizeCacheHotsets = (hotsets: CacheHotsetView[] | undefined): CacheHotsetView[] =>
  (Array.isArray(hotsets) ? hotsets : []).map((hotset) => ({
    ...hotset,
    family: hotset.family,
    kind: hotset.kind,
    limit: numberFrom(hotset.limit),
    available: Boolean(hotset.available),
    degraded: Boolean(hotset.degraded),
    items: (Array.isArray(hotset.items) ? hotset.items : []).map((item) => normalizeCacheHotsetItem(item)),
    metric_evidence: normalizeMetricEvidence(hotset.metric_evidence)
  }))

export const normalizeSystemGovernanceCache = (
  raw: RawSystemGovernanceCacheResponse = {}
): GovernanceCacheResponse => {
  const snapshot = raw.snapshot || raw as ICacheGovernanceStatusResponse
  const families = snapshot.families || raw.families || []
  return {
    generated_at: raw.generated_at || snapshot.generated_at,
    component: snapshot.component || raw.component,
    window: raw.window,
    metrics: raw.metrics,
    signals: normalizeSignals(raw.signals || []),
    snapshot,
    summary: snapshot.summary || raw.summary || EMPTY_CACHE_SUMMARY,
    families,
    warmup: snapshot.warmup || raw.warmup || EMPTY_CACHE_WARMUP,
    components: raw.components || {},
    family_rows: normalizeCacheFamilyRows(raw.family_rows, families),
    warmup_kinds: Array.isArray(raw.warmup_kinds) && raw.warmup_kinds.length > 0 ? raw.warmup_kinds : DEFAULT_CACHE_WARMUP_KINDS,
    hotsets: normalizeCacheHotsets(raw.hotsets)
  }
}

const componentFromRaw = (
  name: string,
  item: RawSystemGovernanceComponentResilience | IResilienceComponentStatus
): IResilienceComponentStatus => {
  const oldShape = item as IResilienceComponentStatus
  if (oldShape.component && typeof oldShape.degraded === 'boolean') {
    return oldShape
  }
  const raw = item as RawSystemGovernanceComponentResilience
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
  components: RawSystemGovernanceResilienceResponse['components']
): { list: IResilienceComponentStatus[]; raw: Record<string, RawSystemGovernanceComponentResilience> } => {
  if (Array.isArray(components)) {
    const raw = components.reduce<Record<string, RawSystemGovernanceComponentResilience>>((acc, item) => {
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

const queueUtilization = (depth: number, capacity: number): number =>
  capacity > 0 ? depth / capacity : 0

const backpressureUtilization = (inFlight: number, maxInflight: number): number =>
  maxInflight > 0 ? inFlight / maxInflight : 0

const severityFromQueueUtilization = (utilization: number): string => {
  if (utilization >= 0.9) return 'critical'
  if (utilization >= 0.7) return 'warning'
  return 'healthy'
}

const severityFromBackpressure = (utilization: number, degraded?: boolean): string => {
  if (utilization >= 0.9) return 'critical'
  if (utilization >= 0.8 || degraded) return 'warning'
  return 'healthy'
}

const normalizeStatusCounts = (value: unknown): Record<string, number> | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  return Object.keys(value).reduce<Record<string, number>>((acc, key) => {
    acc[key] = numberFrom(value[key])
    return acc
  }, {})
}

const normalizeResilienceQueueRows = (
  rows: ResilienceQueueRow[] | undefined,
  components: IResilienceComponentStatus[]
): ResilienceQueueRow[] => {
  if (Array.isArray(rows)) {
    return rows.map((row) => {
      const depth = numberFrom(row.depth)
      const capacity = numberFrom(row.capacity)
      const utilization = numberFrom(row.utilization, queueUtilization(depth, capacity))
      return {
        ...row,
        component: row.component || '',
        name: row.name || '',
        strategy: row.strategy || '',
        depth,
        capacity,
        utilization,
        status_counts: normalizeStatusCounts(row.status_counts),
        severity: row.severity || severityFromQueueUtilization(utilization),
        metric_evidence: normalizeMetricEvidence(row.metric_evidence)
      }
    })
  }
  return components.flatMap((component) => (component.snapshot?.queues || []).map((queue) => {
    const depth = numberFrom(queue.depth)
    const capacity = numberFrom(queue.capacity)
    const utilization = queueUtilization(depth, capacity)
    return {
      component: component.component,
      name: queue.name,
      strategy: queue.strategy,
      depth,
      capacity,
      utilization,
      status_counts: normalizeStatusCounts(queue.status_counts),
      lifecycle_boundary: queue.lifecycle_boundary,
      severity: severityFromQueueUtilization(utilization),
      metric_evidence: []
    }
  }))
}

const normalizeResilienceBackpressureRows = (
  rows: ResilienceBackpressureRow[] | undefined,
  components: IResilienceComponentStatus[]
): ResilienceBackpressureRow[] => {
  if (Array.isArray(rows)) {
    return rows.map((row) => {
      const inFlight = numberFrom(row.in_flight)
      const maxInflight = numberFrom(row.max_inflight)
      const degraded = Boolean(row.degraded)
      const utilization = numberFrom(row.utilization, backpressureUtilization(inFlight, maxInflight))
      return {
        ...row,
        component: row.component || '',
        name: row.name || '',
        dependency: row.dependency || '',
        strategy: row.strategy || '',
        enabled: Boolean(row.enabled),
        in_flight: inFlight,
        max_inflight: maxInflight,
        utilization,
        timeout_millis: numberFrom(row.timeout_millis),
        degraded,
        severity: row.severity || severityFromBackpressure(utilization, degraded),
        metric_evidence: normalizeMetricEvidence(row.metric_evidence)
      }
    })
  }
  return components.flatMap((component) => (component.snapshot?.backpressure || []).map((item) => {
    const inFlight = numberFrom(item.in_flight)
    const maxInflight = numberFrom(item.max_inflight)
    const degraded = Boolean(item.degraded)
    const utilization = backpressureUtilization(inFlight, maxInflight)
    return {
      component: component.component,
      name: item.name,
      dependency: item.dependency,
      strategy: item.strategy,
      enabled: Boolean(item.enabled),
      in_flight: inFlight,
      max_inflight: maxInflight,
      utilization,
      timeout_millis: numberFrom(item.timeout_millis),
      degraded,
      reason: item.reason,
      severity: severityFromBackpressure(utilization, degraded),
      metric_evidence: []
    }
  }))
}

const capabilitySeverity = (degraded?: boolean): string => degraded ? 'warning' : 'healthy'

const normalizeResilienceCapabilityRows = (
  rows: ResilienceCapabilityRow[] | undefined,
  components: IResilienceComponentStatus[]
): ResilienceCapabilityRow[] => {
  if (Array.isArray(rows)) {
    return rows.map((row) => ({
      ...row,
      component: row.component || '',
      kind: row.kind || '',
      name: row.name || '',
      strategy: row.strategy || '',
      configured: Boolean(row.configured),
      degraded: Boolean(row.degraded),
      severity: row.severity || capabilitySeverity(row.degraded)
    }))
  }
  const fields: Array<{ key: 'rate_limits' | 'locks' | 'idempotency' | 'duplicate_suppression'; kind: string }> = [
    { key: 'rate_limits', kind: 'rate_limit' },
    { key: 'locks', kind: 'lock' },
    { key: 'idempotency', kind: 'idempotency' },
    { key: 'duplicate_suppression', kind: 'duplicate_suppression' }
  ]
  return components.flatMap((component) => fields.flatMap((field) => (
    component.snapshot?.[field.key] || []
  ).map((item) => ({
    component: component.component,
    kind: item.kind || field.kind,
    name: item.name,
    strategy: item.strategy,
    configured: Boolean(item.configured),
    degraded: Boolean(item.degraded),
    severity: capabilitySeverity(item.degraded),
    reason: item.reason
  }))))
}

const normalizeResilienceSummary = (
  rawSummary: Partial<ResilienceSummary> | undefined,
  components: IResilienceComponentStatus[],
  rawComponents: Record<string, RawSystemGovernanceComponentResilience>,
  queueRows: ResilienceQueueRow[],
  backpressureRows: ResilienceBackpressureRow[],
  capabilityRows: ResilienceCapabilityRow[]
): ResilienceSummary => {
  const unavailableComponentCount = components.filter((component) => {
    const raw = rawComponents[component.component]
    return raw?.available === false || (!component.snapshot && Boolean(component.error))
  }).length
  const warningBackpressureCount = backpressureRows.filter((row) => row.severity === 'warning').length
  const criticalBackpressureCount = backpressureRows.filter((row) => row.severity === 'critical').length
  const maxBackpressureUtilization = Math.max(0, ...backpressureRows.map((row) => row.utilization))
  return {
    ...EMPTY_RESILIENCE_SUMMARY,
    ...rawSummary,
    component_count: numberFrom(rawSummary?.component_count, components.length),
    unavailable_component_count: numberFrom(rawSummary?.unavailable_component_count, unavailableComponentCount),
    not_ready_component_count: numberFrom(
      rawSummary?.not_ready_component_count,
      components.filter((component) => component.snapshot && !component.snapshot.summary?.ready).length
    ),
    queue_count: numberFrom(rawSummary?.queue_count, queueRows.length),
    warning_queue_count: numberFrom(rawSummary?.warning_queue_count, queueRows.filter((row) => row.severity === 'warning').length),
    critical_queue_count: numberFrom(rawSummary?.critical_queue_count, queueRows.filter((row) => row.severity === 'critical').length),
    max_queue_utilization: numberFrom(rawSummary?.max_queue_utilization, Math.max(0, ...queueRows.map((row) => row.utilization))),
    backpressure_count: numberFrom(rawSummary?.backpressure_count, backpressureRows.length),
    warning_backpressure_count: numberFrom(rawSummary?.warning_backpressure_count, warningBackpressureCount),
    critical_backpressure_count: numberFrom(rawSummary?.critical_backpressure_count, criticalBackpressureCount),
    max_backpressure_utilization: numberFrom(rawSummary?.max_backpressure_utilization, maxBackpressureUtilization),
    degraded_capability_count: numberFrom(rawSummary?.degraded_capability_count, capabilityRows.filter((row) => row.degraded).length)
  }
}

export const normalizeSystemGovernanceResilience = (
  raw: RawSystemGovernanceResilienceResponse = {}
): GovernanceResilienceResponse => {
  const components = normalizeResilienceComponents(raw.components)
  const signals = normalizeSignals(raw.signals || [])
  const queueRows = normalizeResilienceQueueRows(raw.queue_rows, components.list)
  const backpressureRows = normalizeResilienceBackpressureRows(raw.backpressure_rows, components.list)
  const capabilityRows = normalizeResilienceCapabilityRows(raw.capability_rows, components.list)
  return {
    generated_at: raw.generated_at,
    window: raw.window,
    metrics: raw.metrics,
    components: components.list,
    raw_components: components.raw,
    summary: normalizeResilienceSummary(raw.summary, components.list, components.raw, queueRows, backpressureRows, capabilityRows),
    queue_rows: queueRows,
    backpressure_rows: backpressureRows,
    capability_rows: capabilityRows,
    signals,
    metric_evidence: dedupeMetricEvidence([
      ...normalizeMetricEvidence(raw.metric_evidence),
      ...signals.flatMap((signal) => signal.metric_evidence || []),
      ...queueRows.flatMap((row) => row.metric_evidence || []),
      ...backpressureRows.flatMap((row) => row.metric_evidence || [])
    ])
  }
}
