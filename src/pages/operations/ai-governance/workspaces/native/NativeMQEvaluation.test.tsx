import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import { getMessagingOperation } from '@/api/path/aiWorkflow/operations'
import type { MessagingOperation } from '@/api/path/aiWorkflow/operations'
import * as commands from './commands'
import { useNativeEvaluation, evaluationJournalKey } from './useNativeEvaluation'
import { releaseKeys } from './evaluationValidation'

jest.mock('@/api/path/aiWorkflow', () => ({
  getNativeEvaluation: jest.fn(), startNativeEvaluation: jest.fn(), cancelNativeEvaluation: jest.fn()
}))
jest.mock('@/api/path/aiWorkflow/operations', () => ({
  ...jest.requireActual('@/api/path/aiWorkflow/operations'), getMessagingOperation: jest.fn()
}))
const runID = '44444444-4444-4444-8444-444444444444'
const commandID = '55555555-5555-4555-8555-555555555555'
const fp = 'sha256:' + 'a'.repeat(64)
const reason = '保留原意图与配置'
const release = Object.fromEntries(releaseKeys.map((key) => [key, { id: key, version: 'v1', fingerprint: fp }])) as unknown as api.EvaluationRelease
const state = (status: api.EvaluationStatus = 'requested', version = 7): api.NativeEvaluationState => ({
  run_id: runID, version, status, unresolved_result_unknown_count: 0, resolutions: [], reviews: [], review_reopenings: [],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1', run_id: runID, release,
    release_fingerprint: fp, requested_by: 'user:42', request_reason: '原冻结评测', created_at: '2026-09-13T00:00:00Z' }
})
const canceled = (): api.NativeEvaluationState => ({ ...state('canceled', 8), cancellation: {
  schema_version: 'qs-ai-evaluation-cancellation/v1', run_id: runID, source_version: 7, version: 8,
  source_status: 'requested', status: 'canceled', release_fingerprint: fp, actor: 'user:42', reason,
  discard: false, canceled_at: '2026-09-13T02:00:00Z', execution_id: '', invocation_id: ''
} })
const ok = (data: unknown) => [null, { data }]
const submitted = () => ok({ operation_id: commandID, command_id: commandID, status: 'submitted', status_url: '/ignored' })
const decision = (status: 'accepted' | 'rejected' | 'held' = 'accepted'): MessagingOperation => ({
  operation_id: commandID, command_id: commandID, resource_id: runID, status, decision: status,
  transport_status: status === 'held' ? 'held' : 'confirmed',
  receipt: { command_id: commandID, command_body_sha256: 'a'.repeat(64),
    decision: status === 'accepted' ? 'ACCEPTED' : status === 'held' ? 'HELD' : 'REJECTED',
    ...(status === 'accepted' ? { evaluation_receipt: { run_id: runID, status: 'collecting', version: '8' } } : {}) }
})
const saved = () => JSON.parse(sessionStorage.getItem(evaluationJournalKey('42')) || '{}')
function Harness() {
  const c = useNativeEvaluation('42', {})
  return <div>
    <button onClick={() => c.read(runID)}>read</button>
    <button onClick={() => c.start(reason, true)}>start</button>
    <button onClick={() => c.cancel(reason, true, false)}>cancel</button>
    <span data-testid="pending">{c.journal?.pending || 'none'}</span>
    <span data-testid="run">{c.run?.status || 'unread'}</span>
    <span>{c.error}</span>
  </div>
}
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(commandID)
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state()))
  ;(api.startNativeEvaluation as jest.Mock).mockResolvedValue(submitted())
  ;(api.cancelNativeEvaluation as jest.Mock).mockResolvedValue(submitted())
  ;(getMessagingOperation as jest.Mock).mockResolvedValue(decision())
})
afterEach(() => jest.restoreAllMocks())
async function open() {
  const view = render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await waitFor(() => expect(screen.getByTestId('run')).toHaveTextContent('requested'))
  return view
}

it.each(['start', 'cancel'] as const)('persists %s identity and intent before POST; 202 cannot clear it', async (action) => {
  let settle: (value: MessagingOperation) => void = () => undefined
  ;(getMessagingOperation as jest.Mock).mockImplementation(() => new Promise((resolve) => { settle = resolve }))
  const write = action === 'start' ? api.startNativeEvaluation : api.cancelNativeEvaluation
  ;(write as jest.Mock).mockImplementation((_id, command) => {
    expect(saved()).toMatchObject({ commandID, transport: 'mq', pending: action,
      commandIntent: { reason, confirm: true, ...(action === 'cancel' ? { discard: false } : {}) } })
    expect(command.command_id).toBe(commandID)
    return Promise.resolve(submitted())
  })
  await open()
  fireEvent.click(screen.getByText(action))
  await waitFor(() => expect(getMessagingOperation).toHaveBeenCalled())
  expect(saved().pending).toBe(action)
  expect(screen.getByTestId('run')).toHaveTextContent('requested')
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(action === 'cancel' ? canceled() : state('collecting', 8)))
  await act(async () => settle(decision()))
  await waitFor(() => expect(saved().pending).toBeNull())
  expect(saved()).toMatchObject({ runID, releaseFingerprint: fp, lastVersion: 8 })
  expect(write).toHaveBeenCalledTimes(1)
})

