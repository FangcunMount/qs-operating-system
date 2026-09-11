import type { IAssessmentEntry } from '@/api/path/clinician'

export const isEntryPermanentlyInvalidated = (entry: IAssessmentEntry): boolean =>
  Boolean(entry.permanently_invalidated || entry.invalidated_at)

export const entryInvalidationLabel = (entry: IAssessmentEntry): string =>
  entry.invalidation_reason === 'clinician_store_transfer' ? '因医生调店永久失效' : '入口永久失效'
