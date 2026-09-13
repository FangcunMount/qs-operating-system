import { internalV2Get } from '@/api/qsServer'
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
