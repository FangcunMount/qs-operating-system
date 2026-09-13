import { act, fireEvent, render, screen } from '@testing-library/react'
import { getNativeEvaluationCapacity } from '@/api/path/aiWorkflow'
import { NativeCapacityWorkspace } from './NativeCapacityWorkspace'

jest.mock('@/api/path/aiWorkflow', () => ({ getNativeEvaluationCapacity: jest.fn() }))
const read = getNativeEvaluationCapacity as jest.Mock
const data = {
  organization_id: 12, budget_day: '2026-09-13', daily_provider_calls: 1024,
  reserved_provider_calls: 280, remaining_provider_calls: 744, full_run_provider_calls: 280,
  remaining_full_runs: 2, max_active_runs: 1, active_runs: 1, reservation_count: 1,
  reservations: [{ run_id: 'original-run', provider_calls: 280, requested_by: 'user:42', reserved_at: '2026-09-13T00:00:00Z' }],
  reservations_truncated: false
}
beforeEach(() => jest.resetAllMocks())
it('reads server capacity and clears stale numbers after permission failure', async () => {
  read.mockResolvedValueOnce([null, { data }]).mockResolvedValueOnce([new Error('denied')])
  render(<NativeCapacityWorkspace disabled={false} />)
  expect(read).not.toHaveBeenCalled()
  fireEvent.click(screen.getByText('查询评测容量'))
  await screen.findByText('744 / 1024')
  expect(screen.getByText('1 / 1')).toBeInTheDocument()
  expect(screen.getByText('original-run')).toBeInTheDocument()
  fireEvent.click(screen.getByText('查询评测容量'))
  await screen.findByText(/无法读取机构评测容量/)
  expect(screen.queryByText('744 / 1024')).not.toBeInTheDocument()
  expect(read).toHaveBeenCalledTimes(2)
  expect(read).toHaveBeenLastCalledWith()
})
it('does not display a previous owner response after remount', async () => {
  let finish!: (value: unknown) => void
  read.mockReturnValue(new Promise((resolve) => { finish = resolve }))
  const view = render(<NativeCapacityWorkspace key="owner1" disabled={false} />)
  fireEvent.click(screen.getByText('查询评测容量'))
  view.rerender(<NativeCapacityWorkspace key="owner2" disabled={false} />)
  await act(async () => { finish([null, { data }]) })
  expect(screen.queryByText('744 / 1024')).not.toBeInTheDocument()
})
