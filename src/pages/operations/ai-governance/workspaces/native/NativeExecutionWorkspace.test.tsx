import { act, fireEvent, render, screen } from '@testing-library/react'
import { getNativeExecutionOutput, listNativeExecutions } from '@/api/path/aiWorkflow'
import type { NativeEvaluationState, NativeExecutionSummary } from '@/api/path/aiWorkflow'
import { NativeExecutionWorkspace } from './NativeExecutionWorkspace'

jest.mock('@/api/path/aiWorkflow', () => ({ getNativeExecutionOutput: jest.fn(), listNativeExecutions: jest.fn() }))
const list = listNativeExecutions as jest.Mock
const get = getNativeExecutionOutput as jest.Mock
const run = { run_id: '44444444-4444-4444-8444-444444444444', version: 7 } as NativeEvaluationState
const item = (id = 'execution:1', status: NativeExecutionSummary['status'] = 'failed'): NativeExecutionSummary => ({
  execution_id: id, invocation_id: 'invocation:1', kind: 'generation', case_id: 'case:1', slot_ordinal: 1,
  execution_ordinal: 1, status, raw_output_bytes: 6, normalized_output_bytes: 0, evidence: { status, failure: { code: 'bad_output' } }
})
const page = (executions = [item()], next_cursor = '') => ({ run_id: run.run_id, version: run.version, executions, next_cursor })
const output = (execution = item()) => ({ run_id: run.run_id, version: run.version, execution,
  raw_output: btoa('not-json'), normalized_output: '', raw_sha256: 'a'.repeat(64), normalized_sha256: 'b'.repeat(64) })
const ok = (data: unknown) => [null, { data }]
const query = () => fireEvent.click(screen.getByRole('button', { name: '读取执行记录' }))
beforeEach(() => jest.resetAllMocks())

it('reads a failed non-candidate execution and displays raw text without a recovery action', async () => {
  list.mockResolvedValue(ok(page()))
  get.mockResolvedValue(ok(output()))
  render(<NativeExecutionWorkspace run={run} locked={false} />)
  query()
  fireEvent.click(await screen.findByRole('button', { name: '查看执行详情' }))
  await screen.findByText('not-json')
  expect(list).toHaveBeenCalledWith(run.run_id, 7, '')
  expect(get).toHaveBeenCalledWith(run.run_id, 7, 'execution:1')
  expect(screen.getByText(/bad_output/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /重试|启动|批准/ })).not.toBeInTheDocument()
})

it('pages execution summaries while keeping outputs lazy', async () => {
  list.mockResolvedValueOnce(ok(page([item()], 'execution:1')))
    .mockResolvedValueOnce(ok(page([item('execution:2')], '')))
  render(<NativeExecutionWorkspace run={run} locked={false} />)
  query()
  fireEvent.click(await screen.findByText('加载更多执行'))
  await act(async () => { await Promise.resolve() })
  expect(screen.getAllByRole('button', { name: '查看执行详情' })).toHaveLength(2)
  expect(list).toHaveBeenLastCalledWith(run.run_id, 7, 'execution:1')
  expect(get).not.toHaveBeenCalled()
})

it('does not interpret an empty uncertain result as success', async () => {
  const unknown = item('execution:1', 'result_unknown')
  list.mockResolvedValue(ok(page([unknown])))
  get.mockResolvedValue(ok({ ...output(unknown), raw_output: '' }))
  render(<NativeExecutionWorkspace run={run} locked={false} />)
  query()
  fireEvent.click(await screen.findByRole('button', { name: '查看执行详情' }))
  await screen.findByText('原始输出')
  expect(screen.getAllByText('调用结果未知')).toHaveLength(2)
  expect(screen.getAllByText('没有保存输出正文')).toHaveLength(2)
  expect(screen.queryByText('执行完成')).not.toBeInTheDocument()
})

it('ignores an old output when the task version changes during the read', async () => {
  let finish!: (value: unknown) => void
  list.mockResolvedValue(ok(page()))
  get.mockReturnValue(new Promise((resolve) => { finish = resolve }))
  const view = render(<NativeExecutionWorkspace run={run} locked={false} />)
  query()
  fireEvent.click(await screen.findByRole('button', { name: '查看执行详情' }))
  view.rerender(<NativeExecutionWorkspace run={{ ...run, version: 8 }} locked={false} />)
  await act(async () => { finish(ok(output())) })
  expect(screen.queryByText('not-json')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '查看执行详情' })).not.toBeInTheDocument()
})

it.each(['denied', 'version', 'execution'])('clears failed or mismatched %s output', async (mode) => {
  list.mockResolvedValue(ok(page()))
  const wrong = output()
  if (mode === 'version') wrong.version = 8
  if (mode === 'execution') wrong.execution = item('execution:other')
  get.mockResolvedValue(mode === 'denied' ? [{ status: 403 }, undefined] : ok(wrong))
  render(<NativeExecutionWorkspace run={run} locked={false} />)
  query()
  fireEvent.click(await screen.findByRole('button', { name: '查看执行详情' }))
  await screen.findByText(/执行记录暂不可读/)
  expect(screen.queryByText('not-json')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '查看执行详情' })).not.toBeInTheDocument()
})
