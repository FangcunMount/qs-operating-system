import { fireEvent, render, screen } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import { NativeEvaluationWorkspace } from './NativeEvaluationWorkspace'
import { NativeReopeningWorkspace } from './NativeReopeningWorkspace'
import { evaluationJournalKey } from './useNativeEvaluation'
import { releaseKeys } from './evaluationValidation'
import { canRequestReopening, confirmsReopening, reopeningHistory } from './reopeningValidation'

jest.mock('@/api/path/aiWorkflow', () => ({
  getNativeEvaluation: jest.fn(),
  reopenNativeReview: jest.fn(),
  startNativeEvaluation: jest.fn(),
  listNativeCandidates: jest.fn(),
  finalizeNativeEvaluation: jest.fn()
}))
const id = '44444444-4444-4444-8444-444444444444'
const fp = 'sha256:' + 'a'.repeat(64)
const at = (hour: number) => `2026-09-13T${String(hour).padStart(2, '0')}:00:00Z`
const release = Object.fromEntries(
  releaseKeys.map((key) => [
    key,
    {
      id: key,
      version: key === 'gate_policy' ? 'v2' : 'v1',
      fingerprint: fp
    }
  ])
) as unknown as api.EvaluationRelease
function rejected(): api.NativeEvaluationState {
  return {
    run_id: id,
    version: 9,
    status: 'rejected',
    can_reopen_review: true,
    unresolved_result_unknown_count: 0,
    resolutions: [],
    review_reopenings: [],
    reviews: Array.from({ length: 35 }, (_, i) =>
      ['assessment_semantics', 'safety_product'].map((role, n) => ({
        candidate_id: `candidate:${i + 1}`,
        role,
        reviewer: `user:${n + 42}`,
        decision: 'approve',
        reason: '核对原始证据',
        reviewed_at: at(1)
      }))
    ).flat(),
    creation: {
      schema_version: 'qs-ai-evaluation-creation-receipt/v1',
      run_id: id,
      release,
      release_fingerprint: fp,
      requested_by: 'user:42',
      request_reason: '原案例评测',
      created_at: at(0)
    },
    finalization: {
      schema_version: 'qs-ai-evaluation-finalization/v1',
      run_id: id,
      source_version: 8,
      version: 9,
      status: 'rejected',
      passed: false,
      release_fingerprint: fp,
      actor: 'user:42',
      reason: '核对最终门槛',
      finalized_at: at(2),
      gate_result: {
        schema_version: 'qs-ai-evaluation-gate-preview/v1',
        evaluated_at: at(2),
        gate_passes: { G1: true, G2: true, G3: true, G4: false, G5: true },
        metrics: [],
        reasons: [
          { gate: 'G4', code: 'candidate_hard_assertion_failed', evidence_refs: ['candidate:1'] }
        ],
        semantic_adjudications: []
      }
    }
  }
}
function reopened(previous = rejected(), hour = 3): api.NativeEvaluationState {
  const reviews = previous.reviews as api.NativeReviewRecord[]
  return {
    ...previous,
    version: previous.version + 1,
    status: 'awaiting_review',
    can_reopen_review: false,
    finalization: undefined,
    reviews: reviews.filter((r) => r.candidate_id !== 'candidate:1'),
    review_reopenings: [
      ...previous.review_reopenings,
      {
        source_version: previous.version,
        version: previous.version + 1,
        transition_count: 5 + previous.review_reopenings.length * 2,
        previous_finalization: previous.finalization,
        previous_reviews: reviews,
        candidate_ids: ['candidate:1'],
        actor: 'user:42',
        reason: '复核语义判定',
        reopened_at: at(hour)
      }
    ]
  }
}
const ok = (data: unknown) => [null, { data }]
async function open(run = rejected()) {
  (api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(run))
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.change(screen.getByLabelText('评测任务标识'), { target: { value: id } })
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByLabelText('重开复审理由')
  return view
}
function submit() {
  fireEvent.change(screen.getByLabelText('重开复审理由'), { target: { value: '  复核语义判定  ' } })
  fireEvent.click(screen.getByLabelText('我确认保留原始证据，并重新完成受影响候选的人工审核'))
  fireEvent.click(screen.getByText('确认重开语义复审'))
}
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
})
afterEach(() => jest.restoreAllMocks())

