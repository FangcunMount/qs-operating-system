import type { AIEvaluationRunV2 } from '@/api/path/aiGovernance'
import { buildReviewQueue } from './HumanReviewWorkspace'

const makeRun = (runID: string): AIEvaluationRunV2 => ({
  run_id: runID,
  status: 'awaiting_review',
  slots: [{
    case_id: 'PROMPT-EVAL-001',
    slot_ordinal: 1,
    status: 'accepted',
    generation_execution_ids: ['generation:1'],
    candidate: {
      candidate_id: `candidate:${runID}`,
      generation_execution_id: 'generation:1',
      normalized_output_fingerprint: 'sha256:output',
      accepted_at: '2026-08-31T10:00:00Z',
      semantic_execution_ids: ['semantic:1'],
      accepted_semantic_execution_id: 'semantic:1',
      review_ready: true,
      assertions: []
    }
  }],
  human_reviews: []
} as AIEvaluationRunV2)

describe('AI explanation v2 human review queue', () => {
  it('derives missing roles from review-ready Candidates', () => {
    const run = makeRun('701')
    run.human_reviews.push({
      candidate_id: 'candidate:701',
      role: 'assessment_semantics',
      reviewer: 'user:1',
      decision: 'approve',
      reviewed_at: '2026-08-31T10:01:00Z',
      reason: 'facts match'
    })

    expect(buildReviewQueue([run])).toEqual([expect.objectContaining({
      runID: '701',
      candidate_id: 'candidate:701',
      caseID: 'PROMPT-EVAL-001',
      missing_roles: ['safety_product']
    })])
  })

  it('keeps Candidates from different runs distinguishable', () => {
    expect(buildReviewQueue([makeRun('701'), makeRun('702')]).map((item) => item.runID))
      .toEqual(['701', '702'])
  })

  it('excludes non-review-ready Candidates and non-awaiting-review Runs', () => {
    const run = makeRun('703')
    run.status = 'blocked'
    expect(buildReviewQueue([run])).toEqual([])

    run.status = 'awaiting_review'
    if (run.slots[0].candidate) run.slots[0].candidate.review_ready = false
    expect(buildReviewQueue([run])).toEqual([])
  })
})
