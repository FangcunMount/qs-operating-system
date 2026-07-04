import {
  getSystemGovernanceActions,
  getSystemGovernanceCache,
  getSystemGovernanceEvents,
  getSystemGovernanceOverview,
  getSystemGovernanceResilience,
  postSystemGovernanceActionRun
} from './systemGovernance'
import { internalGet, internalPost } from '../qsServer'
import healthyFixture from './__fixtures__/systemGovernance.healthy.json'
import disabledActionFixture from './__fixtures__/systemGovernance.disabled-action.json'

jest.mock('../qsServer', () => ({
  internalGet: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }])),
  internalPost: jest.fn(() => Promise.resolve([null, { code: 0, data: {} }]))
}))

const internalGetMock = internalGet as jest.Mock
const internalPostMock = internalPost as jest.Mock

describe('systemGovernance API', () => {
  beforeEach(() => {
    internalGetMock.mockClear()
    internalPostMock.mockClear()
    internalGetMock.mockResolvedValue([null, { code: 0, data: {} }])
    internalPostMock.mockResolvedValue([null, { code: 0, data: {} }])
  })

  it('keeps system governance backend routes stable', async () => {
    await getSystemGovernanceOverview('5m')
    await getSystemGovernanceEvents('15m')
    await getSystemGovernanceCache('5m')
    await getSystemGovernanceResilience('1h')
    await getSystemGovernanceActions()
    await postSystemGovernanceActionRun('cache.manual_warmup', { input: { targets: [] }, confirm: true })

    expect(internalGetMock).toHaveBeenNthCalledWith(1, '/system-governance/overview', { window: '5m' })
    expect(internalGetMock).toHaveBeenNthCalledWith(2, '/system-governance/events', { window: '15m' })
    expect(internalGetMock).toHaveBeenNthCalledWith(3, '/system-governance/cache', { window: '5m' })
    expect(internalGetMock).toHaveBeenNthCalledWith(4, '/system-governance/resilience', { window: '1h' })
    expect(internalGetMock).toHaveBeenNthCalledWith(5, '/system-governance/actions')
    expect(internalPostMock).toHaveBeenCalledWith('/system-governance/actions/cache.manual_warmup/runs', {
      input: { targets: [] },
      confirm: true
    })
  })

  it('includes disabled planned actions', async () => {
    internalGetMock.mockResolvedValueOnce([null, { code: 0, data: disabledActionFixture }])
    const [, response] = await getSystemGovernanceActions()
    const disabled = response?.data.actions.find((item) => item.id === 'events.replay')
    expect(disabled?.enabled).toBe(false)
    expect(disabled?.planned).toBe(true)
  })

  it('accepts healthy overview fixture', async () => {
    internalGetMock.mockResolvedValueOnce([null, { code: 0, data: healthyFixture }])
    const [, response] = await getSystemGovernanceOverview()
    expect(response?.data.health).toBe('healthy')
    expect(response?.data.overall_severity).toBe('healthy')
    expect(response?.data.signals).toEqual([])
  })
})
