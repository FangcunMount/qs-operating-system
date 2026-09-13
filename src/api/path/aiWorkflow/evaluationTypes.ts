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
  can_reopen_review?: boolean
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

export type NativeReviewRole = 'assessment_semantics' | 'safety_product'
export interface NativeSemanticReview {
  policy_version: 'semantic-contradiction-dual-review/v1'
  execution_id: string
  output_fingerprint: string
  assertion_ordinal: number
  original_detail: string
  candidate_excerpt: string
  reason: string
}
export interface NativeReviewItem {
  candidate_id: string
  decision: 'approve' | 'reject'
  reason: string
  semantic_review?: NativeSemanticReview
}
export interface NativeReviewCommand {
  expected_version: number
  role: NativeReviewRole
  reviews: NativeReviewItem[]
}
export interface NativeReviewRecord extends NativeReviewItem {
  role: NativeReviewRole
  reviewer: string
  reviewed_at: string
}

export type NativeGateID = 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
export interface NativeGateResult {
  evaluated_at: string
  gate_passes: Record<NativeGateID, boolean>
  metrics: Array<{ name: string; numerator: number; denominator: number; value: number; threshold: number }>
  reasons: Array<{ gate: NativeGateID; code: string; evidence_refs: string[] }>
  semantic_adjudications: unknown[]
}
export interface NativeGatePreview {
  run_id: string
  version: number
  release_fingerprint: string
  gate_result: NativeGateResult & { schema_version: 'qs-ai-evaluation-gate-preview/v1' }
}
export interface NativeFinalizeCommand {
  expected_version: number
  expected_passed: boolean
  reason: string
  confirm: true
}
export interface NativeFinalization {
  schema_version: 'qs-ai-evaluation-finalization/v1'
  run_id: string
  source_version: number
  version: number
  release_fingerprint: string
  actor: string
  reason: string
  finalized_at: string
  passed: boolean
  status: 'approved' | 'rejected'
  gate_result: NativeGateResult
}

export interface NativeReopenCommand {
  expected_version: number
  reason: string
  confirm: true
}
export interface NativeReviewReopening {
  source_version: number
  version: number
  transition_count: number
  previous_finalization: NativeFinalization
  previous_reviews: NativeReviewRecord[]
  candidate_ids: string[]
  actor: string
  reason: string
  reopened_at: string
}

export type NativeResolutionDecision = 'cancel_run' | 'authorize_replacement'
export interface NativeUnknownExecution {
  execution_id: string
  invocation_id: string
  kind: 'generation' | 'semantic'
  case_id: string
  slot_ordinal: number
  candidate_id: string
  execution_ordinal: number
  started_at: string
  finished_at: string
  provider_call_count: number
  failure_stage: string
  failure_code: string
  target_execution_count: number
  target_execution_limit: number
  stage_execution_count: number
  stage_execution_limit: number
  replacement_allowed: boolean
}
export interface NativeUnknownIndex {
  run_id: string
  version: number
  release_fingerprint: string
  status: EvaluationStatus
  unresolved_result_unknown_count: number
  can_resolve: boolean
  executions: NativeUnknownExecution[]
}
export interface NativeResolutionCommand {
  expected_version: number
  execution_id: string
  decision: NativeResolutionDecision
  reason: string
  confirm: true
  acknowledged_duplicate_call_and_cost_risk: true
}
