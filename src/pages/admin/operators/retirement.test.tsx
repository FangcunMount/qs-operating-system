import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import OperatorRetirement from './retirement'
import { IOperator, operatorApi } from '@/api/path/operator'

jest.mock('@/api/path/operator', () => ({ operatorApi: { retire: jest.fn(), retirement: jest.fn() } }))
const operator = { id: '7', name: '测试运营人员', version: 3 } as IOperator
const task = { operator_id: '7', stage: 'disabled', expected_version: 3, request_id: 'original-request', reason: '退役医生后台身份', policy_version: 0 }
const open = () => render(<OperatorRetirement operator={operator} onClose={jest.fn()} onChanged={jest.fn()} />)
beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'crypto', { configurable: true, value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(9) } })
  ;(operatorApi.retirement as jest.Mock).mockResolvedValue([{ response: { status: 404 } }, null])
})
it('does not report a pending retirement as completed and resumes the original request', async () => {
  (operatorApi.retire as jest.Mock).mockResolvedValueOnce([null, { data: task }])
    .mockResolvedValueOnce([null, { data: { ...task, stage: 'completed', policy_version: 12 } }])
  open()
  const confirm = await screen.findByRole('button', { name: '确认退出后台' })
  await waitFor(() => expect(screen.getByLabelText('退出原因')).toBeEnabled())
  fireEvent.change(screen.getByLabelText('退出原因'), { target: { value: task.reason } })
  fireEvent.click(confirm)
  await screen.findByText(/后台身份已停用，退出尚未完成/)
  expect(screen.queryByText(/退出完成：/)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '继续退出' }))
  await screen.findByText(/退出完成：/)
  expect(operatorApi.retire).toHaveBeenCalledTimes(2)
  expect((operatorApi.retire as jest.Mock).mock.calls[1][1]).toEqual((operatorApi.retire as jest.Mock).mock.calls[0][1])
})
it('loads a persisted task and preserves its request identity and original version', async () => {
  (operatorApi.retirement as jest.Mock).mockResolvedValue([null, { data: task }])
  ;(operatorApi.retire as jest.Mock).mockResolvedValue([null, { data: task }])
  open()
  fireEvent.click(await screen.findByRole('button', { name: '继续退出' }))
  await waitFor(() => expect(operatorApi.retire).toHaveBeenCalledWith('7', {
    expected_version: 3, request_id: 'original-request', reason: task.reason
  }))
  expect(screen.getByLabelText('退出原因')).toBeDisabled()
})
it('requires a status read after an uncertain result and never creates a replacement request', async () => {
  (operatorApi.retire as jest.Mock).mockResolvedValue([new Error('连接中断'), null])
  open()
  await waitFor(() => expect(screen.getByLabelText('退出原因')).toBeEnabled())
  fireEvent.change(screen.getByLabelText('退出原因'), { target: { value: task.reason } })
  fireEvent.click(screen.getByRole('button', { name: '确认退出后台' }))
  await screen.findByText('连接中断')
  expect(screen.getByRole('button', { name: '确认退出后台' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '查询状态' }))
  await waitFor(() => expect(screen.getByRole('button', { name: '确认退出后台' })).toBeEnabled())
  fireEvent.click(screen.getByRole('button', { name: '确认退出后台' }))
  await waitFor(() => expect(operatorApi.retire).toHaveBeenCalledTimes(2))
  expect((operatorApi.retire as jest.Mock).mock.calls[1][1]).toEqual((operatorApi.retire as jest.Mock).mock.calls[0][1])
})
it('does not permit writes when status access is denied', async () => {
  (operatorApi.retirement as jest.Mock).mockResolvedValue([new Error('无权读取退出状态'), null])
  open()
  await screen.findByText('无权读取退出状态')
  expect(screen.getByRole('button', { name: '确认退出后台' })).toBeDisabled()
  expect(operatorApi.retire).not.toHaveBeenCalled()
})