it('reopens once with current version and confirmation, preserves full prior signatures, and does not start a model call', async () => {
  (api.reopenNativeReview as jest.Mock).mockResolvedValue(ok(reopened()))
  await open()
  expect(screen.getByText('确认重开语义复审').closest('button')).toBeDisabled()
  submit()
  await screen.findByText('等待人工审核')
  expect(api.reopenNativeReview).toHaveBeenCalledTimes(1)
  expect(api.reopenNativeReview).toHaveBeenCalledWith(id, {
    expected_version: 9,
    reason: '复核语义判定',
    confirm: true
  })
  expect(api.startNativeEvaluation).not.toHaveBeenCalled()
  expect(api.finalizeNativeEvaluation).not.toHaveBeenCalled()
  expect(sessionStorage.getItem(evaluationJournalKey('u1'))).not.toContain('复核语义判定')
  fireEvent.click(screen.getByText(/第 1 轮复审/))
  expect(await screen.findByText('查看保留的原审核与门槛证据')).toBeInTheDocument()
  expect(reopeningHistory(reopened())[0].previous_reviews).toHaveLength(70)
})

it.each([409, 504])(
  'keeps unknown reopening %s locked across reload until its source-version history is visible',
  async (status) => {
    (api.reopenNativeReview as jest.Mock).mockResolvedValue([{ status }, undefined])
    const view = await open()
    submit()
    await screen.findByText('复审结果尚未确认，请查询原任务，暂不重复提交。')
    view.unmount()
    render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
    fireEvent.click(screen.getByText('查询任务状态'))
    await screen.findByText('复审结果尚未确认，请保留原任务并稍后查询。')
    // An advanced version alone is not a receipt for this operation.
    ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok({ ...rejected(), version: 10 }))
    fireEvent.click(screen.getByText('查询任务状态'))
    await screen.findByText('尚未取得原版本的复审记录。')
    expect(screen.getByText('结束查看，准备另一评测').closest('button')).toBeDisabled()
    ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(reopened()))
    fireEvent.click(screen.getByText('查询任务状态'))
    await screen.findByText('等待人工审核')
    expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBeNull()
    expect(api.reopenNativeReview).toHaveBeenCalledTimes(1)
  }
)

it.each(['missing', 'reason', 'archive', 'signature', 'target', 'time'])(
  'does not acknowledge inconsistent reopening evidence: %s',
  async (kind) => {
    const value = reopened()
    const entry = value.review_reopenings[0] as api.NativeReviewReopening
    if (kind === 'missing') value.review_reopenings = []
    if (kind === 'reason') entry.reason = '其他目的'
    if (kind === 'archive') entry.previous_finalization.reason = '被替换的审核'
    if (kind === 'signature') entry.previous_reviews.pop()
    if (kind === 'target') entry.candidate_ids = ['invalid<>id']
    if (kind === 'time') entry.reopened_at = at(1)
    ;(api.reopenNativeReview as jest.Mock).mockResolvedValue(ok(value))
    await open()
    submit()
    await screen.findByText('复审结果尚未确认，请查询原任务，暂不重复提交。')
    expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('reopen')
  }
)

it('requires a fresh read after a definite rejection', async () => {
  (api.reopenNativeReview as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  await open()
  submit()
  await screen.findByText('复审被拒绝，请重新查询任务并核对原审核依据。')
  expect(screen.queryByLabelText('重开复审理由')).not.toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBeNull()
})
it('does not send when recovery storage fails', async () => {
  await open()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota')
  })
  submit()
  await screen.findByText('无法保存复审记录，本次未发送。')
  expect(api.reopenNativeReview).not.toHaveBeenCalled()
})
it('keeps another account isolated from an uncertain operation', async () => {
  (api.reopenNativeReview as jest.Mock).mockResolvedValue([{ status: 504 }, undefined])
  const view = await open()
  submit()
  await screen.findByText('复审结果尚未确认，请查询原任务，暂不重复提交。')
  view.unmount()
  render(<NativeEvaluationWorkspace owner="u2" selection={{}} />)
  expect(screen.getByLabelText('评测任务标识')).toHaveValue('')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('reopen')
})

