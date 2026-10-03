import { act, fireEvent, render, screen } from '@testing-library/react'
import { getParticipantExecution, getParticipantRetryReceipt, retryParticipant } from '@/api/path/aiWorkflow'
import { getMessagingOperation } from '@/api/path/aiWorkflow/operations'
import { NativeParticipantRetryWorkspace } from './NativeParticipantRetryWorkspace'

jest.mock('@/api/path/aiWorkflow', () => ({ getParticipantExecution: jest.fn(), getParticipantRetryReceipt: jest.fn(), retryParticipant: jest.fn() }))
jest.mock('@/api/path/aiWorkflow/operations', () => ({ ...jest.requireActual('@/api/path/aiWorkflow/operations'), getMessagingOperation: jest.fn() }))
jest.mock('./commands', () => ({ ...jest.requireActual('./commands'), newCommandID: () => '00000000-0000-4000-8000-000000000009' }))
const operation = getMessagingOperation as jest.Mock
const read = getParticipantExecution as jest.Mock
const retry = retryParticipant as jest.Mock
const receipt = getParticipantRetryReceipt as jest.Mock
const sessionID = '00000000-0000-4000-8000-000000000001'
const runID = '00000000-0000-4000-8000-000000000002'
const commandID = '00000000-0000-4000-8000-000000000009'
const state = {
  organization_id: 1, session_id: sessionID, request_id: 'original-request', run_id: runID,
  version: 4, status: 'blocked', subject_id: '42', testee_id: '7', assessment_ids: ['99'],
  failure_code: 'provider_result_unknown', model_call_status: 'unknown', invocation_id: 'original-call',
  source_run_id: '', can_retry: true, unknown_result_risk: true, retry_provider_invocations: 1
}
const accepted = { session_id: sessionID, run_id: '00000000-0000-4000-8000-000000000003', version: 5, status: 'queued' }
const pendingKey = 'qs-ai:participant-retry:v1:owner'
beforeEach(() => {
  jest.resetAllMocks()
  sessionStorage.clear()
  read.mockResolvedValue([null, { data: state }])
  operation.mockRejectedValue(new Error('legacy query unavailable'))
})
async function select() {
  fireEvent.change(screen.getByLabelText('参与者会话编号'), { target: { value: sessionID } })
  fireEvent.click(screen.getByText('查询参与者执行'))
  await screen.findByText('已阻塞')
  fireEvent.change(screen.getByLabelText('参与者重试理由'), { target: { value: '重新核对后重试' } })
  fireEvent.click(screen.getByText('确认新增一次模型调用及费用'))
}
it('rejects a retired immediate retry reply without erasing original intent or reposting after refresh', async () => {
  retry.mockResolvedValue([null, { data: accepted }])
  const view = render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText(/命令结果尚未确认/)
  const original = sessionStorage.getItem(pendingKey)
  expect(JSON.parse(original || '{}')).toMatchObject({ sessionID, runID, commandID, transport: 'mq',
    reason: '重新核对后重试', acceptResultUnknownRisk: true })
  expect(screen.queryByText('重试已受理，等待执行')).not.toBeInTheDocument()
  expect(operation).not.toHaveBeenCalled()
  view.unmount()
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  fireEvent.click(await screen.findByText('查询原重试回执'))
  await screen.findByText(/未找到回执也不代表命令未提交/)
  expect(sessionStorage.getItem(pendingKey)).toBe(original)
  expect(receipt).not.toHaveBeenCalled()
  expect(retry).toHaveBeenCalledTimes(1)
})

