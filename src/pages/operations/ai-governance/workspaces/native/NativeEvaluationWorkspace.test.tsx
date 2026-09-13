import { act, fireEvent, render, screen } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import * as commands from './commands'
import { NativeEvaluationWorkspace } from './NativeEvaluationWorkspace'
import { NativeCandidateWorkspace } from './NativeCandidateWorkspace'
import { evaluationJournalKey } from './useNativeEvaluation'
import { releaseKeys } from './evaluationValidation'

jest.mock('@/api/path/aiWorkflow', () => ({
  prepareNativeEvaluation: jest.fn(),
  createNativeEvaluation: jest.fn(),
  startNativeEvaluation: jest.fn(),
  getNativeEvaluation: jest.fn(),
  listNativeCandidates: jest.fn(),
  getNativeCandidate: jest.fn(),
  reviewNativeEvaluation: jest.fn(),
  previewNativeGates: jest.fn(),
  finalizeNativeEvaluation: jest.fn()
}))
const id = '44444444-4444-4444-8444-444444444444'
const ref = (id: string): api.EvaluationReference => ({
  id,
  version: 'v1',
  fingerprint: 'sha256:' + 'a'.repeat(64)
})
const release = Object.fromEntries(
  releaseKeys.map((key) => [key, ref(key)])
) as unknown as api.EvaluationRelease
const selection = {
  suite: release.suite,
  generation_route: release.generation_route,
  semantic_route: release.semantic_route
}
const plan: api.EvaluationPlan = {
  release,
  release_fingerprint: 'sha256:' + 'b'.repeat(64),
  generation_case_count: 7,
  candidates_per_case: 5,
  candidate_count: 35,
  preflight_case_count: 1,
  max_generation_invocations: 70,
  max_semantic_invocations: 70,
  execution_policy_json: '{}',
  gate_policy_json: '{}'
}
const state = (
  version = 1,
  status: api.EvaluationStatus = 'requested'
): api.NativeEvaluationState => ({
  run_id: id,
  version,
  status,
  unresolved_result_unknown_count: 0,
  resolutions: [],
  reviews: [],
  review_reopenings: [],
  creation: {
    schema_version: 'qs-ai-evaluation-creation-receipt/v1',
    run_id: id,
    release,
    release_fingerprint: plan.release_fingerprint,
    requested_by: 'user:42',
    request_reason: '新策略评测',
    created_at: '2026-09-13T00:00:00Z'
  }
})
const ok = (data: unknown) => [null, { data }]
const journal = (pending: 'create' | 'start' | null = 'create') => {
  sessionStorage.setItem(
    evaluationJournalKey('u1'),
    JSON.stringify({
      runID: id,
      releaseFingerprint: plan.release_fingerprint,
      pending,
      ...(pending === 'start' ? { expectedVersion: 1 } : {})
    })
  )
}
const prepare = async () => {
  fireEvent.click(screen.getByRole('button', { name: '读取评测计划' }))
  await screen.findByText('待确认的评测计划')
}
const create = async () => {
  await prepare()
  fireEvent.change(screen.getByLabelText('创建评测理由'), { target: { value: '新策略评测' } })
  fireEvent.click(screen.getByLabelText('我确认冻结以上配置并创建评测任务'))
  fireEvent.click(screen.getByRole('button', { name: '创建评测任务' }))
}
const start = () => {
  fireEvent.change(screen.getByLabelText('启动评测理由'), { target: { value: '确认执行' } })
  fireEvent.click(screen.getByLabelText('我确认启动此任务，执行可能产生模型调用费用'))
  fireEvent.click(screen.getByRole('button', { name: '启动评测任务' }))
}
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(id)
  ;(api.prepareNativeEvaluation as jest.Mock).mockResolvedValue(ok(plan))
  ;(api.createNativeEvaluation as jest.Mock).mockResolvedValue(ok(state()))
  ;(api.startNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(2, 'collecting')))
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state()))
})
afterEach(() => jest.restoreAllMocks())

