import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getSystemGovernanceReminderResolution, postSystemGovernanceReminderResolution } from '@/api/path/systemGovernance'
import type { ReminderReview } from '@/api/path/systemGovernance'
import { ReminderResolutionDrawer } from './ReminderResolutionDrawer'

jest.mock('@/api/path/systemGovernance', () => ({
  getSystemGovernanceReminderResolution: jest.fn(), postSystemGovernanceReminderResolution: jest.fn()
}))
const getReceipt = getSystemGovernanceReminderResolution as jest.Mock
const postResolution = postSystemGovernanceReminderResolution as jest.Mock
const review: ReminderReview = { delivery_id: 42, task_id: 'task-1', opening_event_id: 'event-1', schedule_revision: 1,
  user_id: 'user-1', state: 'manual_required', updated_at: '2026-10-01T14:00:00+08:00' }

beforeEach(() => {
  window.sessionStorage.clear(); jest.clearAllMocks()
  Object.defineProperty(window, 'crypto', { configurable: true, value: {
    getRandomValues: (bytes: Uint8Array) => { bytes.fill(7); return bytes }
  } })
})

it('requires explicit acknowledgment before recording an in-flight call as unknown', () => {
  render(<ReminderResolutionDrawer review={{ ...review, state: 'sending' }} onClose={jest.fn()} onResolved={jest.fn()} />)
  expect(screen.getByText('记录核对结果').closest('button')).toBeDisabled()
  expect(postResolution).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('checkbox'))
  expect(screen.getByText('记录核对结果').closest('button')).not.toBeDisabled()
  expect(screen.getByRole('combobox')).toHaveAttribute('disabled')
})

it('restores only the original request ID and rejects a mismatched receipt without resending', async () => {
  window.sessionStorage.setItem('qs-reminder-resolution:42:event-1', 'original-review')
  getReceipt.mockResolvedValue([null, { data: { request_id: 'original-review', action_id: 'notifications.resolve_reminder',
    status: 'succeeded', result: { delivery_id: 999, task_id: 'task-1', opening_event_id: 'event-1', automatic_resend: false } } }])
  const onResolved = jest.fn()
  render(<ReminderResolutionDrawer review={review} onClose={jest.fn()} onResolved={onResolved} />)
  expect(screen.getByText('记录核对结果').closest('button')).toBeDisabled()
  fireEvent.click(screen.getByText('查询回执'))
  await waitFor(() => expect(getReceipt).toHaveBeenCalledWith('original-review'))
  await screen.findByText('未取得匹配的结案回执。请保留原编号，不要补发提醒或重新创建结案编号。')
  expect(onResolved).not.toHaveBeenCalled()
  expect(postResolution).not.toHaveBeenCalled()
})


it('submits only an acknowledged unknown finding for sending and retains its original identity', async () => {
  const id = '07'.repeat(16)
  postResolution.mockResolvedValue([null, { data: { request_id: id, action_id: 'notifications.resolve_reminder',
    status: 'succeeded', result: { delivery_id: 42, task_id: 'task-1', opening_event_id: 'event-1',
      finding: 'unknown_no_resend', automatic_resend: false } } }])
  const onResolved = jest.fn()
  render(<ReminderResolutionDrawer review={{ ...review, state: 'sending' }} onClose={jest.fn()} onResolved={onResolved} />)
  fireEvent.change(screen.getByLabelText('证据位置或记录编号'), { target: { value: 'incident-42' } })
  fireEvent.change(screen.getByLabelText('核对说明'), { target: { value: '外部结果无法确认，保留原调用事实，禁止重发' } })
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByText('记录核对结果'))
  await waitFor(() => expect(postResolution).toHaveBeenCalledWith(expect.objectContaining({
    request_id: id, delivery_id: 42, task_id: 'task-1', opening_event_id: 'event-1',
    expected_updated_at: review.updated_at, finding: 'unknown_no_resend', confirm: true,
    acknowledge_original_call_may_complete: true
  })))
  await waitFor(() => expect(onResolved).toHaveBeenCalledTimes(1))
  expect(postResolution).toHaveBeenCalledTimes(1)
  expect(screen.getByText('按原输入重试结案').closest('button')).toBeDisabled()
})

it('keeps an explicit platform rejection distinct and locks its finding without resending', () => {
  render(<ReminderResolutionDrawer review={{ ...review, state: 'rejected', resolution_code: 'platform_rejected_43101' }}
    onClose={jest.fn()} onResolved={jest.fn()} />)
  expect(screen.getByRole('combobox')).toHaveAttribute('disabled')
  expect(screen.getByText('平台明确拒绝')).toBeInTheDocument()
  expect(screen.getByText(/账本记录：platform_rejected_43101/)).toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  expect(postResolution).not.toHaveBeenCalled()
})
