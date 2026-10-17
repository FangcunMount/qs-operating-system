import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'
import TaskDetail from './index'
import { ITask, taskApi } from '@/api/path/plan'

jest.mock('@/api/path/plan', () => ({ taskApi: { get: jest.fn(), open: jest.fn(), cancel: jest.fn() } }))

const taskID = '9007199254740993'
const entryURL = `https://collect.example.test/entry?task_id=${taskID}`
const task: ITask = {
  id: taskID, plan_id: '9007199254740995', testee_id: '9007199254740997', org_id: 1,
  scale_code: 'SCALE', scale_title: '任务量表', seq: 1, status: 'opened', planned_at: '2026-10-14 08:00:00'
}

const renderDetail = () => render(
  <MemoryRouter initialEntries={[`/plan/tasks/${taskID}`]}>
    <Route path="/plan/tasks/:id"><TaskDetail /></Route>
  </MemoryRouter>
)

beforeEach(() => {
  jest.clearAllMocks()
  ;(taskApi.open as jest.Mock).mockResolvedValue([null, {}])
  ;(taskApi.cancel as jest.Mock).mockResolvedValue([null, {}])
})

it('ignores an extra legacy token while retaining the server URL and the exact string TaskID', async () => {
  (taskApi.get as jest.Mock).mockResolvedValue([null, { data: { ...task, entry_url: entryURL, entry_token: 'legacy-display-only' } }])
  renderDetail()
  const link = await screen.findByRole('link', { name: new RegExp(taskID) })
  expect(link).toHaveAttribute('href', entryURL)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(screen.getByText(`任务编号：${taskID}`)).toBeInTheDocument()
  expect(taskApi.get).toHaveBeenCalledWith(taskID)
  expect(screen.queryByText('入口令牌')).not.toBeInTheDocument()
  expect(screen.queryByText('legacy-display-only')).not.toBeInTheDocument()
})

it('opens by TaskID and refreshes the server-generated URL without needing a token', async () => {
  (taskApi.get as jest.Mock)
    .mockResolvedValueOnce([null, { data: { ...task, status: 'pending' } }])
    .mockResolvedValue([null, { data: { ...task, entry_url: entryURL, expire_at: '2026-10-15 08:00:00' } }])
  renderDetail()
  fireEvent.click(await screen.findByRole('button', { name: /开放任务/ }))
  expect(await screen.findByText('确定要开放此任务吗？系统将自动生成入口 URL 和过期时间。')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  await waitFor(() => expect(taskApi.open).toHaveBeenCalledTimes(1))
  expect(taskApi.open).toHaveBeenCalledWith(taskID)
  expect(await screen.findByRole('link', { name: new RegExp(taskID) })).toHaveAttribute('href', entryURL)
  expect(taskApi.get).toHaveBeenCalledTimes(2)
  expect((taskApi.get as jest.Mock).mock.calls.every(([id]) => id === taskID)).toBe(true)
})

it('keeps cancellation bound to the same string TaskID', async () => {
  (taskApi.get as jest.Mock)
    .mockResolvedValueOnce([null, { data: task }])
    .mockResolvedValue([null, { data: { ...task, status: 'canceled' } }])
  renderDetail()
  fireEvent.click(await screen.findByRole('button', { name: /取消任务/ }))
  expect(await screen.findByText('确定要取消此任务吗？')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  await waitFor(() => expect(taskApi.cancel).toHaveBeenCalledWith(taskID))
  await waitFor(() => expect(screen.queryByRole('button', { name: /取消任务/ })).not.toBeInTheDocument())
})

it('does not manufacture an entry URL when an opened task has none', async () => {
  (taskApi.get as jest.Mock).mockResolvedValue([null, { data: task }])
  renderDetail()
  expect(await screen.findByText(`任务编号：${taskID}`)).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.queryByText('入口URL')).not.toBeInTheDocument()
})
