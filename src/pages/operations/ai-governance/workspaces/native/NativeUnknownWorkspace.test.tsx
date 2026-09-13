import { fireEvent, render, screen } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import { NativeEvaluationWorkspace } from './NativeEvaluationWorkspace'
import { evaluationJournalKey } from './useNativeEvaluation'
import { releaseKeys } from './evaluationValidation'
import { checkUnknownIndex, confirmsResolution } from './unknownValidation'

jest.mock('@/api/path/aiWorkflow',
  () => ({ getNativeEvaluation: jest.fn(),
    listNativeUnknowns: jest.fn(),
    resolveNativeUnknown: jest.fn(),
    listNativeCandidates: jest.fn() }))
const id = '44444444-4444-4444-8444-444444444444'
const fp = 'sha256:' + 'a'.repeat(64)
const release = Object.fromEntries(releaseKeys.map((key) => [key, { id: key, version: 'v1', fingerprint: fp }])) as unknown as api.EvaluationRelease
const blocked = (): api.NativeEvaluationState => ({ run_id: id,
  version: 7,
  status: 'blocked',
  unresolved_result_unknown_count: 1,
  resolutions: [],
  reviews: [],
  review_reopenings: [],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1',
    run_id: id,
    release,
    release_fingerprint: fp,
    requested_by: 'user:42',
    request_reason: '原案例',
    created_at: '2026-09-13T00:00:00Z' } })
const unknowns = (): api.NativeUnknownIndex => ({ run_id: id,
  version: 7,
  status: 'blocked',
  release_fingerprint: fp,
  unresolved_result_unknown_count: 1,
  can_resolve: true,

  executions: [{ execution_id: 'execution:1',
    invocation_id: 'invocation:1',
    kind: 'generation',
    case_id: 'case:1',
    slot_ordinal: 1,
    candidate_id: '',
    execution_ordinal: 1,
    started_at: '2026-09-13T01:00:00Z',
    finished_at: '2026-09-13T01:01:00Z',
    provider_call_count: 1,
    failure_stage: 'generation_execution',
    failure_code: 'provider_timeout',
    target_execution_count: 1,
    target_execution_limit: 2,
    stage_execution_count: 1,
    stage_execution_limit: 70,
    replacement_allowed: true }] })
const resolved = (decision: api.NativeResolutionDecision = 'cancel_run'): api.NativeEvaluationState => ({ ...blocked(),
  version: 8,
  status: decision === 'cancel_run' ? 'canceled' : 'collecting',
  unresolved_result_unknown_count: 0,

  resolutions: [{ execution_id: 'execution:1',
    decision,
    actor: 'user:42',
    reason: '已核对供应商记录',
    acknowledged_duplicate_call_and_cost_risk: true,
    resolved_at: '2026-09-13T02:00:00Z' }] })
