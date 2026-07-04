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