it('prepares, explicitly creates and separately starts the exact frozen task once', async () => {
  render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
  await prepare()
  expect(api.prepareNativeEvaluation).toHaveBeenCalledWith(selection)
  expect(api.createNativeEvaluation).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '创建评测任务' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('创建评测理由'), { target: { value: '新策略评测' } })
  fireEvent.click(screen.getByLabelText('我确认冻结以上配置并创建评测任务'))
  fireEvent.click(screen.getByRole('button', { name: '创建评测任务' }))
  await screen.findByText('已创建，待启动')
  expect(screen.getByText('user:42')).toBeInTheDocument()
  expect(api.createNativeEvaluation).toHaveBeenCalledWith(id, {
    release,
    reason: '新策略评测',
    confirm: true
  })
  expect(api.startNativeEvaluation).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: '启动评测任务' })).toBeDisabled()
  expect(sessionStorage.getItem(evaluationJournalKey('u1'))).not.toContain('新策略评测')
  start()
  await screen.findByText('正在评测')
  expect(api.startNativeEvaluation).toHaveBeenCalledWith(id, {
    expected_version: 1,
    reason: '确认执行',
    confirm: true
  })
  expect(api.startNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(api.listNativeCandidates).not.toHaveBeenCalled()
})

it.each([409, 504])(
  'recovers uncertain creation %s after reload without another POST',
  async (status) => {
    (api.createNativeEvaluation as jest.Mock).mockResolvedValue([{ status }, undefined])
    const view = render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
    await create()
    await screen.findByText('创建结果尚未确认，请查询原任务，暂不重复创建。')
    view.unmount()
    render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
    fireEvent.click(screen.getByText('查询任务状态'))
    await screen.findByText('已创建，待启动')
    expect(api.getNativeEvaluation).toHaveBeenCalledWith(id)
    expect(api.createNativeEvaluation).toHaveBeenCalledTimes(1)
    expect(api.startNativeEvaluation).not.toHaveBeenCalled()
  }
)

it('keeps an uncertain Start locked when an early read still sees requested, then recovers advanced state', async () => {
  (api.startNativeEvaluation as jest.Mock).mockResolvedValue([{ status: 504 }, undefined])
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
  await create()
  await screen.findByText('已创建，待启动')
  start()
  await screen.findByText('启动结果尚未确认，请查询原任务，暂不重复启动。')
  view.unmount()
  render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('启动结果尚未确认，请保留原任务并稍后查询。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('start')
  expect(screen.getByRole('button', { name: '结束查看，准备另一评测' })).toBeDisabled()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(2, 'collecting')))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('正在评测')
  expect(api.startNativeEvaluation).toHaveBeenCalledTimes(1)
})

