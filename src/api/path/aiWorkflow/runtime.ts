import { internalV2Get } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'
export interface RuntimeSummary {
  session_id: string
  request_id: string
  run_id: string
  status: string
  version: number
  workflow_version: string
  failure_code: string
  model_call_status: string | null
  invocation_id: string | null
  publication_id: string | null
  publication_sha256: string | null
  created_at: string | null
  updated_at: string | null
}
export interface RuntimeRequest {
  request_id: string
  session_id: string
  testee_id: string
  assessment_ids: string[]
  status: string
  version: number
  created_at: string | null
  updated_at: string | null
  commands_pending: number
  command_attempts: number
  ai?: RuntimeSummary
}
export interface RuntimeQuery {
  assessment_id?: string
  request_id?: string
  testee_id?: string
  status?: string
  history?: boolean
  cursor?: string
  limit?: number
}
export interface RuntimePage {
  items: RuntimeRequest[]
  next_cursor: string
  observed_at: string
  partial: boolean
  ai_availability: string
  ai_observed_at?: string
}
export interface RuntimeAttempt {
  run_id: string
  session_version: number
  status: string
  job_status: string | null
  job_attempt: number | null
  available_at: string | null
  lease_until: string | null
  invocation_id: string | null
  model_call_status: string | null
  model_call_created_at: string | null
  model_call_time_basis?: 'utc' | 'legacy_timezone_unrecorded' | 'not_recorded'
  model_call_created_at_recorded?: string | null
}
export interface RuntimeDelivery {
  event_id: string
  version: number
  delivered: boolean
  attempts: number
  created_at: string
  delivered_at: string | null
  available_at: string
}
export interface RuntimeDetail {
  request: RuntimeRequest
  observed_at: string
  partial: boolean
  ai_availability: string
  ai?: {
    observed_at: string
    execution: RuntimeSummary
    attempts: RuntimeAttempt[]
    deliveries: RuntimeDelivery[]
    attempts_truncated: boolean
    deliveries_truncated: boolean
    history_complete: boolean
  }
}
type Result<T> = Promise<[unknown, QSResponse<T> | undefined]>
const base = '/interpretation/ai-workflow/runtime'
export const listRuntimeRequests = (query: RuntimeQuery): Result<RuntimePage> =>
  internalV2Get<RuntimePage>(`${base}/requests`, query)
export const getRuntimeRequest = (id: string): Result<RuntimeDetail> =>
  internalV2Get<RuntimeDetail>(`${base}/requests/${encodeURIComponent(id)}`)

export interface RuntimeTimeline {
  request_id: string
  observed_at: string
  partial: boolean
  history_complete: boolean
  events: {
    id: string
    source: string
    kind: string
    at: string | null
    run_id?: string
    invocation_id?: string
    version?: number
    attempt?: number
  }[]
}
export interface RuntimeHealth {
  observed_at: string
  partial: boolean
  ai_availability: string
  qs?: { pending_commands: number; requests_without_session: number }
  ai?: {
    observed_at: string
    availability: string
    components: Record<string, string>
    backlog: Record<string, number>
  }
}
export const getRuntimeTimeline = (id: string): Result<RuntimeTimeline> =>
  internalV2Get<RuntimeTimeline>(`${base}/requests/${encodeURIComponent(id)}/timeline`)
export const getRuntimeHealth = (): Result<RuntimeHealth> =>
  internalV2Get<RuntimeHealth>(`${base}/health`)
