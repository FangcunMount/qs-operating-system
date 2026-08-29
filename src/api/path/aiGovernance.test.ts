import {
  cancelAIEvaluation,
  createAIProfileDraft,
  disableAIProfile,
  finalizeAIEvaluation,
  getAIEvaluationAttempt,
  getAIEvaluationAttemptRecheck,
  getAIEvaluationCapacity,
  getAIEvaluationRun,
  getAIParticipantCapacity,
  getAIProfile,
  listAIEvaluationRuns,
  listAIEvaluationAttemptRechecks,
  listAIProfiles,
  publishAIProfile,
  recordAIHumanReview,
  recoverAIEvaluation,
  retryAIParticipantGeneration,
  startAIEvaluation,
  startAIEvaluationAttemptRecheck
} from './aiGovernance'
import { internalGet, internalPost } from '../qsServer'

jest.mock('../qsServer', () => ({
  internalGet: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }])),
  internalPost: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }]))
}))

const internalGetMock = internalGet as jest.Mock
const internalPostMock = internalPost as jest.Mock

describe('AI governance API', () => {
  beforeEach(() => {
    internalGetMock.mockClear()
    internalPostMock.mockClear()
  })

  it('keeps bounded evaluation and review routes stable', async () => {
    await listAIEvaluationRuns({ status: 'awaiting_review', cursor: 'next', limit: 25 })
    await getAIEvaluationRun('run/1')
    await getAIEvaluationAttempt('run/1', 'case/1', 2)
    await getAIEvaluationCapacity()
    await getAIParticipantCapacity()
    await startAIEvaluation(70, 'freeze release')
    await recoverAIEvaluation('run/1', 68, 'recover expired lease')
    await cancelAIEvaluation('run/1', 'cancel release')
    await recordAIHumanReview('run/1', {
      case_id: 'case/1',
      attempt: 2,
      role: 'assessment_semantics',
      decision: 'approve',
      reason: 'evidence reviewed'
    })
    await finalizeAIEvaluation('run/1', 'all evidence reviewed')

    expect(internalGetMock).toHaveBeenNthCalledWith(1, '/interpretation/ai-explanation/prompt-evaluations', {
      status: 'awaiting_review', cursor: 'next', limit: 25
    })
    expect(internalGetMock).toHaveBeenNthCalledWith(2, '/interpretation/ai-explanation/prompt-evaluations/run%2F1')
    expect(internalGetMock).toHaveBeenNthCalledWith(
      3,
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/attempts/case%2F1/2'
    )
    expect(internalGetMock).toHaveBeenNthCalledWith(
      4,
      '/interpretation/ai-explanation/prompt-evaluation-capacity'
    )
    expect(internalGetMock).toHaveBeenNthCalledWith(
      5,
      '/interpretation/ai-explanation/participant-capacity'
    )
    expect(internalPostMock).toHaveBeenCalledWith('/interpretation/ai-explanation/prompt-evaluations', {
      confirm: true, expected_provider_invocations: 70, reason: 'freeze release'
    })
    expect(internalPostMock).toHaveBeenCalledWith(
      '/interpretation/ai-explanation/prompt-evaluations/run%2F1/reviews',
      expect.objectContaining({ role: 'assessment_semantics', decision: 'approve' })
    )
  })

  it('uses immutable single-attempt recheck routes with the exact two-call confirmation', async () => {
    await listAIEvaluationAttemptRechecks('run/1', 'case/1', 2)
    await getAIEvaluationAttemptRecheck('run/1', 'case/1', 2, 'recheck/1')
    await startAIEvaluationAttemptRecheck('run/1', 'case/1', 2, 'verify repaired candidate release')

    const base = '/interpretation/ai-explanation/prompt-evaluations/run%2F1/attempts/case%2F1/2/rechecks'
    expect(internalGetMock).toHaveBeenNthCalledWith(1, base, { limit: 20 })
    expect(internalGetMock).toHaveBeenNthCalledWith(2, `${base}/recheck%2F1`)
    expect(internalPostMock).toHaveBeenCalledWith(base, {
      confirm: true,
      expected_provider_invocations: 2,
      reason: 'verify repaired candidate release'
    })
  })

  it('keeps Profile lifecycle and governed retry routes stable', async () => {
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

    expect(internalGetMock).toHaveBeenNthCalledWith(1, '/interpretation/ai-explanation/profiles', {
      status: 'draft', limit: 20
    })
    expect(internalGetMock).toHaveBeenNthCalledWith(
      2,
      '/interpretation/ai-explanation/profiles/participant-default/versions/1.0.0'
    )
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