it.each(['missing', 'fingerprint', 'reference', 'reason'])(
  'does not accept mismatched creation %s',
  async (kind) => {
    const value = JSON.parse(JSON.stringify(state()))
    if (kind === 'missing') delete value.creation
    if (kind === 'fingerprint') value.creation.release_fingerprint = 'sha256:' + 'c'.repeat(64)
    if (kind === 'reference') value.creation.release.profile.version = 'v2'
    if (kind === 'reason') value.creation.request_reason = '另一个目的'
    ;(api.createNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
    render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
    await create()
    await screen.findByText('创建结果尚未确认，请查询原任务，暂不重复创建。')
    expect(screen.queryByText('当前评测任务')).not.toBeInTheDocument()
    expect(api.startNativeEvaluation).not.toHaveBeenCalled()
  }
)

it('does not unlock an unknown creation on 404 and isolates another account', async () => {
  journal()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue([{ status: 404 }, undefined])
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('尚未取得任务状态，请保留原任务标识并稍后查询。')
  expect(screen.getByRole('button', { name: '结束查看，准备另一评测' })).toBeDisabled()
  view.unmount()
  render(<NativeEvaluationWorkspace owner="u2" selection={selection} />)
  expect(screen.getByText('读取评测计划')).toBeEnabled()
  expect(screen.getByLabelText('评测任务标识')).toHaveValue('')
})

it('does not send mutations when task journaling fails', async () => {
  render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  await create()
  await screen.findByText('无法保存任务标识或配置已变化，本次未发送。')
  expect(api.createNativeEvaluation).not.toHaveBeenCalled()
})

it('discards a plan returned after selection changes', async () => {
  let finish!: (value: unknown) => void
  ;(api.prepareNativeEvaluation as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
  fireEvent.click(screen.getByText('读取评测计划'))
  view.rerender(
    <NativeEvaluationWorkspace owner="u1" selection={{ ...selection, suite: ref('another') }} />
  )
  await act(async () => {
    finish(ok(plan))
  })
  expect(screen.queryByText('待确认的评测计划')).not.toBeInTheDocument()
})

it.each(['missing', 'unsafe', 'binding'])('rejects invalid prepared plans: %s', async (kind) => {
  const value = JSON.parse(JSON.stringify(plan))
  if (kind === 'missing') delete value.release.semantic_output_schema
  if (kind === 'unsafe') value.max_generation_invocations = Number.MAX_SAFE_INTEGER + 1
  if (kind === 'binding') value.release.suite.version = 'v2'
  ;(api.prepareNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
  render(<NativeEvaluationWorkspace owner="u1" selection={selection} />)
  fireEvent.click(screen.getByText('读取评测计划'))
  await screen.findByText('准备清单与选择的配置不一致，请重新读取。')
  expect(screen.queryByText('创建评测任务')).not.toBeInTheDocument()
})

it('retains a version floor across reload and repeated stale reads', async () => {
  journal(null)
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(7, 'collecting')))
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('正在评测')
  view.unmount()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(2, 'collecting')))
  render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  for (let i = 0; i < 2; i++) {
    fireEvent.click(screen.getByText('查询任务状态'))
    await screen.findByText('任务版本倒退，请重新读取。')
  }
  expect(screen.queryByText('当前评测任务')).not.toBeInTheDocument()
})

it('reads older server state without enabling Start or inventing creation evidence', async () => {
  const value = state()
  delete value.creation
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
  render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.change(screen.getByLabelText('评测任务标识'), { target: { value: id } })
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('当前响应缺少原始创建记录，仅可查看状态；暂不能从此处启动。')
  expect(screen.queryByText('启动评测任务')).not.toBeInTheDocument()
})

it('reads candidate output at the exact task version and rejects later mismatches', async () => {
  (api.listNativeCandidates as jest.Mock).mockResolvedValue(
    ok({
      run_id: id,
      version: 7,
      candidates: [{ candidate_id: 'candidate:1', case_id: 'CASE-1', slot_ordinal: 1 }]
    })
  )
  ;(api.getNativeCandidate as jest.Mock).mockResolvedValue(
    ok({
      run_id: id,
      version: 7,
      candidate_id: 'candidate:1',
      normalized_output: '实际候选内容',
      semantic_output: '{}',
      evidence: { source: 'frozen' }
    })
  )
  render(<NativeCandidateWorkspace run={state(7, 'awaiting_review')} />)
  fireEvent.click(screen.getByText('读取候选结果'))
  fireEvent.click(await screen.findByText('查看候选详情'))
  await screen.findByText('实际候选内容')
  expect(api.getNativeCandidate).toHaveBeenCalledWith(id, 'candidate:1', 7)
  ;(api.getNativeCandidate as jest.Mock).mockResolvedValue(
    ok({
      run_id: id,
      version: 8,
      candidate_id: 'candidate:1',
      normalized_output: '另一版本',
      semantic_output: '{}',
      evidence: {}
    })
  )
  fireEvent.click(screen.getByText('查看候选详情'))
  await screen.findByText('结果暂不可读或任务版本已变化，请先刷新任务状态。')
  expect(screen.queryByText('另一版本')).not.toBeInTheDocument()
  expect(screen.queryByText('实际候选内容')).not.toBeInTheDocument()
})

