import healthyFixture from '../__fixtures__/systemGovernance.healthy.json'
import promUnavailableFixture from '../__fixtures__/systemGovernance.prometheus-unavailable.json'
import { normalizeSystemGovernanceOverview } from './normalizers.overview'

describe('systemGovernance overview normalizer', () => {
  it('normalizes healthy overview fixture', () => {
    const overview = normalizeSystemGovernanceOverview(healthyFixture)
    expect(overview.health).toBe('healthy')
    expect(overview.overall_severity).toBe('healthy')
    expect(overview.signals).toEqual([])
  })

  it('returns overview signals when prometheus is unavailable', () => {
    const overview = normalizeSystemGovernanceOverview(promUnavailableFixture)
    expect(overview.health).toBe('degraded')
    expect(overview.metrics.available).toBe(false)
    expect(overview.signals.length).toBeGreaterThan(0)
    expect(overview.signals[0].evidence).toContain('family: query_result')
  })
})
