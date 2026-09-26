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

export interface GovernanceActionsResponse {
  actions: ActionDescriptor[]
}

export interface ActionRunRequest {
  request_id?: string
  input?: Record<string, unknown>
  confirm?: boolean
}

export interface ActionRunResponse {
  request_id?: string
  action_id: string
  status: string
  started_at?: string
  finished_at?: string
  result?: Record<string, unknown>
  message?: string
}

export interface PendingReplayAudit {
  request_id: string
  actor_user_id: string
  store: string
  input: Record<string, unknown>
  started_at: string
  updated_at: string
}

export interface PendingReplayAuditPage {
  items: PendingReplayAudit[]
  next_cursor?: string
}

export interface PendingReplayAuditQuery {
  cursor?: string
  limit?: number
}

export interface DeliveryReplayReviewTarget {
  dead_letter_id: number
  event_id?: string
  event_type?: string
  delivery_attempts?: number
  disposition: string
  linked_to_request: boolean
}

export interface DeliveryResolutionRequest {
  request_id: string
  original_replay_request_id: string
  dead_letter_id: number
  event_id: string
  expected_delivery_attempts: number
  reason: string
  confirm: true
}

export interface DeliveryReplayReview {
  request_id: string
  actor_user_id: string
  status: string
  targets_readable: boolean
  targets: DeliveryReplayReviewTarget[]
  started_at: string
  updated_at: string
}

export interface DeliveryReplayReviewPage {
  items: DeliveryReplayReview[]
  next_cursor?: string
}

export interface DeliveryReplayReviewQuery {
  cursor?: string
  limit?: number
}

export interface ReminderReview {
  delivery_id: number
  task_id: string
  opening_event_id: string
  schedule_revision: number
  user_id: string
  state: 'sending' | 'manual_required'
  external_call_started_at?: string
  resolution_code?: string
  updated_at: string
}

export interface ReminderReviewPage {
  items: ReminderReview[]
  next_cursor?: string
}

export interface ReminderReviewQuery {
  cursor?: string
  limit?: number
}
