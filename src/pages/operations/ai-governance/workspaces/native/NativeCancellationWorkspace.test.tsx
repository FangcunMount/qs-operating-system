import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import { NativeEvaluationWorkspace } from './NativeEvaluationWorkspace'
import { NativeCancellationWorkspace } from './NativeCancellationWorkspace'
import { evaluationJournalKey } from './useNativeEvaluation'
import { releaseKeys } from './evaluationValidation'
import { cancellationReceipt, canRequestCancellation } from './cancellationValidation'

jest.mock('@/api/path/aiWorkflow', () => ({ getNativeEvaluation: jest.fn(), cancelNativeEvaluation: jest.fn(), listNativeCandidates: jest.fn() }))
const id = '44444444-4444-4444-8444-444444444444'
const fp = 'sha256:' + 'a'.repeat(64)
const reason = '保留证据，结束此次任务'
const release = Object.fromEntries(releaseKeys.map((key) => [key, { id: key, version: 'v1', fingerprint: fp }])) as unknown as api.EvaluationRelease
const state = (status: api.EvaluationStatus = 'requested'): api.NativeEvaluationState => ({ run_id: id, version: 7, status,
  unresolved_result_unknown_count: 0, resolutions: [], reviews: [], review_reopenings: [],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1', run_id: id, release,
    release_fingerprint: fp, requested_by: 'user:42', request_reason: '原案例', created_at: '2026-09-13T00:00:00Z' } })
function canceled(status: api.NativeCancellationReceipt['source_status'] = 'requested'): api.NativeEvaluationState {
  return { ...state(), version: 8, status: 'canceled', cancellation: {
    schema_version: 'qs-ai-evaluation-cancellation/v1', run_id: id, source_version: 7, version: 8, source_status: status,
    status: 'canceled', release_fingerprint: fp, actor: 'user:42', reason, discard: status === 'awaiting_review',
    canceled_at: '2026-09-13T02:00:00Z', execution_id: '', invocation_id: ''
  } }
}
const ok = (data: unknown) => [null, { data }]
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear() })
afterEach(() => jest.restoreAllMocks())
async function open(run = state()) {
  (api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(run))
  const view = render(<NativeEvaluationWorkspace owner="42" selection={{}} />)
  fireEvent.change(screen.getByLabelText('评测任务标识'), { target: { value: id } })
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByLabelText('取消或废弃理由')
  return view
}
function confirm(discard = false) {
  fireEvent.change(screen.getByLabelText('取消或废弃理由'), { target: { value: `  ${reason}  ` } })
  fireEvent.click(screen.getByLabelText(discard ? '我确认废弃本次评审并保留原始证据' : '我确认取消本次评测并保留原始证据'))
  fireEvent.click(screen.getByText(discard ? '确认废弃评审' : '确认取消评测'))
}
it.each(['requested', 'collecting', 'blocked', 'awaiting_review'] as const)(
  'sends one explicit %s cancellation and shows original audit', async (status) => {
    (api.cancelNativeEvaluation as jest.Mock).mockResolvedValue(ok(canceled(status)))
    await open(state(status))
    const discard = status === 'awaiting_review'
    expect(screen.getByText(discard ? '确认废弃评审' : '确认取消评测').closest('button')).toBeDisabled()
    confirm(discard)
    await screen.findByText(discard ? '评审已废弃' : '取消记录')
    expect(api.cancelNativeEvaluation).toHaveBeenCalledTimes(1)
    expect(api.cancelNativeEvaluation).toHaveBeenCalledWith(id, { expected_version: 7, reason, confirm: true, discard })
    expect(sessionStorage.getItem(evaluationJournalKey('42'))).not.toContain(reason)
    expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBeNull()
  })
