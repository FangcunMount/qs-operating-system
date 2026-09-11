import { entryInvalidationLabel, isEntryPermanentlyInvalidated } from './entryInvalidation'
import type { IAssessmentEntry } from '@/api/path/clinician'

const entry: IAssessmentEntry = {
  id: '1', org_id: '7', clinician_id: '2', token: 'token', target_type: 'scale', target_code: 'scale', is_active: false
}
it('distinguishes ordinary deactivation from permanent invalidation', () => {
  expect(isEntryPermanentlyInvalidated(entry)).toBe(false)
  expect(isEntryPermanentlyInvalidated({ ...entry, permanently_invalidated: true })).toBe(true)
  expect(isEntryPermanentlyInvalidated({ ...entry, invalidated_at: '2026-09-11T10:00:00Z', is_active: true })).toBe(true)
  expect(entryInvalidationLabel({ ...entry, invalidation_reason: 'clinician_store_transfer' })).toBe('因医生调店永久失效')
})
