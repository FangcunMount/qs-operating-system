import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getSystemGovernancePendingReplayAudits } from '@/api/path/systemGovernance'
import type { ActionDescriptor, Signal } from '@/api/path/systemGovernance'
import { ActionsTab } from './ActionsTab'

jest.mock('@/api/path/systemGovernance', () => {
  const actual = jest.requireActual('@/api/path/systemGovernance')
  return { ...actual, getSystemGovernancePendingReplayAudits: jest.fn() }
})

const getPendingMock = getSystemGovernancePendingReplayAudits as jest.Mock

const actions: ActionDescriptor[] = [
  {
    id: 'events.replay_pending',
    domain: 'events',
    label: 'Replay pending outbox events',
    risk_level: 'high',
    enabled: true,
    planned: false,
    requires_confirmation: true
  },
  {
    id: 'cache.manual_warmup',
    domain: 'cache',
    label: 'Manual cache warmup',
    risk_level: 'low',
    enabled: true,
    planned: false,
    requires_confirmation: true
  }
]

const signals: Signal[] = [{
  id: 'outbox.pending',
  domain: 'events',
  severity: 'warning',
  status: 'pending_stale',
  title: 'Outbox pending',
  evidence: [],
  action_ids: ['events.replay_pending']
}]

describe('ActionsTab', () => {
  beforeEach(() => {
    getPendingMock.mockReset()
    getPendingMock.mockResolvedValue([null, { data: { items: [], next_cursor: '' } }])
  })

  it('promotes actions linked by the current problem signals', async () => {
    render(<ActionsTab actions={actions} signals={signals} />)

    expect(await screen.findByText('当前没有待核对的重放操作')).toBeInTheDocument()
    expect(screen.getByText('根据当前问题建议')).toBeInTheDocument()
    expect(screen.getAllByText('重放待处理事件').length).toBeGreaterThan(1)
    expect(screen.getByText('全部治理动作')).toBeInTheDocument()
  })

  it('opens a pending replay with the original request ID and input locked', async () => {
    const input = { store: 'assessment-mysql-outbox', reason: 'reviewed', targets: [{ event_id: 'event-1', expected_attempt_count: 30 }] }
    getPendingMock.mockResolvedValue([null, { data: { items: [{
      request_id: 'original-request', actor_user_id: '636933038441247278',
      store: input.store, input, started_at: '2026-09-23T08:00:00+08:00', updated_at: '2026-09-23T08:01:00+08:00'
    }], next_cursor: '' } }])

    render(<ActionsTab actions={actions} />)
    expect(await screen.findByText('original-request')).toBeInTheDocument()
    fireEvent.click(screen.getByText('按原编号核对'))

    const requestID = screen.getByPlaceholderText('本次重放的操作编号') as HTMLInputElement
    expect(requestID.value).toBe('original-request')
    expect(requestID).toHaveAttribute('readonly')
    const inputField = screen.getByDisplayValue(/"event_id": "event-1"/) as HTMLTextAreaElement
    expect(inputField).toHaveAttribute('readonly')
    await waitFor(() => expect(getPendingMock).toHaveBeenCalledWith({ limit: 50 }))
  })
})
