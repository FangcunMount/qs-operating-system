import type { AIEvaluationRunV2 } from '@/api/path/aiGovernance'
import {
  buildReviewBatchRequest,
  buildReviewQueue,
  parseReviewBatchPlan,
  upsertReviewBatchDraft
} from './HumanReviewWorkspace'

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

  it('builds one-role batch input and replaces an edited Candidate draft', () => {
    const drafts = upsertReviewBatchDraft([
      { candidate_id: 'candidate:1', caseID: 'PROMPT-EVAL-001', slotOrdinal: 1, decision: 'approve', reason: 'first' }
    ], {
      candidate_id: 'candidate:1', caseID: 'PROMPT-EVAL-001', slotOrdinal: 1, decision: 'reject', reason: 'unsupported'
    })

    expect(buildReviewBatchRequest('assessment_semantics', drafts)).toEqual({
      role: 'assessment_semantics',
      reviews: [{ candidate_id: 'candidate:1', decision: 'reject', reason: 'unsupported' }]
    })
  })

  it('imports a Case and Slot plan by resolving the live Candidate identity', () => {
    const queue = buildReviewQueue([makeRun('704')])

    expect(parseReviewBatchPlan(JSON.stringify([{
      case_id: 'PROMPT-EVAL-001',
      slot: 1,
      decision: 'reject',
      reason: ' unsupported causal claim '
    }]), queue, 'assessment_semantics')).toEqual([{
      candidate_id: 'candidate:704',
      caseID: 'PROMPT-EVAL-001',
      slotOrdinal: 1,
      decision: 'reject',
      reason: 'unsupported causal claim'
    }])
  })

  it('rejects duplicate and unknown Case and Slot plan entries', () => {
    const queue = buildReviewQueue([makeRun('705')])
    const duplicate = {
      case_id: 'PROMPT-EVAL-001',
      slot: 1,
      decision: 'approve',
      reason: 'matches frozen facts'
    }

    expect(() => parseReviewBatchPlan(JSON.stringify([duplicate, duplicate]), queue, 'assessment_semantics'))
      .toThrow('审核计划包含重复项 PROMPT-EVAL-001 Slot 1')
    expect(() => parseReviewBatchPlan(JSON.stringify([{ ...duplicate, slot: 2 }]), queue, 'assessment_semantics'))
      .toThrow('PROMPT-EVAL-001 Slot 2 不属于当前角色的待审队列')
  })

  it('rejects a plan for a role that is already recorded', () => {
    const run = makeRun('706')
    run.human_reviews.push({
      candidate_id: 'candidate:706',
      role: 'assessment_semantics',
      reviewer: 'user:1',
      decision: 'approve',
      reviewed_at: '2026-08-31T10:01:00Z',
      reason: 'facts match'
    })

    expect(() => parseReviewBatchPlan(JSON.stringify([{
      case_id: 'PROMPT-EVAL-001',
      slot: 1,
      decision: 'approve',
      reason: 'facts match'
    }]), buildReviewQueue([run]), 'assessment_semantics'))
      .toThrow('PROMPT-EVAL-001 Slot 1 不属于当前角色的待审队列')
  })

  it('rejects invalid decision, reason, JSON shape, and oversized batches', () => {
    const queue = buildReviewQueue([makeRun('707')])
    const item = {
      case_id: 'PROMPT-EVAL-001',
      slot: 1,
      decision: 'approve',
      reason: 'facts match'
    }

    expect(() => parseReviewBatchPlan('{', queue, 'assessment_semantics')).toThrow('审核计划不是有效 JSON')
    expect(() => parseReviewBatchPlan(JSON.stringify({}), queue, 'assessment_semantics'))
      .toThrow('审核计划必须是包含 1 至 35 条记录的 JSON 数组')
    expect(() => parseReviewBatchPlan(JSON.stringify([{ ...item, decision: 'maybe' }]), queue, 'assessment_semantics'))
      .toThrow('decision 必须是 approve 或 reject')
    expect(() => parseReviewBatchPlan(JSON.stringify([{ ...item, reason: '' }]), queue, 'assessment_semantics'))
      .toThrow('reason 必须为 1 至 1000 个字符')
    expect(() => parseReviewBatchPlan(JSON.stringify(Array.from({ length: 36 }, () => item)), queue, 'assessment_semantics'))
      .toThrow('单批审核计划不能超过 35 条')
  })
})
