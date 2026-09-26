import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  getSystemGovernanceDeliveryReplayReviews,
  getSystemGovernanceDeliveryResolution,
  getSystemGovernancePendingReplayAudits,
  postSystemGovernanceDeliveryResolution
} from '@/api/path/systemGovernance'
import type { ActionDescriptor, Signal } from '@/api/path/systemGovernance'
import { ActionsTab } from './ActionsTab'

jest.mock('@/api/path/systemGovernance', () => {
  const actual = jest.requireActual('@/api/path/systemGovernance')
  return {
    ...actual,
    getSystemGovernancePendingReplayAudits: jest.fn(),
    getSystemGovernanceDeliveryReplayReviews: jest.fn(),
    getSystemGovernanceDeliveryResolution: jest.fn(),
    postSystemGovernanceDeliveryResolution: jest.fn()
  }
})

const getPendingMock = getSystemGovernancePendingReplayAudits as jest.Mock
const getDeliveryReviewsMock = getSystemGovernanceDeliveryReplayReviews as jest.Mock
const getResolutionMock = getSystemGovernanceDeliveryResolution as jest.Mock
const postResolutionMock = postSystemGovernanceDeliveryResolution as jest.Mock

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
    id: 'events.replay_delivery',
    domain: 'events',
    label: 'Replay transport dead letter',
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
    window.sessionStorage.clear()
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_, index) => { bytes[index] = index + 1 })
        return bytes
      } }
    })
    getPendingMock.mockReset()
    getPendingMock.mockResolvedValue([null, { data: { items: [], next_cursor: '' } }])
    getDeliveryReviewsMock.mockReset()
    getDeliveryReviewsMock.mockResolvedValue([null, { data: { items: [], next_cursor: '' } }])
    getResolutionMock.mockReset()
    postResolutionMock.mockReset()
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

  it('shows unfinished transport replay audits as read-only evidence', async () => {
    getDeliveryReviewsMock.mockResolvedValue([null, { data: { items: [{
      request_id: 'stale-delivery-request', actor_user_id: '110004', status: 'running',
      targets_readable: true, started_at: '2026-09-25T08:00:00+08:00', updated_at: '2026-09-25T08:00:00+08:00',
      targets: [{ dead_letter_id: 42, disposition: 'automatic', linked_to_request: true }]
    }], next_cursor: '' } }])

    render(<ActionsTab actions={actions} />)

    expect(await screen.findByText('stale-delivery-request')).toBeInTheDocument()
    expect(screen.getByText('先核对业务事实，不能据此再次投递')).toBeInTheDocument()
    fireEvent.click(screen.getByText('1 条目标'))
    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('关联本操作')).toBeInTheDocument()
    expect(screen.queryByText('按原编号核对')).not.toBeInTheDocument()
    expect(screen.queryByText('核实业务事实后结案')).not.toBeInTheDocument()
    await waitFor(() => expect(getDeliveryReviewsMock).toHaveBeenCalledWith({ limit: 50 }))
  })

  it('labels a failed replay with an uncertain delivery for review', async () => {
    getDeliveryReviewsMock.mockResolvedValue([null, { data: { items: [{
      request_id: 'failed-delivery-request', actor_user_id: '110004', status: 'failed',
      targets_readable: true, started_at: '2026-09-25T08:00:00+08:00', updated_at: '2026-09-25T08:01:00+08:00',
      targets: [{ dead_letter_id: 43, disposition: 'automatic', linked_to_request: true }]
    }], next_cursor: '' } }])

    render(<ActionsTab actions={actions} />)

    expect(await screen.findByText('failed-delivery-request')).toBeInTheDocument()
    expect(screen.getByText('传输重放待核对操作')).toBeInTheDocument()
    expect(screen.getByText('操作失败，投递待核对')).toBeInTheDocument()
    expect(screen.getByText(/操作失败不代表消息一定没有发出/)).toBeInTheDocument()
    expect(screen.queryByText('核实业务事实后结案')).not.toBeInTheDocument()
  })

  it('opens the fact-verified resolution only for a linked report event and preserves the request ID on unknown result', async () => {
    getDeliveryReviewsMock.mockResolvedValue([null, { data: { items: [{
      request_id: 'failed-report-replay', actor_user_id: '110004', status: 'failed',
      targets_readable: true, started_at: '2026-09-25T08:00:00+08:00', updated_at: '2026-09-25T08:01:00+08:00',
      targets: [{ dead_letter_id: 44, event_id: 'event-44', event_type: 'interpretation.report.generated',
        delivery_attempts: 3, disposition: 'automatic', linked_to_request: true }]
    }], next_cursor: '' } }])
    postResolutionMock.mockResolvedValue([new Error('network lost'), undefined])
    getResolutionMock.mockResolvedValue([new Error('temporarily unavailable'), undefined])

    const view = render(<ActionsTab actions={actions} />)
    expect(await screen.findByText('failed-report-replay')).toBeInTheDocument()
    fireEvent.click(screen.getByText('1 条目标'))
    fireEvent.click(screen.getByText('核实业务事实后结案'))

    const requestInput = await screen.findByLabelText('本次结案编号') as HTMLInputElement
    const originalRequestID = requestInput.value
    expect(originalRequestID).toMatch(/^[0-9a-f]{32}$/)
    fireEvent.change(screen.getByLabelText('业务核实说明'), { target: { value: '已逐项核对报告和关注结果' } })
    fireEvent.change(screen.getByLabelText('确认文本'), { target: { value: '确认结案' } })
    fireEvent.click(screen.getByText('核实后结案'))

    await waitFor(() => expect(postResolutionMock).toHaveBeenCalledWith({
      request_id: originalRequestID,
      original_replay_request_id: 'failed-report-replay',
      dead_letter_id: 44,
      event_id: 'event-44',
      expected_delivery_attempts: 3,
      reason: '已逐项核对报告和关注结果',
      confirm: true
    }))
    await waitFor(() => expect(getResolutionMock).toHaveBeenCalledWith(originalRequestID))
    expect(requestInput.value).toBe(originalRequestID)
    expect(screen.getByText(/请保留本次结案编号/)).toBeInTheDocument()
    expect(requestInput).toHaveAttribute('readonly')
    expect(screen.getByLabelText('业务核实说明')).toHaveAttribute('readonly')
    expect(window.sessionStorage.getItem('qs-delivery-resolution:failed-report-replay:44')).toBe(originalRequestID)

    fireEvent.click(screen.getByText('按原编号重试结案'))
    await waitFor(() => expect(postResolutionMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(getResolutionMock).toHaveBeenCalledTimes(2))
    expect(postResolutionMock.mock.calls[1][0]).toEqual(postResolutionMock.mock.calls[0][0])

    view.unmount()
    render(<ActionsTab actions={actions} />)
    expect(await screen.findByText('failed-report-replay')).toBeInTheDocument()
    fireEvent.click(screen.getByText('1 条目标'))
    fireEvent.click(screen.getByText('核实业务事实后结案'))
    const restoredID = await screen.findByLabelText('本次结案编号') as HTMLInputElement
    expect(restoredID.value).toBe(originalRequestID)
    expect(restoredID).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: '核实后结案' })).toBeDisabled()
    expect(screen.getByText(/原输入已不在页面中/)).toBeInTheDocument()
    fireEvent.click(screen.getByText('查询结案回执'))
    await waitFor(() => expect(getResolutionMock).toHaveBeenCalledTimes(3))
    expect(postResolutionMock).toHaveBeenCalledTimes(2)

    getResolutionMock.mockResolvedValue([null, { data: {
      request_id: originalRequestID, action_id: 'events.resolve_delivery', status: 'succeeded',
      result: { original_replay_request_id: 'failed-report-replay', dead_letter_id: 45, event_id: 'event-44' }
    } }])
    fireEvent.click(screen.getByText('查询结案回执'))
    expect(await screen.findByText(/回执不属于当前死信与原事件/)).toBeInTheDocument()
    expect(screen.queryByText('结案已提交')).not.toBeInTheDocument()
    expect(postResolutionMock).toHaveBeenCalledTimes(2)
  })
})
