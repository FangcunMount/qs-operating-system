import type {
  AIEvaluationCandidateEvidenceV2,
  AIEvaluationCandidateV2,
  AIEvaluationExecutionV2,
  AIEvaluationRunV2,
  AIEvaluationSlotV2
} from './types'

const list = <T>(value: T[] | null | undefined): T[] => value || []

const normalizeExecution = <T extends AIEvaluationExecutionV2>(execution: T): T => ({
  ...execution,
  failure: execution.failure
    ? { ...execution.failure, evidence_refs: list(execution.failure.evidence_refs) }
    : undefined,
  semantic_result: execution.semantic_result
    ? { ...execution.semantic_result, decisions: list(execution.semantic_result.decisions) }
    : undefined
}) as T

const normalizeCandidate = (candidate: AIEvaluationCandidateV2): AIEvaluationCandidateV2 => ({
  ...candidate,
  semantic_execution_ids: list(candidate.semantic_execution_ids),
  assertions: list(candidate.assertions)
})

const normalizeSlot = (slot: AIEvaluationSlotV2): AIEvaluationSlotV2 => ({
  ...slot,
  generation_execution_ids: list(slot.generation_execution_ids),
  candidate: slot.candidate ? normalizeCandidate(slot.candidate) : undefined
})

// Go nil slices are encoded as JSON null. The v2 read model treats collection
// fields as empty arrays so an in-progress Run remains renderable.
export const normalizeAIEvaluationRunV2 = (run: AIEvaluationRunV2): AIEvaluationRunV2 => ({
  ...run,
  slots: list(run.slots).map(normalizeSlot),
  generation_executions: list(run.generation_executions).map(normalizeExecution),
  semantic_executions: list(run.semantic_executions).map(normalizeExecution),
  human_reviews: list(run.human_reviews),
  result_unknown_resolutions: list(run.result_unknown_resolutions),
  gate: run.gate
    ? {
      ...run.gate,
      reasons: list(run.gate.reasons).map((reason) => ({
        ...reason,
        evidence_refs: list(reason.evidence_refs)
      }))
    }
    : undefined
})

export const normalizeAIEvaluationCandidateEvidenceV2 = (
  evidence: AIEvaluationCandidateEvidenceV2
): AIEvaluationCandidateEvidenceV2 => ({
  ...evidence,
  candidate: normalizeCandidate(evidence.candidate),
  accepted_generation_execution: normalizeExecution(evidence.accepted_generation_execution),
  accepted_semantic_execution: evidence.accepted_semantic_execution
    ? normalizeExecution(evidence.accepted_semantic_execution)
    : undefined,
  human_reviews: list(evidence.human_reviews)
})
