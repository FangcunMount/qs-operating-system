import { batchContentStatistics, getOverviewStatistics } from './statistics'
import { v2Get, v2Post } from '../qsServer'

jest.mock('../qsServer', () => ({
  v2Get: jest.fn(() => Promise.resolve([null, { data: {} }])),
  v2Post: jest.fn(() => Promise.resolve([null, { data: { items: [], freshness: {} } }]))
}))

describe('Statistics V2-only API', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('sends typed content identities and preserves completion semantics', async () => {
    ;(v2Post as jest.Mock).mockResolvedValue([
      null,
      {
        code: 0,
        message: 'ok',
        data: {
          items: [{ kind: 'questionnaire', code: 'Q-1', total_submissions: 3, has_completion: false }],
          freshness: { as_of_date: '2026-07-20', snapshot_at: '2026-07-21T00:30:00+08:00', is_stale: false }
        }
      }
    ])

    const [, response] = await batchContentStatistics([{ type: 'questionnaire', code: 'Q-1' }])

    expect(v2Post).toHaveBeenCalledWith('/statistics/contents/batch', {
      items: [{ kind: 'questionnaire', code: 'Q-1' }]
    })
    expect(response?.data.items[0]).toEqual({
      type: 'questionnaire',
      code: 'Q-1',
      total_submissions: 3,
      total_completions: 0,
      completion_rate: 0,
      has_completion: false
    })
  })

  it('uses complete-day presets and normalizes custom Shanghai dates', async () => {
    await getOverviewStatistics({ preset: 'latest_complete_day' })
    await getOverviewStatistics({ from: '2026-07-01 00:00:00', to: '2026-07-20 23:59:59' })

    expect(v2Get).toHaveBeenNthCalledWith(1, '/statistics/overview', { preset: 'latest_complete_day' })
    expect(v2Get).toHaveBeenNthCalledWith(2, '/statistics/overview', {
      preset: 'custom',
      from: '2026-07-01',
      to: '2026-07-20'
    })
  })
})