const ok = (data: unknown) => [null, { data }]
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(blocked()))
  ;(api.listNativeUnknowns as jest.Mock).mockResolvedValue(ok(unknowns()))
  ;(api.resolveNativeUnknown as jest.Mock).mockResolvedValue(ok(resolved()))
})
afterEach(() => jest.restoreAllMocks())
async function open() {
  const view = render(<NativeEvaluationWorkspace owner="42" selection={{}} />)
  fireEvent.change(screen.getByLabelText('评测任务标识'), { target: { value: id } })
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('执行受阻，需核对')
  fireEvent.click(screen.getByText('读取待核对调用'))
  await screen.findByRole('combobox', { name: '待核对调用' })
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '待核对调用' }))
  fireEvent.click(await screen.findByText('生成 · case:1 · 槽位 1 · 第 1 次'))
  await screen.findByLabelText('调用处置理由')
  return view
}
function confirm() {
  fireEvent.change(screen.getByLabelText('调用处置理由'), { target: { value: '已核对供应商记录' } })
  fireEvent.click(screen.getByLabelText('我已了解原调用结果未知及重复调用、额外费用的风险'))
  fireEvent.click(screen.getByLabelText('我确认对选中的原调用执行上述处置'))
  fireEvent.click(screen.getByText('确认处置'))
}
it.each(['cancel_run',
  'authorize_replacement'] as api.NativeResolutionDecision[])('resolves inspected original call once with explicit %s confirmation',
  async (decision) => {
    (api.resolveNativeUnknown as jest.Mock).mockResolvedValue(ok(resolved(decision)))
    await open()
    expect(api.listNativeUnknowns).toHaveBeenCalledWith(id, 7)
    expect(screen.getByText('确认处置').closest('button')).toBeDisabled()
    if (decision === 'authorize_replacement') fireEvent.click(screen.getByLabelText('批准该调用的替代执行'))
    confirm()
    await screen.findByText(decision === 'cancel_run' ? '已取消' : '正在评测')
    expect(api.resolveNativeUnknown).toHaveBeenCalledTimes(1)
    expect(api.resolveNativeUnknown).toHaveBeenCalledWith(id,
      { expected_version: 7,
        execution_id: 'execution:1',
        decision,
        reason: '已核对供应商记录',
        confirm: true,
        acknowledged_duplicate_call_and_cost_risk: true })
    expect(sessionStorage.getItem(evaluationJournalKey('42'))).not.toContain('已核对供应商记录')
  })
