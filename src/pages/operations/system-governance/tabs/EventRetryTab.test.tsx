import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getSystemGovernanceRetryCandidates } from '@/api/path/systemGovernance'
import { EventRetryTab } from './EventRetryTab'

jest.mock('@/api/path/systemGovernance', () => {
  const actual = jest.requireActual('@/api/path/systemGovernance')
  return {
    ...actual,
    getSystemGovernanceRetryCandidates: jest.fn()
  }
})

const retryMock = getSystemGovernanceRetryCandidates as jest.Mock

describe('EventRetryTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads bounded retry candidates and follows the server cursor', async () => {
    retryMock
      .mockResolvedValueOnce([null, {
        code: 0,
        data: {
          items: [{
            kind: 'evaluation',
            store: 'mysql',
            resource_id: 'assessment-7',
            attempt: 2,
            retry_disposition: 'manual_required',
            last_error_kind: 'projection_failed',
            updated_at: '2026-08-05T12:00:00+08:00'
          }],
          next_cursor: 'page-2'
        }
      }])
      .mockResolvedValueOnce([null, {
        code: 0,
        data: {
          items: [{
            kind: 'interpretation',
            store: 'mongo',
            resource_id: 'report-9',
            attempt: 1,
            retry_disposition: 'manual_required',
            updated_at: '2026-08-05T12:01:00+08:00'
          }],
          next_cursor: ''
        }
      }])

    render(<EventRetryTab />)

    await screen.findByText('assessment-7')
    expect(retryMock).toHaveBeenCalledWith({ limit: 50 })

    fireEvent.click(screen.getByRole('button', { name: '加载更多' }))

    await waitFor(() => expect(screen.getByText('report-9')).toBeInTheDocument())
    expect(retryMock).toHaveBeenLastCalledWith({ cursor: 'page-2', limit: 50 })
  })

  it('shows unresolved delivery replay as requiring reconciliation with its action ID', async () => {
    retryMock.mockResolvedValueOnce([null, {
      code: 0,
      data: {
        items: [{
          kind: 'transport_delivery',
          store: 'mysql',
          resource_id: '21',
          attempt: 8,
          retry_disposition: 'reconciliation_required',
          action_request_id: 'delivery-batch-7',
          event_id: 'original-event-7',
          message_id: 'logical-message-7',
          transport_message_id: 'nsq-physical-7',
          topic_name: 'qs.evaluation.lifecycle',
          channel_name: 'qs-worker',
          last_error_kind: 'publish outcome unknown',
          updated_at: '2026-09-25T21:00:00+08:00'
        }],
        next_cursor: ''
      }
    }])

    render(<EventRetryTab />)

    expect(await screen.findByText('投递结果待核对')).toBeInTheDocument()
    expect(screen.getByText('delivery-batch-7')).toBeInTheDocument()
    expect(screen.getByText('original-event-7')).toBeInTheDocument()
    expect(screen.getByText('logical-message-7')).toBeInTheDocument()
    expect(screen.getByText('nsq-physical-7')).toBeInTheDocument()
    expect(screen.getByText('qs.evaluation.lifecycle / qs-worker')).toBeInTheDocument()
    expect(screen.getByText(/请优先按原事件 ID 核对业务结果/)).toBeInTheDocument()
  })
})