it.each([undefined, false])('uses server eligibility %s without reconstructing gates', (eligibility) => {
  const value = { ...rejected(), can_reopen_review: eligibility }
  render(<NativeReopeningWorkspace run={value} locked={false} reopen={jest.fn()} />)
  expect(screen.queryByText('确认重开语义复审')).not.toBeInTheDocument()
  expect(canRequestReopening(value)).toBe(false)
  if (eligibility === undefined)
    expect(screen.getByText('暂未取得服务端复审资格，请重新查询任务。')).toBeInTheDocument()
})

it('does not reinterpret the server decision using local gate policy', () => {
  const value = rejected()
  value.finalization = { policy: 'future-policy' }
  expect(canRequestReopening(value)).toBe(true)
})

it('displays archived reviews without enforcing domain review counts', () => {
  const value = reopened()
  const entry = value.review_reopenings[0] as api.NativeReviewReopening
  entry.previous_reviews.pop()
  expect(reopeningHistory(value)[0].previous_reviews).toHaveLength(69)
})

it('supports three ordered rounds and requires preserved earlier signatures and history', () => {
  let value = rejected()
  for (let round = 0; round < 3; round++) {
    expect(canRequestReopening(value)).toBe(true)
    const next = reopened(value, 3 + round * 3)
    confirmsReopening(next, value.version, value, '复核语义判定')
    const final = rejected().finalization as api.NativeFinalization
    const time = at(5 + round * 3)
    value = {
      ...next,
      version: next.version + 3,
      status: 'rejected',
      can_reopen_review: round < 2,
      reviews: [
        ...next.reviews,
        ...(rejected().reviews as api.NativeReviewRecord[])
          .filter((r) => r.candidate_id === 'candidate:1')
          .map((r) => ({ ...r, reviewed_at: at(4 + round * 3) }))
      ],
      finalization: {
        ...final,
        source_version: next.version + 2,
        version: next.version + 3,
        finalized_at: time,
        gate_result: { ...final.gate_result, evaluated_at: time }
      }
    }
  }
  expect(reopeningHistory(value)).toHaveLength(3)
  expect(canRequestReopening(value)).toBe(false)
  // Recovery may observe a later completed round, but still requires the original transition.
  expect(() => confirmsReopening(value, 9)).not.toThrow()
  expect(() => confirmsReopening(value, 10)).toThrow('尚未取得原版本的复审记录')
  ;(value.review_reopenings[1] as api.NativeReviewReopening).transition_count = 1
  expect(() => reopeningHistory(value)).toThrow()
})

it('retains prior review history after an explicitly audited discard', () => {
  const previous = reopened()
  const run: api.NativeEvaluationState = { ...previous, version: previous.version + 1, status: 'canceled', cancellation: {
    schema_version: 'qs-ai-evaluation-cancellation/v1', run_id: id,
    source_version: previous.version, version: previous.version + 1, source_status: 'awaiting_review', status: 'canceled',
    release_fingerprint: fp, actor: 'user:42', reason: '废弃此轮评审', discard: true,
    canceled_at: at(4), execution_id: '', invocation_id: ''
  } }
  expect(reopeningHistory(run)).toEqual(previous.review_reopenings)
  expect(canRequestReopening(run)).toBe(false)
  render(<NativeReopeningWorkspace run={run} locked={false} reopen={jest.fn()} />)
  expect(screen.getByText(/第 1 轮复审/)).toBeInTheDocument()
  expect(screen.queryByText('确认重开语义复审')).not.toBeInTheDocument()
  expect(() => reopeningHistory({ ...run, cancellation: undefined })).toThrow()
})
