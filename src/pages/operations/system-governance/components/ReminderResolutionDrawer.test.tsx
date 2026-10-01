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

it('never permits resolution of an in-flight sending row', () => {
  render(<ReminderResolutionDrawer review={{ ...review, state: 'sending' }} onClose={jest.fn()} onResolved={jest.fn()} />)
  expect(screen.getByText('记录核对结果').closest('button')).toBeDisabled()
  expect(postResolution).not.toHaveBeenCalled()
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
