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
  disposition: string
  linked_to_request: boolean
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
