import { act, fireEvent, render, screen } from '@testing-library/react'
import { getParticipantExecution, getParticipantRetryReceipt, retryParticipant } from '@/api/path/aiWorkflow'
import { NativeParticipantRetryWorkspace } from './NativeParticipantRetryWorkspace'

jest.mock('@/api/path/aiWorkflow', () => ({ getParticipantExecution: jest.fn(), getParticipantRetryReceipt: jest.fn(), retryParticipant: jest.fn() }))
jest.mock('./commands', () => ({ ...jest.requireActual('./commands'), newCommandID: () => '00000000-0000-4000-8000-000000000009' }))
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
beforeEach(() => { jest.resetAllMocks(); sessionStorage.clear(); read.mockResolvedValue([null, { data: state }]) })
async function select() {
  fireEvent.change(screen.getByLabelText('参与者会话编号'), { target: { value: sessionID } })
  fireEvent.click(screen.getByText('查询参与者执行'))
  await screen.findByText('已阻塞')
  fireEvent.change(screen.getByLabelText('参与者重试理由'), { target: { value: '重新核对后重试' } })
  fireEvent.click(screen.getByText('确认新增一次模型调用及费用'))
}
it('requires unknown-result risk confirmation and posts one version-bound command', async () => {
  retry.mockResolvedValue([null, { data: accepted }])
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
  receipt.mockResolvedValueOnce([{ status: 404 }]).mockResolvedValueOnce([null, { data: accepted }])
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
  expect(receipt).toHaveBeenLastCalledWith(commandID)
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
