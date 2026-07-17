import { get, post } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface AssessmentRelease {
  model_code: string
  model_status: 'draft' | 'published' | 'archived' | string
  questionnaire_code: string
  questionnaire_version: string
  questionnaire_status: 'draft' | 'published' | 'archived' | string
  published_at?: string
  archived_at?: string
}

export interface AssessmentReleaseVersion {
  model_version: string
  questionnaire_code: string
  questionnaire_version: string
  release_status: 'active' | 'archived' | string
  published_at?: string
  archived_at?: string
  current: boolean
}

/** The sole public lifecycle API for a questionnaire-backed assessment. */
export function publishAssessmentRelease(
  modelCode: string
): Promise<[any, QSResponse<AssessmentRelease> | undefined]> {
  return post<AssessmentRelease>(`/assessment-releases/${modelCode}/publish`, undefined)
}

export function archiveAssessmentRelease(
  modelCode: string
): Promise<[any, QSResponse<AssessmentRelease> | undefined]> {
  return post<AssessmentRelease>(`/assessment-releases/${modelCode}/archive`, undefined)
}

export function unpublishAssessmentRelease(
  modelCode: string
): Promise<[any, QSResponse<AssessmentRelease> | undefined]> {
  return post<AssessmentRelease>(`/assessment-releases/${modelCode}/unpublish`, undefined)
}

export function listAssessmentReleaseVersions(
  modelCode: string
): Promise<[any, QSResponse<AssessmentReleaseVersion[]> | undefined]> {
  return get<AssessmentReleaseVersion[]>(`/assessment-releases/${modelCode}/versions`)
}

export const assessmentReleaseApi = {
  publishAssessmentRelease,
  unpublishAssessmentRelease,
  listAssessmentReleaseVersions,
  archiveAssessmentRelease
}
