import type { AIEvaluationCandidateEvidenceV2, AIEvaluationRunV2 } from './types'
import {
  normalizeAIEvaluationCandidateEvidenceV2,
  normalizeAIEvaluationRunV2
} from './normalization'

describe('AI governance v2 response normalization', () => {
  it('turns nil Run slices and nested evidence slices into empty arrays', () => {
    const raw = {
      slots: [{
        case_id: 'PROMPT-EVAL-001',
        slot_ordinal: 1,
        status: 'accepted',
        generation_execution_ids: null,
        candidate: {
          candidate_id: 'candidate:1',
          semantic_execution_ids: null,
          assertions: null
        }
      }],
      generation_executions: [{
        execution_id: 'generation:1',
        failure: { evidence_refs: null },
        semantic_result: { decisions: null }
      }],
      semantic_executions: null,
      human_reviews: null,
      result_unknown_resolutions: null,
      gate: {
        reasons: [{ gate: 'G1', evidence_refs: null }]
      }
    } as unknown as AIEvaluationRunV2

    const normalized = normalizeAIEvaluationRunV2(raw)

    expect(normalized.human_reviews).toEqual([])
    expect(normalized.semantic_executions).toEqual([])
    expect(normalized.result_unknown_resolutions).toEqual([])
    expect(normalized.slots[0].generation_execution_ids).toEqual([])
    expect(normalized.slots[0].candidate?.semantic_execution_ids).toEqual([])
    expect(normalized.slots[0].candidate?.assertions).toEqual([])
    expect(normalized.generation_executions[0].failure?.evidence_refs).toEqual([])
    expect(normalized.generation_executions[0].semantic_result?.decisions).toEqual([])
    expect(normalized.gate?.reasons[0].evidence_refs).toEqual([])
  })

  it('keeps a Candidate detail renderable before reviews and semantic execution exist', () => {
    const raw = {
      candidate: { semantic_execution_ids: null, assertions: null },
      accepted_generation_execution: { failure: { evidence_refs: null } },
      accepted_semantic_execution: undefined,
      human_reviews: null
    } as unknown as AIEvaluationCandidateEvidenceV2

    const normalized = normalizeAIEvaluationCandidateEvidenceV2(raw)

    expect(normalized.human_reviews).toEqual([])
    expect(normalized.candidate.semantic_execution_ids).toEqual([])
    expect(normalized.candidate.assertions).toEqual([])
    expect(normalized.accepted_generation_execution.failure?.evidence_refs).toEqual([])
  })
})
