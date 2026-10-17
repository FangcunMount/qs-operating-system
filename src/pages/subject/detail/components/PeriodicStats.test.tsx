import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PeriodicStats from './PeriodicStats'
import { planApi, taskApi } from '@/api/path/plan'

jest.mock('@/api/path/plan', () => ({ planApi: { getTesteeTasks: jest.fn() }, taskApi: { open: jest.fn() } }))

const taskID = '9007199254740993'
const laterTaskID = '9007199254740997'
const entryURL = `https://collect.example.test/entry?task_id=${taskID}#task`
const task = {
  id: taskID, plan_id: '9007199254740995', testee_id: '42', org_id: 1,
  scale_code: 'SCALE', seq: 1, status: 'opened', planned_at: '2026-10-14 08:00:00'
}
const projects = [{
  id: 'round-1', planId: task.plan_id, round: 1, name: '周期计划', totalTasks: 2, completedTasks: 0, completionRate: 0,
  tasks: [
    { taskId: taskID, sequence: 1, status: 'pending' as const },
    { taskId: laterTaskID, sequence: 2, status: 'pending' as const }
  ]
}]

beforeEach(() => jest.clearAllMocks())

it('retains the exact server entry URL in the opened task timeline', async () => {
  (planApi.getTesteeTasks as jest.Mock).mockResolvedValue([null, { data: { tasks: [{ ...task, entry_url: entryURL }] } }])
  render(<PeriodicStats data={projects} testeeId="42" />)
  fireEvent.click(await screen.findByText('周期计划'))
  const link = await screen.findByRole('link', { name: /打开入口/ })
  expect(link).toHaveAttribute('href', entryURL)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  expect(planApi.getTesteeTasks).toHaveBeenCalledWith('42')
})

it('opens only the first pending task by string ID and reloads its entry URL', async () => {
  (planApi.getTesteeTasks as jest.Mock)
    .mockResolvedValueOnce([null, { data: { tasks: [
      { ...task, id: laterTaskID, seq: 2, status: 'pending' }, { ...task, status: 'pending' }
    ] } }])
    .mockResolvedValue([null, { data: { tasks: [{ ...task, entry_url: entryURL }] } }])
  ;(taskApi.open as jest.Mock).mockResolvedValue([null, {}])
  const refresh = jest.fn()
  render(<PeriodicStats data={projects} testeeId="42" onRefresh={refresh} />)
  fireEvent.click(await screen.findByText('周期计划'))
  const openButtons = await screen.findAllByRole('button', { name: '开放任务' })
  expect(openButtons).toHaveLength(1)
  fireEvent.click(openButtons[0])
  expect(await screen.findByText('确定要开放此任务吗？系统将自动生成入口 URL 和过期时间。')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
  await waitFor(() => expect(taskApi.open).toHaveBeenCalledWith(taskID))
  expect(taskApi.open).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('link', { name: /打开入口/ })).toHaveAttribute('href', entryURL)
  expect(planApi.getTesteeTasks).toHaveBeenCalledTimes(2)
  expect(refresh).toHaveBeenCalledTimes(1)
})
