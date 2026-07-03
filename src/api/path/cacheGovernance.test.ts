import {
  getCacheGovernanceHotset,
  getCacheGovernanceStatus,
  normalizeHotsetItem,
  postCacheGovernanceWarmupTargets
} from './cacheGovernance'
import { internalGet, internalPost } from '../qsServer'
import hotsetItemFixture from './__fixtures__/cacheGovernance.hotset-item.json'

jest.mock('../qsServer', () => ({
  internalGet: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }])),
  internalPost: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }]))
}))

const internalGetMock = internalGet as jest.Mock
const internalPostMock = internalPost as jest.Mock

describe('cacheGovernance API', () => {
  beforeEach(() => {
    internalGetMock.mockClear()
    internalPostMock.mockClear()
    internalGetMock.mockResolvedValue([null, { code: 0, data: {} }])
    internalPostMock.mockResolvedValue([null, { code: 0, data: {} }])
  })

  it('keeps cache governance backend routes stable', async () => {
    await getCacheGovernanceStatus()
    await getCacheGovernanceHotset('static.scale', 20)
    await postCacheGovernanceWarmupTargets({ targets: [{ kind: 'static.scale', scope: 'scale:S-001' }] })

    expect(internalGetMock).toHaveBeenNthCalledWith(1, '/cache/governance/status')
    expect(internalGetMock).toHaveBeenNthCalledWith(2, '/cache/governance/hotset', { kind: 'static.scale', limit: 20 })
    expect(internalPostMock).toHaveBeenCalledWith('/cache/governance/warmup-targets', {
      targets: [{ kind: 'static.scale', scope: 'scale:S-001' }]
    })
  })

  it('normalizes hotset item from PascalCase backend payload', () => {
    expect(normalizeHotsetItem(hotsetItemFixture)).toEqual({
      scope: 'scale:S-001',
      family: 'static_meta',
      kind: 'static.scale',
      score: 12.5
    })
  })
})
