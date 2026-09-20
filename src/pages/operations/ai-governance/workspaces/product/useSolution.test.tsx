import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow/solutions'
import { useSolution } from './useSolution'
import * as commands from '../native/commands'

jest.mock('@/api/path/aiWorkflow/solutions', () => ({
  getSolution: jest.fn(), getSolutionReceipt: jest.fn(), writeSolution: jest.fn()
}))
const id = '11111111-1111-4111-8111-111111111111'
const command = '22222222-2222-4222-8222-222222222222'
const head = { schema_version: 'qs-ai-solution/v1', solution_id: id, revision: 2, content: {}, source_release: {} }
const ok = (data: unknown) => [null, { data }]
function Workspace({ owner = '10001' }: { owner?: string }) {
  const c = useSolution(owner)
  return <>
    <button onClick={() => c.read(id)}>读取</button>
    <button onClick={() => c.submit(id, 'prepare', { expected_revision: 1, reason: '测试' })}>准备</button>
    <button onClick={c.reconcile}>核对</button><button onClick={c.retry}>重试</button>
    <p>{c.error}</p><p>{c.pending ? '待核对' : '无待办'}</p><p>{c.solution ? `版本${c.solution.revision}` : '无内容'}</p>
  </>
}
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(command)
  ;(api.getSolution as jest.Mock).mockResolvedValue(ok(head))
  ;(api.getSolutionReceipt as jest.Mock).mockResolvedValue(ok({ ...head, revision: 1 }))
})
afterEach(() => jest.restoreAllMocks())
it('restores an unknown operation after reload and reads current head rather than replaying an old revision', async () => {
  (api.writeSolution as jest.Mock).mockResolvedValue([{ status: 504 }, undefined])
  const view = render(<Workspace />)
  fireEvent.click(screen.getByText('准备'))
  await screen.findByText('待核对')
  view.unmount(); render(<Workspace />)
  fireEvent.click(screen.getByText('核对'))
  await screen.findByText('版本2')
  expect(api.getSolutionReceipt).toHaveBeenCalledWith(command)
  expect(api.writeSolution).toHaveBeenCalledTimes(1)
  expect(screen.getByText('无待办')).toBeInTheDocument()
})
it('retries the exact original input and never issues a second command', async () => {
  (api.writeSolution as jest.Mock).mockResolvedValueOnce([{ status: 504 }, undefined]).mockResolvedValueOnce(ok(head))
  render(<Workspace />); fireEvent.click(screen.getByText('准备'))
  await screen.findByText('待核对'); fireEvent.click(screen.getByText('重试'))
  await screen.findByText('版本2')
  expect((api.writeSolution as jest.Mock).mock.calls[0]).toEqual((api.writeSolution as jest.Mock).mock.calls[1])
})
it('retains not-found receipts, partitions journals by account, and does not automatically resubmit', async () => {
  (api.writeSolution as jest.Mock).mockResolvedValue([{ status: 504 }, undefined])
  ;(api.getSolutionReceipt as jest.Mock).mockResolvedValue([{ status: 404 }, undefined])
  const view = render(<Workspace />); fireEvent.click(screen.getByText('准备'))
  await screen.findByText('待核对'); fireEvent.click(screen.getByText('核对'))
  await waitFor(() => expect(api.getSolutionReceipt).toHaveBeenCalledTimes(1))
  expect(screen.getByText('待核对')).toBeInTheDocument()
  view.unmount(); render(<Workspace owner="10002" />)
  expect(screen.getByText('无待办')).toBeInTheDocument()
  expect(api.writeSolution).toHaveBeenCalledTimes(1)
})
it('reports a definite version conflict without silently overwriting or retrying it', async () => {
  (api.writeSolution as jest.Mock).mockResolvedValue([{ status: 409 }, undefined])
  render(<Workspace />); fireEvent.click(screen.getByText('准备'))
  await screen.findByText(/版本冲突/)
  expect(screen.getByText('无待办')).toBeInTheDocument()
  expect(api.writeSolution).toHaveBeenCalledTimes(1)
})
it('clears loaded content after access is revoked', async () => {
  render(<Workspace />); fireEvent.click(screen.getByText('读取'))
  await screen.findByText('版本2')
  ;(api.getSolution as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  fireEvent.click(screen.getByText('读取')); await screen.findByText('无内容')
})
it('does not send when the recovery journal cannot be persisted', async () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full') })
  render(<Workspace />); fireEvent.click(screen.getByText('准备'))
  await screen.findByText(/本次操作尚未发送/)
  expect(api.writeSolution).not.toHaveBeenCalled()
})
it('discards a response from an unmounted account', async () => {
  let finish: (v: unknown) => void = () => undefined
  ;(api.getSolution as jest.Mock).mockReturnValue(new Promise((resolve) => { finish = resolve }))
  const view = render(<Workspace />); fireEvent.click(screen.getByText('读取')); view.unmount()
  render(<Workspace owner="10002" />)
  await act(async () => { finish(ok(head)) })
  expect(screen.getByText('无内容')).toBeInTheDocument()
})
