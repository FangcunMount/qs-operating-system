import { getApiserverResilienceStatus, getResilienceStatuses } from './resilienceGovernance'
import { getSystemGovernanceResilience } from './systemGovernance'
import { internalRawGet } from '../qsServer'

jest.mock('./systemGovernance', () => ({
  getSystemGovernanceResilience: jest.fn(() => Promise.resolve([null, {
    code: 0,
    data: {
      components: [
        { component: 'apiserver', source: '/internal/v1/system-governance/resilience', configured: true, degraded: false },
        { component: 'collection-server', source: 'collection', configured: true, degraded: false },
        { component: 'worker', source: 'worker', configured: true, degraded: false }
      ]
    }
  }]))
}))

jest.mock('../qsServer', () => ({
  internalRawGet: jest.fn(() => Promise.resolve([null, {
    summary: { ready: true, capability_count: 2, degraded_count: 0 },
    component: 'apiserver'
  }]))
}))

const internalRawGetMock = internalRawGet as jest.Mock
const getSystemGovernanceResilienceMock = getSystemGovernanceResilience as jest.Mock

describe('resilienceGovernance API', () => {
  beforeEach(() => {
    internalRawGetMock.mockClear()
    getSystemGovernanceResilienceMock.mockClear()
    internalRawGetMock.mockResolvedValue([null, {
      summary: { ready: true, capability_count: 2, degraded_count: 0 },
      component: 'apiserver'
    }])
    getSystemGovernanceResilienceMock.mockResolvedValue([null, {
      code: 0,
      data: {
        components: [
          { component: 'apiserver', source: '/internal/v1/system-governance/resilience', configured: true, degraded: false },
          { component: 'collection-server', source: 'collection', configured: true, degraded: false },
          { component: 'worker', source: 'worker', configured: true, degraded: false }
        ]
      }
    }])
  })

  it('calls apiserver resilience status route', async () => {
    await getApiserverResilienceStatus()
    expect(internalRawGetMock).toHaveBeenCalledWith('/resilience/status')
  })

  it('marks apiserver degraded when request fails', async () => {
    internalRawGetMock.mockResolvedValueOnce([new Error('network'), undefined])
    const result = await getApiserverResilienceStatus()
    expect(result.degraded).toBe(true)
    expect(result.component).toBe('apiserver')
  })

  it('aggregates components from system governance facade', async () => {
    const results = await getResilienceStatuses()
    expect(getSystemGovernanceResilienceMock).toHaveBeenCalled()
    expect(results).toHaveLength(3)
    expect(results.map((item) => item.component)).toEqual(['apiserver', 'collection-server', 'worker'])
  })

  it('degrades when system governance resilience is unavailable', async () => {
    getSystemGovernanceResilienceMock.mockResolvedValueOnce([new Error('network'), undefined])
    const results = await getResilienceStatuses()
    expect(results).toHaveLength(1)
    expect(results[0].degraded).toBe(true)
  })
})
