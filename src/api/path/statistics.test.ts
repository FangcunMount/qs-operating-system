import { batchContentStatistics } from './statistics'
import { post } from '../qsServer'

jest.mock('../qsServer', () => ({
  get: jest.fn(),
  post: jest.fn(() => Promise.resolve([null, { data: { items: [] } }]))
}))

describe('statistics content batch API', () => {
  it('preserves typed questionnaire and scale identities in one request', async () => {
    const items = [
      { type: 'questionnaire' as const, code: 'COMMON' },
      { type: 'scale' as const, code: 'COMMON' }
    ]

    await batchContentStatistics(items)

    expect(post).toHaveBeenCalledWith('/statistics/contents/batch', { items })
  })
})
