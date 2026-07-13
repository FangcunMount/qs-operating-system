import type { AssessmentModelStatus } from '@/models/assessmentModel'

export interface PersonalityPermissionState {
  status: AssessmentModelStatus
}

export const canEditPersonalityModel = (state: PersonalityPermissionState): boolean =>
  state.status !== 'archived'

export const canPublishPersonalityModel = (state: PersonalityPermissionState): boolean =>
  state.status === 'draft' || state.status === 'published'

export const canArchivePersonalityModel = (state: PersonalityPermissionState): boolean =>
  state.status !== 'archived'

export const isPersonalityReadonly = (state: PersonalityPermissionState): boolean =>
  state.status === 'archived'

export const needsRepublishHint = (state: PersonalityPermissionState): boolean =>
  state.status === 'published'