it('rejects candidate lists from a different task version', async () => {
  (api.listNativeCandidates as jest.Mock).mockResolvedValue(
    ok({ run_id: id, version: 8, candidates: [] })
  )
  render(<NativeCandidateWorkspace run={state(7, 'collecting')} />)
  fireEvent.click(screen.getByText('读取候选结果'))
  await screen.findByText('结果暂不可读或任务版本已变化，请先刷新任务状态。')
  expect(screen.queryByText('当前版本尚无候选结果')).not.toBeInTheDocument()
})

const openReview = async () => {
  journal(null)
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(8, 'awaiting_review')))
  ;(api.listNativeCandidates as jest.Mock).mockResolvedValue(ok({ run_id: id, version: 8,
    candidates: [{ candidate_id: 'candidate:1', case_id: 'case:1', slot_ordinal: 1 }] }))
  ;(api.getNativeCandidate as jest.Mock).mockResolvedValue(ok({ run_id: id, version: 8,
    candidate_id: 'candidate:1', normalized_output: '待审核内容', semantic_output: '{}', evidence: {} }))
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('等待人工审核')
  fireEvent.click(screen.getByText('读取候选结果'))
  fireEvent.click(await screen.findByText('查看候选详情'))
  await screen.findByText('候选人工审核')
  return view
}
const submitReview = () => {
  fireEvent.change(screen.getByLabelText('候选审核理由'), { target: { value: '核对原文及来源' } })
  fireEvent.click(screen.getByLabelText('我已核对当前候选及证据，确认提交审核决定'))
  fireEvent.click(screen.getByText('提交候选审核'))
}
const reviewed = () => ({ ...state(9, 'awaiting_review'), reviews: [{ candidate_id: 'candidate:1',
  role: 'assessment_semantics', reviewer: 'user:42', decision: 'approve', reason: '核对原文及来源',
  reviewed_at: '2026-09-13T01:00:00Z' }] })
