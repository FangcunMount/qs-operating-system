import type { AssessmentModelStatus } from '@/models/assessmentModel'

export interface PersonalityPublishActions {
  canValidate: boolean
  canPreview: boolean
  canPublish: boolean
  canUnpublish: boolean
  canShowQRCode: boolean
}

export const getPersonalityPublishActions = (
  status: AssessmentModelStatus
): PersonalityPublishActions => ({
  canValidate: status !== 'archived',
  canPreview: status !== 'archived',
  canPublish: status === 'draft' || status === 'published',
  canUnpublish: status === 'published',
  canShowQRCode: status === 'published'
})
