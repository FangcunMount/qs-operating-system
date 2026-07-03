import {
  getSystemGovernanceActions,
  getSystemGovernanceCache,
  getSystemGovernanceEvents,
  getSystemGovernanceOverview,
  getSystemGovernanceResilience,
  postSystemGovernanceActionRun,
  normalizeSignalEvidence,
  normalizeSignals,
  sortSignalsBySeverity
} from './systemGovernance'
import { internalGet, internalPost } from '../qsServer'
import healthyFixture from './__fixtures__/systemGovernance.healthy.json'
import promUnavailableFixture from './__fixtures__/systemGovernance.prometheus-unavailable.json'
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
    await postSystemGovernanceActionRun('cache.manual_warmup', { input: { targets: [] } })

    expect(internalGetMock).toHaveBeenNthCalledWith(1, '/system-governance/overview', { window: '5m' })
    expect(internalGetMock).toHaveBeenNthCalledWith(2, '/system-governance/events', { window: '15m' })
    expect(internalGetMock).toHaveBeenNthCalledWith(3, '/system-governance/cache', { window: '5m' })
    expect(internalGetMock).toHaveBeenNthCalledWith(4, '/system-governance/resilience', { window: '1h' })
    expect(internalGetMock).toHaveBeenNthCalledWith(5, '/system-governance/actions')
    expect(internalPostMock).toHaveBeenCalledWith('/system-governance/actions/cache.manual_warmup/runs', {
      input: { targets: [] }
    })
  })

  it('returns overview signals when prometheus is unavailable', async () => {
    internalGetMock.mockResolvedValueOnce([null, { code: 0, data: promUnavailableFixture }])
    const [, response] = await getSystemGovernanceOverview()
    expect(response?.data.metrics.available).toBe(false)
    expect(response?.data.signals.length).toBeGreaterThan(0)
  })

  it('normalizes string evidence into an array', () => {
    expect(normalizeSignalEvidence('queue depth high')).toEqual(['queue depth high'])
    expect(normalizeSignalEvidence(['a', 'b'])).toEqual(['a', 'b'])
    expect(normalizeSignalEvidence(null)).toEqual([])
  })

  it('normalizes signals from API drift', () => {
    const normalized = normalizeSignals([
      {
        id: '1',
        domain: 'events',
        severity: 'warning',
        status: 'warn',
        title: 'backlog',
        evidence: 'single line' as unknown as string[]
      }
    ])
    expect(normalized[0].evidence).toEqual(['single line'])
  })

  it('sorts signals by severity', () => {
    const sorted = sortSignalsBySeverity([
      { id: '1', domain: 'system', severity: 'info', status: 'ok', title: 'b', evidence: [] },
      { id: '2', domain: 'system', severity: 'critical', status: 'bad', title: 'a', evidence: [] },
      { id: '3', domain: 'system', severity: 'warning', status: 'warn', title: 'c', evidence: [] }
    ])
    expect(sorted.map((item) => item.severity)).toEqual(['critical', 'warning', 'info'])
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
    expect(response?.data.signals).toEqual([])
  })
})