it('requires renewed confirmation after a reason or version change', () => {
  const cancel = jest.fn()
  const view = render(<NativeCancellationWorkspace run={state()} locked={false} cancel={cancel} />)
  fireEvent.change(screen.getByLabelText('取消或废弃理由'), { target: { value: reason } })
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByRole('button')).toBeEnabled()
  fireEvent.change(screen.getByLabelText('取消或废弃理由'), { target: { value: '修改理由' } })
  expect(screen.getByRole('button')).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox'))
  view.rerender(<NativeCancellationWorkspace run={{ ...state(), version: 8 }} locked={false} cancel={cancel} />)
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(cancel).not.toHaveBeenCalled()
})
it('does not offer ordinary cancellation for unknown calls, terminal or legacy states', () => {
  const cancel = jest.fn()
  const unknown = { ...state('blocked'), unresolved_result_unknown_count: 1 }
  const view = render(<NativeCancellationWorkspace run={unknown} locked={false} cancel={cancel} />)
  expect(screen.getByText(/存在结果未知的调用/)).toBeInTheDocument()
  expect(screen.queryByLabelText('取消或废弃理由')).not.toBeInTheDocument()
  for (const run of [state('approved'), state('rejected'), state('canceled'), { ...state(), creation: undefined }]) {
    view.rerender(<NativeCancellationWorkspace run={run} locked={false} cancel={cancel} />)
    expect(canRequestCancellation(run)).toBe(false)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  }
})
it('stores recovery identity before sending and prevents double submission', async () => {
  let finish: (value: unknown) => void = () => undefined
  ;(api.cancelNativeEvaluation as jest.Mock).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  await open()
  confirm()
  fireEvent.click(screen.getByText('确认取消评测'))
  expect(api.cancelNativeEvaluation).toHaveBeenCalledTimes(1)
  const journal = JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}')
  expect(journal).toMatchObject({ pending: 'cancel', expectedVersion: 7,
    cancellation: { actor: 'user:42', discard: false, sourceStatus: 'requested' } })
  expect(JSON.stringify(journal)).not.toContain(reason)
  finish(ok(canceled()))
  await screen.findByText('取消记录')
})
it('does not send when recovery storage fails', async () => {
  await open()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('unavailable') })
  confirm()
  await screen.findByText('无法保存取消记录，本次未发送。')
  expect(api.cancelNativeEvaluation).not.toHaveBeenCalled()
})
it('requires a new read after definite permission rejection', async () => {
  (api.cancelNativeEvaluation as jest.Mock).mockResolvedValue([{ response: { status: 403 } }, undefined])
  await open()
  confirm()
  await screen.findByText('取消被拒绝，请重新查询任务并检查管理权限。')
  expect(screen.queryByLabelText('取消或废弃理由')).not.toBeInTheDocument()
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBeNull()
})
it.each([409, 504])('recovers %s through original receipt after reload without replay', async (status) => {
  (api.cancelNativeEvaluation as jest.Mock).mockResolvedValue([{ response: { status } }, undefined])
  const view = await open()
  confirm()
  await screen.findByText('取消结果尚未确认，请查询原任务，暂不重复提交。')
  expect(screen.getByText('确认取消评测').closest('button')).toBeDisabled()
  view.unmount()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(canceled()))
  render(<NativeEvaluationWorkspace owner="42" selection={{}} />)
  expect(screen.getByLabelText('评测任务标识')).toHaveValue(id)
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('取消记录')
  expect(api.cancelNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBeNull()
})
it.each([
  { actor: 'user:99' }, { source_version: 6 }, { release_fingerprint: 'sha256:' + 'b'.repeat(64) },
  { source_status: 'blocked' }, { discard: true }, { reason: '另一次操作' }
])('keeps malformed or mismatched response pending: %j', async (patch) => {
  const result = canceled()
  result.cancellation = { ...(result.cancellation as api.NativeCancellationReceipt), ...patch }
  ;(api.cancelNativeEvaluation as jest.Mock).mockResolvedValue(ok(result))
  await open()
  confirm()
  await screen.findByText('取消结果尚未确认，请查询原任务，暂不重复提交。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBe('cancel')
  expect(screen.queryByText('取消记录')).not.toBeInTheDocument()
})
it('keeps same-version read uncertain and recognizes a later noncanceled CAS as not accepted', async () => {
  (api.cancelNativeEvaluation as jest.Mock).mockResolvedValue([{ response: { status: 409 } }, undefined])
  await open(state('collecting'))
  confirm()
  await screen.findByText('取消结果尚未确认，请查询原任务，暂不重复提交。')
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('取消结果尚未确认，请保留原任务并稍后查询。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBe('cancel')
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok({ ...state('blocked'), version: 8 }))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('任务已推进，此次取消未生效；请按最新状态重新操作。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBeNull()
  expect(api.cancelNativeEvaluation).toHaveBeenCalledTimes(1)
})
it('does not recover another operator cancellation as this request', async () => {
  (api.cancelNativeEvaluation as jest.Mock).mockResolvedValue([{ response: { status: 504 } }, undefined])
  await open()
  confirm()
  await screen.findByText('取消结果尚未确认，请查询原任务，暂不重复提交。')
  const result = canceled()
  result.cancellation = { ...(result.cancellation as api.NativeCancellationReceipt), actor: 'user:99' }
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(result))
  fireEvent.click(screen.getByText('查询任务状态'))
  await screen.findByText('尚未取得本次取消的原始回执，请保留原任务并查询。')
  expect(JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}').pending).toBe('cancel')
})
it('does not use another account journal', async () => {
  (api.cancelNativeEvaluation as jest.Mock).mockResolvedValue([{ response: { status: 504 } }, undefined])
  const view = await open()
  confirm()
  await screen.findByText('取消结果尚未确认，请查询原任务，暂不重复提交。')
  view.unmount()
  render(<NativeEvaluationWorkspace owner="99" selection={{}} />)
  await waitFor(() => expect(screen.getByLabelText('评测任务标识')).toHaveValue(''))
  expect(api.cancelNativeEvaluation).toHaveBeenCalledTimes(1)
})
it('validates prepared references and cancellation after the last audit', () => {
  const run = canceled('collecting')
  const receipt = run.cancellation as api.NativeCancellationReceipt
  receipt.execution_id = 'execution:1'
  expect(() => cancellationReceipt(run)).toThrow()
  receipt.invocation_id = 'invocation:1'
  expect(cancellationReceipt(run).execution_id).toBe('execution:1')
  run.reviews = [{ reviewed_at: '2026-09-13T03:00:00Z' }]
  expect(() => cancellationReceipt(run)).toThrow(/时间/)
})