it('requires unknown-result risk confirmation and posts one version-bound command', async () => {
  retry.mockResolvedValue([null, { data: submitted }])
  operation.mockResolvedValue(acceptedOperation)
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  expect(screen.getByText('确认重试原解读').closest('button')).toBeDisabled()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText('重试已受理，等待执行')
  expect(retry).toHaveBeenCalledTimes(1)
  expect(retry).toHaveBeenCalledWith(sessionID, { command_id: commandID, expected_run_id: runID, expected_version: 4,
    reason: '重新核对后重试', confirm: true, expected_provider_invocations: 1, accept_result_unknown_risk: true })
  expect(sessionStorage.getItem(pendingKey)).toBeNull()
})
it('keeps an uncertain command through remount and missing receipt without another post', async () => {
  retry.mockResolvedValue([new Error('timeout')])
  operation.mockRejectedValueOnce({ status: 404 }).mockResolvedValueOnce(acceptedOperation)
  const view = render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText(/命令结果尚未确认/)
  expect(sessionStorage.getItem(pendingKey)).toContain(commandID)
  view.unmount()
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await screen.findByText('查询原重试回执')
  fireEvent.click(screen.getByText('查询原重试回执'))
  await screen.findByText(/未找到回执也不代表命令未提交/)
  expect(sessionStorage.getItem(pendingKey)).toContain(commandID)
  fireEvent.click(screen.getByText('查询原重试回执'))
  await screen.findByText('重试已受理，等待执行')
  expect(operation).toHaveBeenLastCalledWith(commandID)
  expect(receipt).not.toHaveBeenCalled()
  expect(retry).toHaveBeenCalledTimes(1)
  expect(sessionStorage.getItem(pendingKey)).toBeNull()
})
it.each([403, 409, 429])('clears a definitively rejected %s submission and requires a new state read', async (status) => {
  retry.mockResolvedValue([{ status }])
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText(/重试未被接受/)
  expect(screen.queryByText('确认重试原解读')).not.toBeInTheDocument()
  expect(sessionStorage.getItem(pendingKey)).toBeNull()
})
it('shows maintenance for retry without inventing an AI rejection or another write', async () => {
  retry.mockResolvedValue([{ response: { status: 429, data: {
    message: 'AI runtime command admission is closed for maintenance; operation was not submitted' } } }])
  const view = render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText('运行服务正在维护，新命令未提交。请稍后重新查询，再决定是否操作。')
  expect(screen.queryByText('确认重试原解读')).not.toBeInTheDocument()
  expect(sessionStorage.getItem(pendingKey)).toBeNull()
  expect(operation).not.toHaveBeenCalled()
  view.unmount()
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  expect(retry).toHaveBeenCalledTimes(1)
})
it('preserves the original command when receipt bindings differ', async () => {
  retry.mockResolvedValue([null, { data: { ...accepted, session_id: runID } }])
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText(/命令结果尚未确认/)
  expect(sessionStorage.getItem(pendingKey)).toContain(commandID)
  expect(screen.queryByText('重试已受理，等待执行')).not.toBeInTheDocument()
})
it('does not show old owner state after account remount', async () => {
  let finish!: (value: unknown) => void
  read.mockReturnValue(new Promise((resolve) => { finish = resolve }))
  const view = render(<NativeParticipantRetryWorkspace key="old" owner="owner" />)
  fireEvent.change(screen.getByLabelText('参与者会话编号'), { target: { value: sessionID } })
  fireEvent.click(screen.getByText('查询参与者执行'))
  view.rerender(<NativeParticipantRetryWorkspace key="new" owner="other" />)
  await act(async () => { finish([null, { data: state }]) })
  expect(screen.queryByText('original-request')).not.toBeInTheDocument()
})

