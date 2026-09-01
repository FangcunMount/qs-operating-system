import {
  createAIProfileDraft,
  disableAIProfile,
  finalizeAIEvaluationV2,
  getAIEvaluationAttempt,
  getAIEvaluationAttemptRecheck,
  getAIEvaluationCandidateV2,
  getAIEvaluationCapacity,
  getAIEvaluationOutputV2,
  getAIEvaluationRun,
  getAIEvaluationRunV2,
  getAIParticipantCapacity,
  getAIProfile,
  listAIEvaluationRuns,
  listAIEvaluationAttemptRechecks,
  listAIProfiles,
  publishAIProfile,
  recordAIHumanReviewV2,
  recordAIHumanReviewsV2,
  resolveAIEvaluationResultUnknownV2,
  retryAIParticipantGeneration,
  startAIEvaluationV2,
  startAIEvaluationAttemptRecheck
} from './aiGovernance'
import { internalGet, internalPost, internalV2Get, internalV2Post } from '../qsServer'

jest.mock('../qsServer', () => ({
  internalGet: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }])),
  internalPost: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }])),
  internalV2Get: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }])),
  internalV2Post: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }]))
}))

const internalGetMock = internalGet as jest.Mock
const internalPostMock = internalPost as jest.Mock
const internalV2GetMock = internalV2Get as jest.Mock
const internalV2PostMock = internalV2Post as jest.Mock
const success = (data: unknown = {}) => Promise.resolve([null, { code: 0, data, message: '' }])

describe('AI governance API', () => {
  beforeEach(() => {
    internalGetMock.mockReset().mockImplementation(() => success())
    internalPostMock.mockReset().mockImplementation(() => success())
    internalV2GetMock.mockReset().mockImplementation(() => success())
    internalV2PostMock.mockReset().mockImplementation(() => success())
  })

  it('keeps v1 evaluation history read-only', async () => {
    await listAIEvaluationRuns({ status: 'awaiting_review', cursor: 'next', limit: 25 })
    await getAIEvaluationRun('run/1')
    await getAIEvaluationAttempt('run/1', 'case/1', 2)
    await getAIEvaluationCapacity()
    await getAIParticipantCapacity()

    expect(internalGetMock).toHaveBeenNthCalledWith(1, '/interpretation/ai-explanation/prompt-evaluations', {
      status: 'awaiting_review', cursor: 'next', limit: 25
    })
    expect(internalGetMock).toHaveBeenNthCalledWith(2, '/interpretation/ai-explanation/prompt-evaluations/run%2F1')
    expect(internalGetMock).toHaveBeenNthCalledWith(
      3,
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/attempts/case%2F1/2'
    )
    expect(internalPostMock).not.toHaveBeenCalled()
  })

  it('uses v2 for the active evaluation lifecycle and candidate evidence', async () => {
    internalV2GetMock
      .mockImplementationOnce(() => success())
      .mockImplementationOnce(() => success({
        candidate: { semantic_execution_ids: null, assertions: null },
        accepted_generation_execution: {},
        human_reviews: null
      }))

    await startAIEvaluationV2(140, 'freeze release')
    await getAIEvaluationRunV2('run/1')
    await getAIEvaluationCandidateV2('run/1', 'candidate/1')
    await getAIEvaluationOutputV2('run/1', 'execution/1')
    await recordAIHumanReviewV2('run/1', {
      candidate_id: 'candidate/1',
      role: 'assessment_semantics',
      decision: 'approve',
      reason: 'evidence reviewed'
    })
    await recordAIHumanReviewsV2('run/1', {
      role: 'assessment_semantics',
      reviews: [
        { candidate_id: 'candidate/1', decision: 'approve', reason: 'facts match' },
        { candidate_id: 'candidate/2', decision: 'reject', reason: 'unsupported inference' }
      ]
    })
    await finalizeAIEvaluationV2('run/1', 'all evidence reviewed')
    await resolveAIEvaluationResultUnknownV2('run/1', {
      execution_id: 'execution/2',
      decision: 'authorize_replacement',
      acknowledged_duplicate_call_and_cost_risk: true,
      reason: 'operator confirmed unknown result risk'
    })

    expect(internalV2GetMock).toHaveBeenNthCalledWith(1, '/interpretation/ai-explanation/prompt-evaluations/run%2F1')
    expect(internalV2GetMock).toHaveBeenNthCalledWith(
      2,
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/candidates/candidate%2F1'
    )
    expect(internalV2PostMock).toHaveBeenCalledWith('/interpretation/ai-explanation/prompt-evaluations', {
      confirm: true, expected_provider_invocations: 140, reason: 'freeze release'
    })
    expect(internalV2PostMock).toHaveBeenCalledWith(
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/reviews',
      expect.objectContaining({ candidate_id: 'candidate/1', role: 'assessment_semantics' })
    )
    expect(internalV2PostMock).toHaveBeenCalledWith(
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/reviews/batch',
      expect.objectContaining({ role: 'assessment_semantics', reviews: expect.any(Array) })
    )
    expect(internalV2PostMock).toHaveBeenCalledWith(
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/result-unknown/resolve',
      expect.objectContaining({ execution_id: 'execution/2', confirm: true })
    )
  })

  it('keeps legacy recheck reads on v1 and moves the write to v2', async () => {
    await listAIEvaluationAttemptRechecks('run/1', 'case/1', 2)
    await getAIEvaluationAttemptRecheck('run/1', 'case/1', 2, 'recheck/1')
    await startAIEvaluationAttemptRecheck('run/1', 'case/1', 2, 'verify repaired candidate release')

    const base = '/interpretation/ai-explanation/prompt-evaluations/run%2F1/attempts/case%2F1/2/rechecks'
    expect(internalGetMock).toHaveBeenNthCalledWith(1, base, { limit: 20 })
    expect(internalGetMock).toHaveBeenNthCalledWith(2, `${base}/recheck%2F1`)
    expect(internalV2PostMock).toHaveBeenCalledWith(
      '/interpretation/ai-explanation/legacy-prompt-evaluations/run%2F1/attempts/case%2F1/2/rechecks',
      { confirm: true, expected_provider_invocations: 2, reason: 'verify repaired candidate release' }
    )
  })

  it('keeps Profile lifecycle and governed participant retry on v1', async () => {
    await listAIProfiles({ status: 'draft', limit: 20 })
    await getAIProfile('participant-default', '1.0.0')
    await createAIProfileDraft({ profile_id: 'participant-default' } as any, 'sha256:definition', 'new release')
    await publishAIProfile('participant-default', '1.0.0', '700', 'approved evidence')
    await disableAIProfile('participant-default', '1.0.0', 'stop new traffic')
    await retryAIParticipantGeneration('900', {
      expected_attempt: 1,
      request_id: 'manual-retry-1',
      confirm: true,
      expected_provider_invocations: 1,
      accept_result_unknown_risk: true,
      reason: 'operator accepted result_unknown risk'
    })

    expect(internalPostMock).toHaveBeenCalledWith(
      '/interpretation/ai-explanation/profiles/participant-default/versions/1.0.0/publish',
      { evaluation_run_id: '700', reason: 'approved evidence' }
    )
    expect(internalPostMock).toHaveBeenCalledWith('/interpretation/ai-explanation/generations/900/retry', {
      expected_attempt: 1,
      request_id: 'manual-retry-1',
      confirm: true,
      expected_provider_invocations: 1,
      accept_result_unknown_risk: true,
      reason: 'operator accepted result_unknown risk'
    })
  })
})
