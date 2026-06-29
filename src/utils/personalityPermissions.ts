import type { AssessmentModelStatus } from '@/models/assessmentModel'

export interface PersonalityPermissionState {
  status: AssessmentModelStatus
}

export const canEditPersonalityModel = (state: PersonalityPermissionState) =>
  state.status !== 'archived'

export const canPublishPersonalityModel = (state: PersonalityPermissionState) =>
  state.status === 'draft' || state.status === 'published'

export const canUnpublishPersonalityModel = (state: PersonalityPermissionState) =>
  state.status === 'published'

export const canArchivePersonalityModel = (state: PersonalityPermissionState) =>
  state.status !== 'archived'

export const isPersonalityReadonly = (state: PersonalityPermissionState) =>
  state.status === 'archived'

export const needsRepublishHint = (state: PersonalityPermissionState) =>
  state.status === 'published'