it('submits an explicitly confirmed version-bound review once without starting or publishing', async () => {
  (api.reviewNativeEvaluation as jest.Mock).mockResolvedValue(ok(reviewed()))
  await openReview()
  expect(screen.getByText('提交候选审核').closest('button')).toBeDisabled()
  submitReview()
  await screen.findByText('9')
  expect(api.reviewNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(api.reviewNativeEvaluation).toHaveBeenCalledWith(id, { expected_version: 8,
    role: 'assessment_semantics', reviews: [{ candidate_id: 'candidate:1', decision: 'approve', reason: '核对原文及来源' }] })
  expect(api.startNativeEvaluation).not.toHaveBeenCalled()
  expect(sessionStorage.getItem(evaluationJournalKey('u1'))).not.toContain('核对原文及来源')
})
it.each([409, 504])('locks an unknown review %s across reload and requires an advanced read', async (status) => {
  (api.reviewNativeEvaluation as jest.Mock).mockResolvedValue([{ status }, undefined])
  const view = await openReview()
  submitReview()
  await screen.findByText('审核结果尚未确认，请查询原任务，暂不重复提交。')
  expect(screen.getByText('提交候选审核').closest('button')).toBeDisabled()
  view.unmount()
  render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('审核结果尚未确认，请保留原任务并稍后查询。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('review')
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(reviewed()))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('9')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBeNull()
  expect(api.reviewNativeEvaluation).toHaveBeenCalledTimes(1)
})
it.each(['no_record', 'wrong_decision', 'old_version'])('does not acknowledge a mismatched review response: %s', async (kind) => {
  const value = reviewed()
  if (kind === 'no_record') value.reviews = []
  if (kind === 'wrong_decision') value.reviews[0].decision = 'reject'
  if (kind === 'old_version') value.version = 8
  ;(api.reviewNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
  await openReview()
  submitReview()
  await screen.findByText('审核结果尚未确认，请查询原任务，暂不重复提交。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('review')
})
it('clears a definite forbidden review and requires rereading state', async () => {
  (api.reviewNativeEvaluation as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  await openReview()
  submitReview()
  await screen.findByText('审核被拒绝，请重新查询任务并检查管理权限。')
  expect(screen.queryByText('提交候选审核')).not.toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBeNull()
})
it('does not send a review when its recovery record cannot be saved', async () => {
  await openReview()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  submitReview()
  await screen.findByText('无法保存审核记录，本次未发送。')
  expect(api.reviewNativeEvaluation).not.toHaveBeenCalled()
})

const gates = (passed = true): api.NativeGatePreview => ({
  run_id: id, version: 8, release_fingerprint: plan.release_fingerprint,
  gate_result: { schema_version: 'qs-ai-evaluation-gate-preview/v1', evaluated_at: '2026-09-13T01:00:00Z',
    gate_passes: { G1: true, G2: true, G3: true, G4: passed, G5: true }, metrics: [],
    reasons: passed ? [] : [{ gate: 'G4', code: 'candidate_hard_assertion_failed', evidence_refs: ['candidate:1'] }],
    semantic_adjudications: [] }
})
const finalized = (passed = true): api.NativeEvaluationState => ({
  ...state(9, passed ? 'approved' : 'rejected'),
  finalization: { schema_version: 'qs-ai-evaluation-finalization/v1', run_id: id, source_version: 8,
    version: 9, release_fingerprint: plan.release_fingerprint, actor: 'user:42', reason: '核对最终门槛',
    finalized_at: '2026-09-13T01:00:00Z', passed, status: passed ? 'approved' : 'rejected', gate_result: gates(passed).gate_result }
})
const openGates = async (value = gates()) => {
  journal(null)
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(8, 'awaiting_review')))
  ;(api.previewNativeGates as jest.Mock).mockResolvedValue(ok(value))
  const view = render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('等待人工审核')
  fireEvent.click(screen.getByText('读取最终审核门槛'))
  return view
}
const confirmFinalization = async (passed = true) => {
  await screen.findByLabelText('最终审核理由')
  fireEvent.change(screen.getByLabelText('最终审核理由'), { target: { value: '核对最终门槛' } })
  fireEvent.click(screen.getByLabelText(`我已核对当前门槛，确认本轮最终审核${passed ? '通过' : '拒绝'}`))
  fireEvent.click(screen.getByText(`确认最终审核${passed ? '通过' : '拒绝'}`))
}
it.each([true, false])('explicitly finalizes the exact server gate decision %s once', async (passed) => {
  (api.finalizeNativeEvaluation as jest.Mock).mockResolvedValue(ok(finalized(passed)))
  await openGates(gates(passed))
  await screen.findByLabelText('最终审核理由')
  expect(api.previewNativeGates).toHaveBeenCalledWith(id, 8)
  expect(api.finalizeNativeEvaluation).not.toHaveBeenCalled()
  expect(screen.getByText(`确认最终审核${passed ? '通过' : '拒绝'}`).closest('button')).toBeDisabled()
  await confirmFinalization(passed)
  await screen.findByText(passed ? '本轮最终审核已通过；配置是否生效需查询发布状态' : '本轮最终审核已拒绝，不能发布配置')
  expect(api.finalizeNativeEvaluation).toHaveBeenCalledWith(id, { expected_version: 8,
    expected_passed: passed, reason: '核对最终门槛', confirm: true })
  expect(api.finalizeNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(sessionStorage.getItem(evaluationJournalKey('u1'))).not.toContain('核对最终门槛')
})
it('does not offer finalization while server evidence reports incomplete human review', async () => {
  const value = gates(false)
  value.gate_result.reasons.push({ gate: 'G5', code: 'human_review_incomplete', evidence_refs: ['candidate:1'] })
  value.gate_result.gate_passes.G5 = false
  await openGates(value)
  await screen.findByText('人工审核尚未完成，请先补齐候选审核。')
  expect(screen.queryByLabelText('最终审核理由')).not.toBeInTheDocument()
  expect(api.finalizeNativeEvaluation).not.toHaveBeenCalled()
})
it.each(['version', 'release', 'missing_gate', 'invalid_metric'])('rejects unbound or incomplete gate preview: %s', async (kind) => {
  const value = gates()
  if (kind === 'version') value.version = 7
  if (kind === 'release') value.release_fingerprint = 'sha256:' + 'f'.repeat(64)
  if (kind === 'missing_gate') delete (value.gate_result.gate_passes as Partial<Record<api.NativeGateID, boolean>>).G5
  if (kind === 'invalid_metric') value.gate_result.metrics = [{ name: 'success', numerator: 1, denominator: 1, value: NaN, threshold: 0.9 }]
  await openGates(value)
  await screen.findByText(kind === 'version' || kind === 'release' ? '门槛结果与当前任务版本不一致，请重新查询任务。' : '门槛结果不完整，请重新读取。')
  expect(screen.queryByLabelText('最终审核理由')).not.toBeInTheDocument()
})
it.each([409, 504])('recovers unknown finalization %s only by reading the original task after reload', async (status) => {
  (api.finalizeNativeEvaluation as jest.Mock).mockResolvedValue([{ status }, undefined])
  const view = await openGates()
  await confirmFinalization()
  await screen.findByText('最终审核结果尚未确认，请查询原任务，暂不重复确认。')
  view.unmount()
  render(<NativeEvaluationWorkspace owner="u1" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('最终审核结果尚未确认，请保留原任务并稍后查询。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('finalize')
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(finalized()))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('本轮最终审核已通过；配置是否生效需查询发布状态')
  expect(api.finalizeNativeEvaluation).toHaveBeenCalledTimes(1)
})
it.each(['missing', 'version', 'decision', 'reason', 'time'])('locks a mismatched finalization receipt: %s', async (kind) => {
  const value = finalized()
  const receipt = value.finalization as api.NativeFinalization
  if (kind === 'missing') delete value.finalization
  if (kind === 'version') receipt.source_version = 7
  if (kind === 'decision') receipt.passed = false
  if (kind === 'reason') receipt.reason = '其他操作'
  if (kind === 'time') receipt.finalized_at = '2026-09-13T02:00:00Z'
  ;(api.finalizeNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
  await openGates()
  await confirmFinalization()
  await screen.findByText('最终审核结果尚未确认，请查询原任务，暂不重复确认。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBe('finalize')
})
it('requires fresh gates after definite finalization rejection', async () => {
  (api.finalizeNativeEvaluation as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  await openGates()
  await confirmFinalization()
  await screen.findByText('最终审核被拒绝，请重新查询任务并读取门槛。')
  expect(screen.queryByLabelText('最终审核理由')).not.toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBeNull()
})
it('does not finalize when the pending operation cannot be persisted', async () => {
  await openGates()
  await screen.findByLabelText('最终审核理由')
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  await confirmFinalization()
  await screen.findByText('无法保存最终审核记录，本次未发送。')
  expect(api.finalizeNativeEvaluation).not.toHaveBeenCalled()
})
it('discards old preview and confirmation when the task is reread', async () => {
  await openGates()
  await screen.findByLabelText('最终审核理由')
  fireEvent.change(screen.getByLabelText('最终审核理由'), { target: { value: '核对' } })
  fireEvent.click(screen.getByLabelText('我已核对当前门槛，确认本轮最终审核通过'))
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(9, 'awaiting_review')))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('9')
  expect(screen.queryByLabelText('最终审核理由')).not.toBeInTheDocument()
  expect(api.finalizeNativeEvaluation).not.toHaveBeenCalled()
})

it('hands an approved task to publication preparation even with a retained completed journal', async () => {
  journal(null)
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(finalized()))
  const handoff = jest.fn()
  render(<NativeEvaluationWorkspace owner="u1" selection={{}} onPublish={handoff} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  const button = await screen.findByRole('button', { name: '前往核对并发布配置' })
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('u1')) || '{}').pending).toBeNull()
  expect(button).not.toBeDisabled()
  fireEvent.click(button)
  expect(handoff).toHaveBeenCalledWith(id)
  expect(api.finalizeNativeEvaluation).not.toHaveBeenCalled()
})
