import { internalV2Get, internalV2PostOnce } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'
import type { DraftContent, RegisteredManifest } from './types'
import type { EvaluationRelease } from './evaluationTypes'

export interface ModelSelection {
  model_key?: string | null
  catalog_revision?: string | null
  thinking?: 'enabled' | 'disabled' | null
  temperature?: number | null
  top_p?: number | null
  model: string
  max_output_tokens: number
  timeout_milliseconds: number
  reasoning_effort: string
}
export interface ModelCapability {
  model_key: string
  model_id: string
  catalog_revision: string
  provider: string
  purposes: Array<'generation' | 'semantic'>
  available: boolean
  unavailable_reason: string | null
  max_output_tokens: number
  max_timeout_milliseconds: number
  reasoning_efforts: string[]
  thinking_modes: Array<'enabled' | 'disabled'>
  defaults?: Partial<Record<'generation' | 'semantic', Omit<ModelSelection, 'model'>>>
  sampling_parameters: Array<'temperature' | 'top_p'>
}
export interface SolutionModels {
  v2_writes_enabled?: boolean
  catalog?: ModelCapability[]
  models: string[]
  provider: string
  credential_configured: boolean
  endpoint_configured: boolean
  max_output_tokens: { min: number; max: number }
  timeout_milliseconds: { min: number; max: number }
  reasoning_efforts: string[]
  unsupported_fields: string[]
}
export interface SolutionSummary {
  solution_id: string
  title: string
  revision: number
  reason: string
  created_by: string
  updated_at: string
  target_version: string
  source: { publication_id: string | null; run_id: string | null }
  prepared: null | {
    plan: {
      generation_case_count: number
      candidates_per_case: number
      candidate_count: number
      preflight_case_count: number
      max_generation_invocations: number
      max_semantic_invocations: number
    }
    run_id: string
    release: EvaluationRelease
    manifest: RegisteredManifest
    prepared_at: string
    steps: string[]
  }
}
export interface Solution extends SolutionSummary {
  schema_version: 'qs-ai-solution/v1'
  source_release: EvaluationRelease
  draft_id: string
  draft_revision: number
  content: DraftContent
  original_content: DraftContent
  generation: ModelSelection
  semantic: ModelSelection
  original_models: { generation: ModelSelection; semantic: ModelSelection }
  policy: unknown
  source_reviews?: Array<{ role: string; decision: string; reason: string; candidate_id: string }>
  semantic_prompt: string
}
export interface SolutionEdits {
  title: string
  reason: string
  content: DraftContent
  generation: ModelSelection
  semantic: ModelSelection
}
export type SolutionAction = 'create' | 'save' | 'prepare'
export type SolutionCommand = {
  command_id: string
  reason: string
  expected_revision?: number
  title?: string
  publication_id?: string
  source_run_id?: string
} & Partial<SolutionEdits>
type Result<T> = Promise<[unknown, QSResponse<T> | undefined]>
const BASE = '/interpretation/ai-workflow/solutions'
export const listSolutions = (cursor = ''): Result<{ items: SolutionSummary[]; next_cursor: string }> =>
  internalV2Get(BASE, { cursor })
export const getSolutionModels = (): Result<SolutionModels> => internalV2Get(`${BASE}/models`)
export const getSolution = (id: string): Result<Solution> =>
  internalV2Get(`${BASE}/${encodeURIComponent(id)}`)
export const getSolutionReceipt = (id: string): Result<Solution> =>
  internalV2Get(`${BASE}/commands/${encodeURIComponent(id)}`)
export const writeSolution = (
  id: string,
  action: SolutionAction,
  command: SolutionCommand
): Result<Solution> => internalV2PostOnce(`${BASE}/${encodeURIComponent(id)}/${action}`, command)
