import { getEventStatus } from './eventGovernance'
import { internalRawGet } from '../qsServer'

jest.mock('../qsServer', () => ({
  internalRawGet: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }]))
}))

const internalRawGetMock = internalRawGet as jest.Mock

describe('eventGovernance API', () => {
  beforeEach(() => {
    internalRawGetMock.mockClear()
    internalRawGetMock.mockResolvedValue([null, { code: 0, data: {} }])
  })

  it('calls events status route', async () => {
    await getEventStatus()
    expect(internalRawGetMock).toHaveBeenCalledWith('/events/status')
  })

  it('wraps raw payload into QSResponse', async () => {
    internalRawGetMock.mockResolvedValueOnce([null, {
      generated_at: '2026-01-01T00:00:00Z',
      catalog: { topic_count: 1, event_count: 2, best_effort_count: 0, durable_outbox_count: 2 },
      outboxes: []
    }])

    const [error, response] = await getEventStatus()
    expect(error).toBeNull()
    expect(response?.code).toBe(0)
    expect(response?.data.catalog.event_count).toBe(2)
  })

  it('keeps QSResponse envelope unchanged', async () => {
    internalRawGetMock.mockResolvedValueOnce([null, {
      code: 0,
      message: 'OK',
      data: {
        catalog: { topic_count: 0, event_count: 0, best_effort_count: 0, durable_outbox_count: 0 },
        outboxes: []
      }
    }])

    const [error, response] = await getEventStatus()
    expect(error).toBeNull()
    expect(response?.code).toBe(0)
    expect(response?.message).toBe('OK')
  })
})
