import { internalV2Get, internalV2PostOnce } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'
import type { EvaluationRelease } from './evaluationTypes'
import type { RegisteredManifest } from './types'

export interface PublicationSelector {
  audience: 'participant'
  model_kind: 'scale'
  decision_kind: 'score_range'
  model_code?: string
  model_version?: string
}
export interface PublicationProof {
  schema_version: 'qs-ai-publication/v1'
  publication: {
    publication_id: string
    audit: { actor: string; reason: string; at: string }
    evidence: {
      run_id: string
      run_version: number
      profile: { profile_id: string; version: string; fingerprint: string; definition_json: string }
      manifest: RegisteredManifest
      release: EvaluationRelease
      evaluated_manifest_fingerprint: string
      final_review: { actor: string; reason: string; finalized_at: string; passed: boolean }
    }
  }
}
export interface PublicationState {
  selector: PublicationSelector
  version: number
  active_publication_id: string
  publication?: PublicationProof
  changed_at: string
}
export type PublicationAction = 'publish' | 'rollback' | 'disable'
export interface PublicationExpectation {
  selector: PublicationSelector
  version: number
  active_publication_id: string
}
export interface PublicationCommand {
  command_id: string
  expected: PublicationExpectation
  reason: string
  confirm: true
}
export interface PublishConfiguration extends PublicationCommand {
  run_id: string
  run_version: number
  release_fingerprint: string
}
export interface RollbackPublication extends PublicationCommand {
  target_publication_id: string
}
export interface PublicationReceipt {
  command_id: string
  previous: PublicationState
  current: PublicationState
  action: PublicationAction
  actor: string
  reason: string
  changed_at: string
}
export interface PublicationHistoryEntry {
  version: number
  command_id: string
  action: PublicationAction
  actor: string
  reason: string
  changed_at: string
  previous_publication_id: string | null
  publication_id: string | null
  run_id: string | null
  run_version: number | null
  profile_id: string | null
  profile_version: string | null
}
export interface PublicationHistoryPage {
  schema_version: 'qs-ai-publication-history/v1'
  selector: PublicationSelector
  entries: PublicationHistoryEntry[]
  next_before_version: number
}
type Result<T> = Promise<[unknown, QSResponse<T> | undefined]>
const BASE = '/interpretation/ai-workflow/publications'
export const getPublication = (selector: PublicationSelector): Result<PublicationState> =>
  internalV2Get<PublicationState>(BASE, selector)
export const listPublicationHistory = (
  selector: PublicationSelector,
  beforeVersion = 0
): Result<PublicationHistoryPage> =>
  internalV2Get<PublicationHistoryPage>(`${BASE}/history`, {
    ...selector,
    limit: 20,
    before_version: beforeVersion
  })
export const getPublicationHistory = (
  selector: PublicationSelector,
  version: number
): Result<PublicationReceipt> =>
  internalV2Get<PublicationReceipt>(`${BASE}/history/${encodeURIComponent(String(version))}`, selector)
export const getPublicationReceipt = (id: string): Result<PublicationReceipt> =>
  internalV2Get<PublicationReceipt>(`${BASE}/commands/${encodeURIComponent(id)}`)
export const publishConfiguration = (command: PublishConfiguration): Result<PublicationReceipt> =>
  internalV2PostOnce<PublicationReceipt>(`${BASE}/publish`, command)
export const rollbackPublication = (command: RollbackPublication): Result<PublicationReceipt> =>
  internalV2PostOnce<PublicationReceipt>(`${BASE}/rollback`, command)
export const disablePublication = (command: PublicationCommand): Result<PublicationReceipt> =>
  internalV2PostOnce<PublicationReceipt>(`${BASE}/disable`, command)