it.each(['start', 'cancel'] as const)('retains timed out %s across refresh even when a later run is visible', async (action) => {
  const write = action === 'start' ? api.startNativeEvaluation : api.cancelNativeEvaluation
  ;(write as jest.Mock).mockResolvedValue([{ response: { status: 504 } }, undefined])
  const view = await open()
  fireEvent.click(screen.getByText(action))
  await waitFor(() => expect(screen.getByText(action === 'start' ? '启动结果尚未确认，请查询原任务，暂不重复启动。' : '取消结果尚未确认，请查询原任务，暂不重复提交。')).toBeInTheDocument())
  const original = saved()
  view.unmount()
  ;(getMessagingOperation as jest.Mock).mockRejectedValue(new Error('missing'))
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state('blocked', 9)))
  render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await screen.findByText('原命令决定尚未核对。请保留编号继续查询。')
  expect(saved()).toEqual(original)
  expect(api.getNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(write).toHaveBeenCalledTimes(1)
  expect(commands.newCommandID).toHaveBeenCalledTimes(1)
})

it.each(['held', 'rejected'] as const)('distinguishes durable %s from acceptance and preserves the frozen run', async (status) => {
  (getMessagingOperation as jest.Mock).mockResolvedValue(decision(status))
  await open()
  fireEvent.click(screen.getByText('start'))
  await screen.findByText(status === 'held' ? '原命令技术挂起，接单结果尚未确认。请保留编号继续核对。' : '服务端拒绝了原命令。请读取当前任务状态、权限和额度后再决定。')
  expect(saved()).toMatchObject({ runID, releaseFingerprint: fp, pending: status === 'held' ? 'start' : null, lastVersion: 7 })
  expect(api.getNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(api.startNativeEvaluation).toHaveBeenCalledTimes(1)
})

it.each(['wrong-resource', 'unsafe-version', 'wrong-frozen-config'])(
  'keeps accepted command pending when %s cannot be reconciled', async (risk) => {
    const operation = decision()
    if (risk === 'wrong-resource') operation.resource_id = commandID
    const receipt = operation.receipt?.evaluation_receipt
    if (risk === 'unsafe-version' && receipt) receipt.version = '9007199254740993'
    ;(getMessagingOperation as jest.Mock).mockResolvedValue(operation)
    await open()
    const value = state('collecting', 8)
    if (risk === 'wrong-frozen-config' && value.creation) value.creation.release_fingerprint = 'sha256:' + 'b'.repeat(64)
    ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
    fireEvent.click(screen.getByText('start'))
    await waitFor(() => expect(getMessagingOperation).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('start'))
    await waitFor(() => expect(screen.getByText(/请保留编号|请保留原任务标识/)).toBeInTheDocument())
    expect(saved()).toMatchObject({ commandID, pending: 'start', releaseFingerprint: fp })
  }
)

it('cannot confirm cancellation with the receipt of a different intent', async () => {
  await open()
  const value = canceled()
  const receipt = value.cancellation as api.NativeCancellationReceipt
  receipt.reason = '另一次取消意图'
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(value))
  fireEvent.click(screen.getByText('cancel'))
  await screen.findByText('原取消意图尚未核对，请保留编号。')
  expect(saved()).toMatchObject({ commandID, pending: 'cancel', commandIntent: { reason, confirm: true, discard: false } })
  expect(api.cancelNativeEvaluation).toHaveBeenCalledTimes(1)
})

it('ignores a decision arriving after unmount and recovers by reading the same operation', async () => {
  let settle: (value: MessagingOperation) => void = () => undefined
  ;(getMessagingOperation as jest.Mock).mockImplementation(() => new Promise((resolve) => { settle = resolve }))
  const view = await open()
  fireEvent.click(screen.getByText('start'))
  await waitFor(() => expect(getMessagingOperation).toHaveBeenCalled())
  view.unmount()
  await act(async () => settle(decision()))
  expect(saved().pending).toBe('start')
  ;(getMessagingOperation as jest.Mock).mockResolvedValue(decision())
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state('collecting', 8)))
  render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await waitFor(() => expect(saved().pending).toBeNull())
  expect(getMessagingOperation).toHaveBeenLastCalledWith(commandID)
  expect(api.startNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(commands.newCommandID).toHaveBeenCalledTimes(1)
})


it('keeps publisher-held evaluation intent without claiming AI acceptance', async () => {
  (api.startNativeEvaluation as jest.Mock).mockResolvedValue(submitted())
  ;(getMessagingOperation as jest.Mock).mockResolvedValue({ operation_id: commandID, command_id: commandID,
    resource_id: runID, status: 'submitted', transport_status: 'held' })
  render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await screen.findByText('requested')
  fireEvent.click(screen.getByText('start'))
  await screen.findByText('原命令投递已技术挂起，尚未取得 AI 接单决定。请保留编号继续核对。')
  expect(saved()).toMatchObject({ runID, releaseFingerprint: fp, pending: 'start', lastVersion: 7 })
  expect(api.startNativeEvaluation).toHaveBeenCalledTimes(1)
  expect(getMessagingOperation).toHaveBeenCalledTimes(1)
  expect(api.getNativeEvaluation).toHaveBeenCalledTimes(1)
})
