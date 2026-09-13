import type { FrozenSuiteReference } from './types'

export type EvaluationReference = FrozenSuiteReference
export interface EvaluationRelease {
  suite: EvaluationReference
  prompt: EvaluationReference
  profile: EvaluationReference
  input_schema: EvaluationReference
  output_schema: EvaluationReference
  generation_route: EvaluationReference
  semantic_prompt: EvaluationReference
  semantic_output_schema: EvaluationReference
  semantic_route: EvaluationReference
  execution_policy: EvaluationReference
  gate_policy: EvaluationReference
}
export interface EvaluationSelection {
  suite?: EvaluationReference
  generation_route?: EvaluationReference
  semantic_route?: EvaluationReference
}
export type EvaluationPlanQuery = Required<EvaluationSelection>
export interface EvaluationPlan {
  release: EvaluationRelease
  release_fingerprint: string
  generation_case_count: number
  candidates_per_case: number
  candidate_count: number
  preflight_case_count: number
  max_generation_invocations: number
  max_semantic_invocations: number
  execution_policy_json: string
  gate_policy_json: string
}
export interface EvaluationCreation {
  schema_version: 'qs-ai-evaluation-creation-receipt/v1'
  run_id: string
  release: EvaluationRelease
  release_fingerprint: string
  requested_by: string
  request_reason: string
  created_at: string
}
export type EvaluationStatus =
  | 'requested'
  | 'collecting'
  | 'blocked'
  | 'awaiting_review'
  | 'approved'
  | 'rejected'
  | 'canceled'
export interface NativeEvaluationState {
  run_id: string
  version: number
  status: EvaluationStatus
  unresolved_result_unknown_count: number
  creation?: EvaluationCreation
  resolutions: unknown[]
  reviews: unknown[]
  review_reopenings: unknown[]
  finalization?: unknown
}
export interface NativeEvaluationCreate {
  release: EvaluationRelease
  reason: string
  confirm: true
}
export interface NativeEvaluationStart {
  expected_version: number
  reason: string
  confirm: true
}
export interface NativeCandidateIndex {
  run_id: string
  version: number
  candidates: Array<{ candidate_id: string; case_id: string; slot_ordinal: number }>
}
export interface NativeCandidateEvidence {
  run_id: string
  version: number
  candidate_id: string
  normalized_output: string
  semantic_output: string
  evidence: unknown
}
