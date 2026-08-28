export type AIEvaluationStatus = 'collecting' | 'awaiting_review' | 'approved' | 'rejected' | 'canceled'
export type AIReviewRole = 'assessment_semantics' | 'safety_product'
export type AIReviewDecision = 'approve' | 'reject'
export type AIProfileStatus = 'draft' | 'published' | 'disabled'

export interface AIPromptRef {
  template_id: string
  version: string
  fingerprint: string
  git_blob_sha: string
}

export interface AIProfileRef {
  id: string
  version: string
  fingerprint: string
}

export interface AISchemaRef {
  version: string
  fingerprint: string
}

export interface AIProviderSpec {
  route: string
  route_revision: string
  resolved_provider: string
  resolved_model: string
  fingerprint: string
}

export interface AIDecodingSpec {
  max_output_tokens: number
  temperature?: number
  top_p?: number
  seed?: number
}

export interface AISemanticEvaluatorSpec {
  version: string
  prompt: AIPromptRef
  output_schema: AISchemaRef
  provider: AIProviderSpec
  decoding: AIDecodingSpec
}

export interface AIEvaluationRelease {
  suite: {
    id: string
    version: string
    fingerprint: string
    git_blob_sha: string
  }
  prompt: AIPromptRef
  profile: AIProfileRef
  input_schema: AISchemaRef
  output_schema: AISchemaRef
  provider: AIProviderSpec
  decoding: AIDecodingSpec
  semantic_evaluator: AISemanticEvaluatorSpec
  generation_case_ids: string[]
  preflight_case_id: string
  preflight_rejection_reason: string
  repetitions_per_case: number
}

export interface AIReviewProgress {
  planned_generation_attempts: number
  generation_attempts: number
  failed_attempts: number
  pending_generation_attempts: number
  required_reviews: number
  recorded_reviews: number
  missing_reviews: number
  fully_reviewed_attempts: number
  rejected_reviews: number
  all_required_reviews_recorded: boolean
}

export interface AIAttemptFailure {
  stage: string
  code: string
  safe_message: string
  retryable: boolean
  result_unknown: boolean
}

export interface AISemanticScores {
  faithfulness: number
  cross_dimension_quality: number
  suggestion_actionability: number
  audience_clarity: number
  concision: number
}

export interface AIHumanReview {
  role: AIReviewRole
  reviewer: string
  decision: AIReviewDecision
  reviewed_at: string
  reason: string
}

export interface AIReviewAttemptSummary {
  case_id: string
  attempt: number
  output_fingerprint?: string
  failure?: AIAttemptFailure
  semantic_scores?: AISemanticScores
  reviews: AIHumanReview[]
  missing_roles: AIReviewRole[]
}

export interface AIProviderReceipt {
  invocation_id: string
  request_id?: string
  provider: string
  model: string
  input_tokens: number
  output_tokens: number
  latency_ms: number
}

export interface AIAssertionReceipt {
  type: string
  scope: string
  ordinal: number
  hard: boolean
  evaluator: string
  status: string
  detail?: string
}

export interface AISemanticReceipt {
  evaluator_version: string
  provider_receipt: AIProviderReceipt
  scores: AISemanticScores
  rationale: string
}

export interface AIReviewAttempt extends AIReviewAttemptSummary {
  assessment_input: unknown
  raw_provider_output: string
  normalized_output?: unknown
  provider_receipt?: AIProviderReceipt
  assertions: AIAssertionReceipt[]
  semantic?: AISemanticReceipt
}

export interface AIGateResult {
  passed: boolean
  reasons: Array<{
    code: string
    case_id?: string
    attempt?: number
    detail: string
  }>
  metrics: {
    generation_attempts: number
    case_assertion_passes: number
    faithfulness_average: number
    cross_dimension_average: number
    actionability_average: number
    audience_clarity_average: number
    concision_average: number
    human_reviews: number
  }
}

export interface AIEvaluationRunSummary {
  run_id: string
  version: number
  status: AIEvaluationStatus
  requested_org_id: number
  requested_by: string
  request_reason: string
  created_at: string
  release: AIEvaluationRelease
  progress: AIReviewProgress
  gate?: AIGateResult
  can_review: boolean
  can_finalize: boolean
  can_cancel: boolean
  recovery_max_provider_invocations: number
}

export interface AIEvaluationRun extends AIEvaluationRunSummary {
  execution?: {
    case_id: string
    attempt: number
    phase: string
    claimed_at: string
    lease_expires_at: string
    dispatch_started_at?: string
  }
  recoveries: Array<{
    id: string
    case_id: string
    attempt: number
    actor: string
    reason: string
    requested_at: string
  }>
  attempts: AIReviewAttemptSummary[]
  finalized?: { at: string; actor: string; reason: string }
  canceled?: { at: string; actor: string; reason: string }
}