it.each([409, 504])('preserves uncertain %s across reload until matching original resolution is read', async (status) => {
  (api.resolveNativeUnknown as jest.Mock).mockResolvedValue([{ status }, undefined])
  const view = await open()
  confirm()
  await screen.findByText('处置结果尚未确认，请查询原任务，暂不重复提交。')
  view.unmount()
  render(<NativeEvaluationWorkspace owner="42" selection={{}} />)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('处置结果尚未确认，请保留原任务并稍后查询。')
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok({ ...blocked(), version: 8 }))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('尚未取得与原调用及操作人一致的处置记录，请保留原任务。')
  expect(screen.getByText('结束查看，准备另一评测').closest('button')).toBeDisabled()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(resolved()))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('已取消')
  expect(api.resolveNativeUnknown).toHaveBeenCalledTimes(1)
})
it('does not send when pending journal cannot be saved', async () => {
  await open()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  confirm()
  await screen.findByText('无法保存处置记录，本次未发送。')
  expect(api.resolveNativeUnknown).not.toHaveBeenCalled()
})
it('requires new read after definitive authorization rejection', async () => {
  (api.resolveNativeUnknown as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  await open()
  confirm()
  await screen.findByText('处置被拒绝，请重新查询任务并检查管理权限。')
  expect(screen.queryByText('确认处置')).not.toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBeNull()
})
it('keeps another account away from pending resolution journal', async () => {
  (api.resolveNativeUnknown as jest.Mock).mockResolvedValue([{ status: 504 }, undefined])
  const view = await open()
  confirm()
  await screen.findByText('处置结果尚未确认，请查询原任务，暂不重复提交。')
  view.unmount()
  render(<NativeEvaluationWorkspace owner="43" selection={{}} />)
  expect(screen.getByLabelText('评测任务标识')).toHaveValue('')
  expect(sessionStorage.getItem(evaluationJournalKey('42'))).toContain('execution:1')
})
it('disables replacement when current server view does not allow it', async () => {
  const value = unknowns(); value.executions[0].replacement_allowed = false
  ;(api.listNativeUnknowns as jest.Mock).mockResolvedValue(ok(value))
  await open()
  expect(screen.getByLabelText('批准该调用的替代执行')).toBeDisabled()
})
it('does not submit twice while the original request is still pending', async () => {
  let finish!: (value: unknown) => void
  ;(api.resolveNativeUnknown as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  await open()
  fireEvent.change(screen.getByLabelText('调用处置理由'), { target: { value: '已核对供应商记录' } })
  fireEvent.click(screen.getByLabelText('我已了解原调用结果未知及重复调用、额外费用的风险'))
  fireEvent.click(screen.getByLabelText('我确认对选中的原调用执行上述处置'))
  const button = screen.getByText('确认处置')
  fireEvent.click(button)
  fireEvent.click(button)
  expect(api.resolveNativeUnknown).toHaveBeenCalledTimes(1)
  finish(ok(resolved()))
  await screen.findByText('已取消')
})
it('keeps mismatched successful response pending until the original receipt can be read', async () => {
  const value = resolved()
  ;(value.resolutions[0] as Record<string, unknown>).actor = 'user:43'
  ;(api.resolveNativeUnknown as jest.Mock).mockResolvedValue(ok(value))
  await open()
  confirm()
  await screen.findByText('处置结果尚未确认，请查询原任务，暂不重复提交。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBe('resolve')
  expect(screen.getByText('结束查看，准备另一评测').closest('button')).toBeDisabled()
})
it('requires fresh confirmation when switching the resolution decision', async () => {
  await open()
  fireEvent.change(screen.getByLabelText('调用处置理由'), { target: { value: '已核对供应商记录' } })
  fireEvent.click(screen.getByLabelText('我已了解原调用结果未知及重复调用、额外费用的风险'))
  fireEvent.click(screen.getByLabelText('我确认对选中的原调用执行上述处置'))
  expect(screen.getByText('确认处置').closest('button')).toBeEnabled()
  fireEvent.click(screen.getByLabelText('批准该调用的替代执行'))
  expect(screen.getByText('确认处置').closest('button')).toBeDisabled()
  expect(api.resolveNativeUnknown).not.toHaveBeenCalled()
})
it('keeps canceled unresolved calls readable for audit without offering another write', async () => {
  const run = { ...blocked(), status: 'canceled' as const }
  const view = { ...unknowns(), status: 'canceled' as const, can_resolve: false }
  view.executions[0].replacement_allowed = false
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(run))
  ;(api.listNativeUnknowns as jest.Mock).mockResolvedValue(ok(view))
  render(<NativeEvaluationWorkspace owner="42" selection={{}} />)
  fireEvent.change(screen.getByLabelText('评测任务标识'), { target: { value: id } })
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('已取消')
  fireEvent.click(screen.getByText('读取待核对调用'))
  await screen.findByText('当前任务仅可审计，不接受新的处置。')
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '待核对调用' }))
  fireEvent.click(await screen.findByText('生成 · case:1 · 槽位 1 · 第 1 次'))
  await screen.findByText('execution:1', { selector: 'span.ant-typography' })
  expect(screen.queryByText('确认处置')).not.toBeInTheDocument()
  expect(api.resolveNativeUnknown).not.toHaveBeenCalled()
})
it.each(['version', 'fingerprint', 'duplicate', 'candidate', 'time'])('rejects inconsistent unknown view %s', (caseName) => {
  const value = unknowns()
  if (caseName === 'version') value.version++
  if (caseName === 'fingerprint') value.release_fingerprint = 'sha256:' + 'b'.repeat(64)
  if (caseName === 'duplicate') value.executions.push({ ...value.executions[0] })
  if (caseName === 'candidate') value.executions[0].candidate_id = 'unexpected'
  if (caseName === 'time') value.executions[0].finished_at = 'invalid'
  expect(() => checkUnknownIndex(value, blocked())).toThrow()
})
it.each(['execution_id',
  'actor',
  'decision',
  'acknowledged_duplicate_call_and_cost_risk'])('rejects unrelated or unconfirmed resolution %s',
  (field) => {
    const value = resolved(); (value.resolutions[0] as Record<string, unknown>)[field] = 'wrong'
    expect(() => confirmsResolution(value, { executionID: 'execution:1', decision: 'cancel_run', actor: 'user:42' }, 7)).toThrow()
  })
