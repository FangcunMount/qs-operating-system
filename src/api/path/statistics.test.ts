import { batchContentStatistics, getOverviewStatistics } from './statistics'
import { post, v2Get, v2Post } from '../qsServer'
import { config } from '@/config/config'

jest.mock('../qsServer', () => ({
  get: jest.fn(),
  post: jest.fn(() => Promise.resolve([null, { data: { items: [] } }])),
  v2Get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  v2Post: jest.fn(() => Promise.resolve([null, { data: { items: [], freshness: {} } }]))
}))

describe('statistics content batch API', () => {
  afterEach(() => {
    config.statisticsApiVersion = 'v1'
    jest.clearAllMocks()
  })

  it('preserves typed questionnaire and scale identities in one request', async () => {
    const items = [
      { type: 'questionnaire' as const, code: 'COMMON' },
      { type: 'scale' as const, code: 'COMMON' }
    ]

    await batchContentStatistics(items)

    expect(post).toHaveBeenCalledWith('/statistics/contents/batch', { items })
  })

  it('uses explicit V2 content identity without changing the public adapter contract', async () => {
    config.statisticsApiVersion = 'v2'
    ;(v2Post as jest.Mock).mockResolvedValue([null, {
      code: 0,
      message: 'ok',
      data: {
        items: [{ kind: 'questionnaire', code: 'Q-1', total_submissions: 3, has_completion: false }],
        freshness: { as_of_date: '2026-07-20', snapshot_at: '2026-07-21T00:30:00+08:00', is_stale: false }
      }
    }])

    const [, response] = await batchContentStatistics([{ type: 'questionnaire', code: 'Q-1' }])

    expect(v2Post).toHaveBeenCalledWith('/statistics/contents/batch', {
      items: [{ kind: 'questionnaire', code: 'Q-1' }]
    })
    expect(response?.data.items[0]).toEqual({
      type: 'questionnaire',
      code: 'Q-1',
      total_submissions: 3,
      total_completions: 0,
      completion_rate: 0
    })
  })

  it('normalizes V2 complete-day and custom Shanghai date queries', async () => {
    config.statisticsApiVersion = 'v2'

    await getOverviewStatistics({ preset: 'today' })
    await getOverviewStatistics({ from: '2026-07-01 00:00:00', to: '2026-07-20 23:59:59' })

    expect(v2Get).toHaveBeenNthCalledWith(1, '/statistics/overview', { preset: 'latest_complete_day' })
    expect(v2Get).toHaveBeenNthCalledWith(2, '/statistics/overview', {
      preset: 'custom',
      from: '2026-07-01',
      to: '2026-07-20'
    })
  })
})
