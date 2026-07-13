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
      outboxes: [],
      profiles: [{
        name: 'mongo_domain_events', event_count: 1, running: true,
        relay_enabled: true, reconciler_enabled: true, immediate_enabled: true
      }],
      consumers: [{
        id: 'modelcatalog.hot_rank_projection', event_type: 'answersheet.submitted', runtime: 'apiserver',
        topic: 'qs.evaluation.lifecycle', channel: 'qs-apiserver-modelcatalog-hot-rank-v1',
        enabled: true, healthy: true, settlement: 'handler_error_nack'
      }]
    }])

    const [error, response] = await getEventStatus()
    expect(error).toBeNull()
    expect(response?.code).toBe(0)
    expect(response?.data.catalog.event_count).toBe(2)
    expect(response?.data.profiles?.[0].name).toBe('mongo_domain_events')
    expect(response?.data.consumers?.[0].id).toBe('modelcatalog.hot_rank_projection')
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
