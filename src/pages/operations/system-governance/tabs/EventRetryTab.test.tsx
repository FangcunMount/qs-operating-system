import React from 'react'
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
})
