import { internalV2Get, internalV2PostOnce } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'

export interface ParticipantCapacityUsage {
  identity: string
  daily_reserved: number
  daily_remaining: number
  active: number
  active_remaining: number
}
export interface ParticipantReservation {
  run_id: string
  session_id: string
  subject_id: string
  assessment_ids: string[]
  budget_day: string
  reserved_at: string
  active: boolean
  acquired_at: string
}
export interface ParticipantCapacity {
  organization_id: number
  budget_day: string
  policy: { daily_org: number; daily_user: number; daily_assessment: number; active_org: number; active_user: number; active_assessment: number }
  organization: ParticipantCapacityUsage
  subject?: ParticipantCapacityUsage
  assessment?: ParticipantCapacityUsage
  daily_reservations: ParticipantReservation[]
  active_reservations: ParticipantReservation[]
  daily_truncated: boolean
  active_truncated: boolean
}
export const getNativeParticipantCapacity = (
  subjectID = '', assessmentID = ''
): Promise<[unknown, QSResponse<ParticipantCapacity> | undefined]> =>
  internalV2Get<ParticipantCapacity>('/interpretation/ai-workflow/participant-capacity', { subject_id: subjectID, assessment_id: assessmentID })

export interface ParticipantExecution {
  organization_id: number
  session_id: string
  request_id: string
  run_id: string
  version: number
  status: string
  subject_id: string
  testee_id: string
  assessment_ids: string[]
  failure_code: string
  model_call_status: string
  invocation_id: string
  source_run_id: string
  can_retry: boolean
  unknown_result_risk: boolean
  retry_provider_invocations: number
}
export interface ParticipantRetryCommand {
  command_id: string
  expected_run_id: string
  expected_version: number
  reason: string
  confirm: true
  expected_provider_invocations: 1
  accept_result_unknown_risk: boolean
}
export interface ParticipantRetryReceipt {
  session_id: string
  run_id: string
  status: string
  version: number
}
export const getParticipantExecution = (sessionID: string): Promise<[unknown, QSResponse<ParticipantExecution> | undefined]> =>
  internalV2Get<ParticipantExecution>(`/interpretation/ai-workflow/participants/${encodeURIComponent(sessionID)}`)
export const retryParticipant = (
  sessionID: string, command: ParticipantRetryCommand
): Promise<[unknown, QSResponse<ParticipantRetryReceipt> | undefined]> =>
  internalV2PostOnce<ParticipantRetryReceipt>(`/interpretation/ai-workflow/participants/${encodeURIComponent(sessionID)}/retry`, command)
export const getParticipantRetryReceipt = (commandID: string): Promise<[unknown, QSResponse<ParticipantRetryReceipt> | undefined]> =>
  internalV2Get<ParticipantRetryReceipt>(`/interpretation/ai-workflow/participants/retry-commands/${encodeURIComponent(commandID)}`)
