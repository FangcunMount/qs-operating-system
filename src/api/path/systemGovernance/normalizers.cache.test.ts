import cacheDegradedFixture from '../__fixtures__/systemGovernance.cache-degraded.json'
import cacheHotsetFixture from '../__fixtures__/systemGovernance.cache-hotset.json'
import { normalizeSystemGovernanceCache } from './normalizers.cache'

describe('systemGovernance cache normalizer', () => {
  it('normalizes backend cache snapshot', () => {
    const cache = normalizeSystemGovernanceCache(cacheDegradedFixture)
    expect(cache.summary.ready).toBe(false)
    expect(cache.families[0]).toMatchObject({
      family: 'query_result',
      degraded: true
    })
    expect(cache.family_rows[0]).toMatchObject({
      family: 'query_result',
      component: 'apiserver',
      severity: 'warning'
    })
    expect(cache.warmup_kinds.map((item) => item.kind)).toContain('query.stats_system')
    expect(cache.effective_registry).toMatchObject({
      snapshot_version: 3,
      catalog_version: 'v2'
    })
    expect(cache.effective_registry?.capabilities[0]).toMatchObject({
      capability: 'statistics.query',
      effective: {
        ttl: '10m0s',
        negative_ttl: '30s',
        singleflight: 'disabled'
      }
    })
    expect(cache.capability_rows[0]).toMatchObject({
      capability: 'statistics.query',
      workload: {
        hit_rate: { value: 0.875, unit: 'ratio' },
        error_count: { value: 2, unit: 'count' },
        get_latency_p95: { value: 0.032, unit: 'seconds' }
      }
    })
  })

  it('prefers backend cache governance rows and hotsets when present', () => {
    const cache = normalizeSystemGovernanceCache(cacheHotsetFixture)
    expect(cache.components?.['collection-server']).toMatchObject({
      available: false,
      reason: 'connection refused'
    })
    expect(cache.family_rows[0]).toMatchObject({
      family: 'query_result',
      component: 'apiserver',
      severity: 'warning',
      reason: 'last warmup exceeded 3s'
    })
    expect(cache.family_rows[0].metric_evidence?.[0]).toMatchObject({
      name: 'cache_family_degraded_apiserver_query_result',
      value: 2
    })
    expect(cache.warmup_kinds).toEqual([
      {
        kind: 'query.stats_system',
        family: 'query_result',
        scope_example: 'org:7',
        supports_manual_warmup: true
      }
    ])
    expect(cache.hotsets[0].items[0]).toEqual({
      family: 'query_result',
      kind: 'query.stats_system',
      scope: 'org:7',
      score: 3
    })
  })
})
