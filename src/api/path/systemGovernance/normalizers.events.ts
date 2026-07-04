import type { IEventStatusResponse } from '../eventGovernance'
import type {
  EventDrainSummary,
  EventOutboxRow,
  EventTypeRow,
  EventTypeStatus,
  GovernanceEventsResponse,
  RawSystemGovernanceEventTypeBucket,
  RawSystemGovernanceEventTypeGroup,
  RawSystemGovernanceEventsResponse
} from './types.events'
import {
  normalizeMetricEvidence,
  normalizeSignals,
  numberFrom,
  stringFrom
} from './normalizers.shared'

const EMPTY_EVENT_CATALOG: IEventStatusResponse['catalog'] = {
  topic_count: 0,
  event_count: 0,
  best_effort_count: 0,
  durable_outbox_count: 0
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