const submitted = { operation_id: commandID, command_id: commandID, status: 'submitted', status_url: '/ignored' }
const acceptedOperation = {
  operation_id: commandID, command_id: commandID, resource_id: sessionID,
  status: 'accepted', decision: 'accepted', transport_status: 'confirmed',
  receipt: { command_id: commandID, command_body_sha256: 'a'.repeat(64), decision: 'ACCEPTED', workflow_receipt: { ...accepted, version: '5' } }
}
it('keeps the 202 intent until the original durable operation confirms it', async () => {
  let finish!: (value: unknown) => void
  operation.mockReturnValue(new Promise((resolve) => { finish = resolve }))
  retry.mockImplementation(async () => {
    const intent = JSON.parse(sessionStorage.getItem(pendingKey) || '{}')
    expect(intent.commandID).toBe(commandID)
    expect(intent.reason).toBe('重新核对后重试')
    expect(intent.acceptResultUnknownRisk).toBe(true)
    return [null, { data: submitted }]
  })
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await select()
  fireEvent.click(screen.getByText('原调用结果未知，我接受重复调用和重复费用风险'))
  fireEvent.click(screen.getByText('确认重试原解读'))
  await screen.findByText('存在待确认的重试命令')
  expect(screen.queryByText('重试已受理，等待执行')).not.toBeInTheDocument()
  await act(async () => { finish(acceptedOperation) })
  await screen.findByText('重试已受理，等待执行')
  expect(retry).toHaveBeenCalledTimes(1)
  expect(operation).toHaveBeenCalledWith(commandID, expect.anything())
  expect(receipt).not.toHaveBeenCalled()
  expect(sessionStorage.getItem(pendingKey)).toBeNull()
})
it('keeps a technically held operation across refresh without another write', async () => {
  operation.mockResolvedValue({ ...acceptedOperation, status: 'held', decision: 'held', transport_status: 'held',
    receipt: { command_id: commandID, command_body_sha256: 'a'.repeat(64), decision: 'HELD' } })
  sessionStorage.setItem(pendingKey, JSON.stringify({ sessionID, commandID, runID, version: 4,
    reason: '核对', acceptResultUnknownRisk: true, transport: 'mq' }))
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await screen.findByText('查询原重试回执')
  fireEvent.click(screen.getByText('查询原重试回执'))
  await screen.findByText(/原命令技术挂起/)
  expect(sessionStorage.getItem(pendingKey)).toContain(commandID)
  expect(retry).not.toHaveBeenCalled()
  expect(receipt).not.toHaveBeenCalled()
})
it.each(['wrong_resource', 'unsafe_version'])('retains pending intent when durable receipt has %s', async (issue) => {
  operation.mockResolvedValue({ ...acceptedOperation,
    resource_id: issue === 'wrong_resource' ? runID : sessionID,
    receipt: { ...acceptedOperation.receipt, workflow_receipt: { ...accepted, version: issue === 'unsafe_version' ? '9007199254740993' : '5' } }
  })
  sessionStorage.setItem(pendingKey, JSON.stringify({ sessionID, commandID, runID, version: 4, transport: 'mq' }))
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await screen.findByText('查询原重试回执')
  fireEvent.click(screen.getByText('查询原重试回执'))
  await screen.findByText(/暂时无法确认原命令/)
  expect(sessionStorage.getItem(pendingKey)).toContain(commandID)
  expect(screen.queryByText('重试已受理，等待执行')).not.toBeInTheDocument()
  expect(retry).not.toHaveBeenCalled()
})
it('clears intent only for the matching persisted rejection', async () => {
  operation.mockResolvedValue({ ...acceptedOperation, status: 'rejected', decision: 'rejected',
    receipt: { command_id: commandID, command_body_sha256: 'a'.repeat(64), decision: 'REJECTED' } })
  sessionStorage.setItem(pendingKey, JSON.stringify({ sessionID, commandID, runID, version: 4, transport: 'mq' }))
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  await screen.findByText('查询原重试回执')
  fireEvent.click(screen.getByText('查询原重试回执'))
  await screen.findByText(/服务端拒绝了原重试命令/)
  expect(sessionStorage.getItem(pendingKey)).toBeNull()
  expect(retry).not.toHaveBeenCalled()
})

it('keeps publisher-held retry intent across refresh without a business decision', async () => {
  operation.mockResolvedValue({ operation_id: commandID, command_id: commandID, resource_id: sessionID,
    status: 'submitted', transport_status: 'held' })
  sessionStorage.setItem(pendingKey, JSON.stringify({ sessionID, commandID, runID, version: 4,
    reason: '核对', acceptResultUnknownRisk: true, transport: 'mq' }))
  render(<NativeParticipantRetryWorkspace owner="owner" />)
  fireEvent.click(await screen.findByText('查询原重试回执'))
  await screen.findByText('原命令投递已技术挂起，尚未取得 AI 接单决定。请保留编号继续核对。')
  expect(sessionStorage.getItem(pendingKey)).toContain(commandID)
  expect(retry).not.toHaveBeenCalled()
  expect(receipt).not.toHaveBeenCalled()
})
