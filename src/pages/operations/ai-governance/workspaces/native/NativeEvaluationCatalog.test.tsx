import { act, fireEvent, render, screen } from '@testing-library/react'
import { listNativeEvaluations } from '@/api/path/aiWorkflow'
import type { EvaluationStatus } from '@/api/path/aiWorkflow'
import { NativeEvaluationCatalog } from './NativeEvaluationCatalog'

jest.mock('@/api/path/aiWorkflow', () => ({ listNativeEvaluations: jest.fn() }))
const list = listNativeEvaluations as jest.Mock
const row = (n: number, status: EvaluationStatus = 'requested') => ({
  run_id: `44444444-4444-4444-8444-${String(n).padStart(12, '0')}`,
  profile_id: `策略${n}`, profile_version: 'v6', prompt_id: '跨维度解读', prompt_version: 'v6',
  status, created_at: '2026-09-13T01:00:00+00:00'
})
const ok = (items: unknown[], next_cursor = '') => [null, { data: { items, next_cursor } }]
const query = () => fireEvent.click(screen.getByRole('button', { name: '查询任务列表' }))
beforeEach(() => jest.resetAllMocks())

it('pages summaries and selects only the task ID for a separate detail read', async () => {
  list.mockResolvedValueOnce(ok([row(1)], 'next')).mockResolvedValueOnce(ok([row(2)]))
  const select = jest.fn()
  render(<NativeEvaluationCatalog disabled={false} onSelect={select} />)
  expect(list).not.toHaveBeenCalled()
  query()
  await screen.findByText('策略1 · v6')
  fireEvent.click(screen.getByText('加载更多任务'))
  await screen.findByText('策略2 · v6')
  expect(list.mock.calls).toEqual([['', ''], ['', 'next']])
  fireEvent.click(screen.getAllByRole('button', { name: '查看任务' })[1])
  expect(select).toHaveBeenCalledWith(row(2).run_id)
  expect(screen.queryByText('加载更多任务')).not.toBeInTheDocument()
})

it('clears stale rows on denied refresh instead of presenting an empty successful list', async () => {
  list.mockResolvedValueOnce(ok([row(1)], 'next')).mockResolvedValueOnce([{ status: 403 }, undefined])
  render(<NativeEvaluationCatalog disabled={false} onSelect={jest.fn()} />)
  query()
  await screen.findByText('策略1 · v6')
  query()
  await screen.findByText(/任务列表暂不可用/)
  expect(screen.queryByText('策略1 · v6')).not.toBeInTheDocument()
  expect(screen.queryByText('当前筛选下暂无任务')).not.toBeInTheDocument()
  expect(screen.queryByText('加载更多任务')).not.toBeInTheDocument()
})

it('resets the cursor and ignores an old page when the status filter changes', async () => {
  let finish!: (value: unknown) => void
  list.mockResolvedValueOnce(ok([row(1)], 'old-cursor'))
    .mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    .mockResolvedValueOnce(ok([row(3, 'approved')]))
  render(<NativeEvaluationCatalog disabled={false} onSelect={jest.fn()} />)
  query()
  await screen.findByText('策略1 · v6')
  fireEvent.click(screen.getByText('加载更多任务'))
  fireEvent.mouseDown(screen.getByRole('combobox'))
  fireEvent.click(screen.getByText('审核通过'))
  await screen.findByText('策略3 · v6')
  expect(list).toHaveBeenLastCalledWith('approved', '')
  await act(async () => { finish(ok([row(2)], 'stale')) })
  expect(screen.queryByText('策略1 · v6')).not.toBeInTheDocument()
  expect(screen.queryByText('策略2 · v6')).not.toBeInTheDocument()
  expect(screen.queryByText('加载更多任务')).not.toBeInTheDocument()
})

it('does not replace the active task while its command is pending', async () => {
  list.mockResolvedValue(ok([row(1)]))
  const select = jest.fn()
  render(<NativeEvaluationCatalog disabled onSelect={select} />)
  query()
  await screen.findByText('策略1 · v6')
  expect(screen.getByRole('button', { name: '查看任务' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: '查看任务' }))
  expect(select).not.toHaveBeenCalled()
})

it('drops the previous account response after the owner-keyed view changes', async () => {
  let finish!: (value: unknown) => void
  list.mockReturnValueOnce(new Promise((resolve) => { finish = resolve }))
    .mockResolvedValueOnce(ok([row(2)]))
  const view = render(<NativeEvaluationCatalog key="u1" disabled={false} onSelect={jest.fn()} />)
  query()
  view.rerender(<NativeEvaluationCatalog key="u2" disabled={false} onSelect={jest.fn()} />)
  query()
  await screen.findByText('策略2 · v6')
  await act(async () => { finish(ok([row(1)])) })
  expect(screen.queryByText('策略1 · v6')).not.toBeInTheDocument()
})

it.each([null, { run_id: 'not-a-task' }, { ...row(1), status: 'unknown' }])(
  'rejects malformed summaries without offering a task operation', async (item) => {
    list.mockResolvedValue(ok([item]))
    render(<NativeEvaluationCatalog disabled={false} onSelect={jest.fn()} />)
    query()
    await screen.findByText(/任务列表暂不可用/)
    expect(screen.queryByRole('button', { name: '查看任务' })).not.toBeInTheDocument()
  }
)