export interface AIEvaluationRunPage {
  items: AIEvaluationRunSummary[]
  next_cursor?: string
}

export interface AIEvaluationListQuery {
  status?: AIEvaluationStatus
  cursor?: string
  limit?: number
}

export interface AIEvaluationCapacity {
  organization_id: number
  budget_day: string
  max_active_runs_per_org: number
  provider_invocations_per_start: number
  daily_provider_invocation_limit: number
  reserved_provider_invocations: number
  remaining_provider_invocations: number
  available_full_run_starts: number
  over_limit: boolean
  reservations: Array<{
    run_id: string
    requested_by: string
    provider_invocations: number
    reserved_at: string
  }>
}

export interface AIParticipantCapacity {
  organization_id: number
  budget_day: string
  provider_invocations_per_generation: number
  daily_provider_invocation_limit_per_org: number
  daily_provider_invocation_limit_per_user: number
  daily_provider_invocation_limit_per_assessment: number
  max_active_provider_executions_per_org: number
  max_active_provider_executions_per_user: number
  max_active_provider_executions_per_assessment: number
  reserved_provider_invocations: number
  redacted_provider_invocations: number
  remaining_org_provider_invocations: number
  over_org_limit: boolean
  reservations: Array<{
    reservation_id: string
    generation_id: string
    attempt: number
    origin: string
    user_id: string
    assessment_id: string
    provider_invocations: number
    reserved_at: string
  }>
  active_provider_executions: number
  remaining_org_active_provider_executions: number
  over_org_active_limit: boolean
  active_reservations: Array<{
    generation_id: string
    run_id: string
    user_id: string
    assessment_id: string
    acquired_at: string
  }>
}

export interface AIProfileDefinition {
  schema_version: string
  profile_id: string
  version: string
  selector: {
    audience: 'participant'
    model_kind: 'scale'
    decision_kind: 'score_range'
    model_code: string | null
    model_version: string | null
  }
  eligibility: {
    min_eligible_dimensions: number
    eligible_dimension_codes: string[]
    excluded_dimension_codes: string[]
    max_input_dimensions: number
    on_dimension_overflow: 'reject'
  }
  input_policy: {
    context_scope: 'current_assessment_only'
    include_norm_context: boolean
    include_model_result: boolean
    allowed_focus_areas: string[]
    hierarchy_policy: {
      allow_parent_child_in_same_insight: boolean
    }
  }
  insight_policy: {
    allowed_kinds: Array<
      | 'reinforcing_pattern'
      | 'contrasting_pattern'
      | 'combined_strength'
      | 'combined_attention'
      | 'context_dependent_pattern'
    >
    min_items: number
    max_items: number
    min_dimension_refs_per_item: number
    max_dimension_refs_per_item: number
    allow_causal_claims: false
  }
  suggestion_policy: {
    allowed_origins: Array<'standard_derived' | 'generated_low_risk'>
    allowed_categories: string[]
    min_items: number
    max_items: number
    max_actions_per_item: number
    require_evidence_refs: true
    require_standard_refs_for_standard_derived: true
  }
  safety_policy: {
    policy_version: string
    forbidden_claims: string[]
    disclaimer_version: string
  }
  generation_policy: {
    prompt_template_id: string
    prompt_version: string
    provider_route: string
    input_schema_version: string
    output_schema_version: string
    max_output_characters: number
  }
}

export interface AIProfile {
  id: string
  definition: AIProfileDefinition
  fingerprint: string
  status: AIProfileStatus
  created_at: string
  created_by?: string
  created_reason?: string
  updated_at: string
  published_at?: string
  published_by?: string
  published_reason?: string
  published_evidence_run_id?: string
  disabled_at?: string
  disabled_by?: string
  disabled_reason?: string
}

export interface AIProfilePage {
  items: AIProfile[]
  next_cursor?: string
}

export interface AIProfileListQuery {
  status?: AIProfileStatus
  cursor?: string
  limit?: number
}

export interface AIParticipantRetryRequest {
  expected_attempt: number
  request_id: string
  confirm: boolean
  expected_provider_invocations: number
  accept_result_unknown_risk: boolean
  reason: string
}

export interface AIParticipantRetryResult {
  generation_id: string
  failed_run_id: string
  expected_attempt: number
  next_attempt: number
  origin: string
  request_id: string
  authorized_at: string
  accepted_result_unknown_risk: boolean
  created: boolean
}
