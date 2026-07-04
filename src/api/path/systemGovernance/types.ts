import type { ICacheGovernanceFamilyStatus, ICacheGovernanceStatusResponse } from '../cacheGovernance'
import type { IEventStatusResponse } from '../eventGovernance'
import type { IResilienceComponentStatus, IResilienceRuntimeSnapshot } from '../resilienceGovernance'

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

export type RawSystemGovernanceEvidence = string | string[] | Record<string, unknown> | null | undefined

export type RawSystemGovernanceSignal = Omit<Signal, 'evidence' | 'metric_evidence'> & {
  evidence?: RawSystemGovernanceEvidence
  metric_evidence?: MetricEvidence[]
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
