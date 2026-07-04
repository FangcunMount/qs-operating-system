import type { IEventStatusResponse } from '../eventGovernance'
import type {
  GovernanceMetricsMeta,
  MetricEvidence,
  RawSystemGovernanceSignal,
  Signal,
  SignalSeverity
} from './types.shared'

export interface EventTypeStatus {
  store?: string
  event_type: string
  pending_count: number
  failed_count: number
  oldest_age_seconds: number
  degraded: boolean
  reason?: string
}

export interface EventDrainSummary {
  outbox_count: number
  degraded_reader_count: number
  pending_count: number
  failed_count: number
  oldest_pending_age_seconds: number
  stale_event_type_count: number
  reader_error_count: number
}

export interface EventOutboxRow {
  name: string
  store: string
  degraded: boolean
  pending_count: number
  failed_count: number
  publishing_count: number
  oldest_pending_age_seconds: number
  severity: SignalSeverity | string
  reason?: string
  metric_evidence?: MetricEvidence[]
}

export interface EventTypeRow extends EventTypeStatus {
  severity: SignalSeverity | string
  metric_evidence?: MetricEvidence[]
}

export interface GovernanceEventsResponse extends IEventStatusResponse {
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: Signal[]
  snapshot?: IEventStatusResponse
  event_types?: EventTypeStatus[]
  summary: EventDrainSummary
  outbox_rows: EventOutboxRow[]
  event_type_rows: EventTypeRow[]
}

export interface RawSystemGovernanceEventTypeBucket {
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

export interface RawSystemGovernanceEventTypeGroup {
  store?: string
  buckets?: RawSystemGovernanceEventTypeBucket[]
  error?: string
}

export interface RawSystemGovernanceEventsResponse {
  generated_at?: string
  window?: string
  metrics?: GovernanceMetricsMeta
  signals?: RawSystemGovernanceSignal[]
  snapshot?: IEventStatusResponse
  catalog?: IEventStatusResponse['catalog']
  outboxes?: IEventStatusResponse['outboxes']
  event_types?: RawSystemGovernanceEventTypeGroup[] | EventTypeStatus[]
  summary?: Partial<EventDrainSummary>
  outbox_rows?: EventOutboxRow[]
  event_type_rows?: EventTypeRow[]
}
