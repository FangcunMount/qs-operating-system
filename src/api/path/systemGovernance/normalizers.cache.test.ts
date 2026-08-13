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

  it('preserves instance identity and normalizes policy source metadata', () => {
    const cache = normalizeSystemGovernanceCache({
      snapshot: {
        summary: { family_total: 0, available_count: 0, degraded_count: 0, unavailable_count: 0, ready: true },
        families: [],
        warmup: {
          enabled: false,
          startup: { static: false, query: false },
          hotset: { enable: false, top_n: 0, max_items_per_kind: 0 },
          latest_runs: []
        },
        effective_registry: {
          snapshot_version: 1,
          catalog_version: 'v2',
          capabilities: [],
          reload: { last_attempt_at: '0001-01-01T00:00:00Z' },
          policy_source: {
            component: 'qs-apiserver',
            schema_version: '1.0',
            path: '/app/configs/cache/apiserver.prod.yaml',
            policy_sha256: 'abcdef'
          }
        }
      },
      family_rows: [{
        component: 'collection-server',
        instance_id: 'collection-a',
        family: 'static_meta',
        profile: 'static_cache',
        namespace: 'cache:static',
        allow_warmup: false,
        configured: true,
        available: true,
        degraded: false,
        mode: 'named_profile',
        consecutive_failures: 0,
        severity: 'healthy'
      }]
    })

    expect(cache.family_rows[0].instance_id).toBe('collection-a')
    expect(cache.effective_registry?.policy_source).toEqual({
      component: 'qs-apiserver',
      schema_version: '1.0',
      path: '/app/configs/cache/apiserver.prod.yaml',
      policy_sha256: 'abcdef'
    })
  })

  it('normalizes registry, L1/L2 runtime, and topology views', () => {
    const cache = normalizeSystemGovernanceCache({
      registry_view: {
        component_registries: [{
          component: 'collection-server', instance_id: 'collection-a', generation: 'g1', available: true,
          snapshot_version: 2, catalog_version: 'v3',
          policy_source: { component: 'collection-server', schema_version: '1.0', path: '/cache/collection.prod.yaml', policy_sha256: 'sha' }
        }],
        capability_rows: [{
          component: 'collection-server', capability: 'catalog.questionnaire', layer: 'L1', consistent: true,
          instance_ids: ['collection-a'], enabled: true, kind: 'cache', topology_group: 'questionnaire', topology_order: 10
        }],
        registry_drift: []
      },
      runtime_view: {
        summary: {
          ready: true, component_total: 1, healthy_component_count: 1, discovered_instance_count: 1,
          healthy_instance_count: 1, family_group_count: 1, abnormal_family_group_count: 0, abnormal_l1_capability_count: 0
        },
        l1_capability_runtime: [{
          component: 'collection-server', instance_id: 'collection-a', capability: 'catalog.questionnaire', enabled: true,
          buckets: [{
            bucket: 'detail', entries: 2, max_entries: 64, hits: 4, misses: 1,
            fifo_evictions: 0, ttl_expirations: 0, explicit_deletions: 0, signal_deletions: 1
          }],
          signal_watcher: { configured: true, status: 'running', reconnect_count: 0 },
          samples: { name: 'samples', value: 5, unit: 'count', available: true }
        }],
        family_groups: [{
          component: 'qs-apiserver', family: 'static_meta', profile: 'static_cache', namespace: 'cache:static',
          healthy_instance_count: 1, discovered_instance_count: 1, degraded_instance_count: 0,
          unavailable_instance_count: 0, severity: 'healthy',
          operation_errors: { name: 'cache_operation_errors', value: 0, unit: 'count', available: true },
          operation_p95: { name: 'cache_operation_p95', value: 0.01, unit: 'seconds', available: true }
        }],
        instance_rows: []
      },
      topology_view: {
        topologies: [{
          topology_group: 'questionnaire', read_model: 'questionnaire published Mongo read model', status: 'healthy',
          nodes: [{
            id: 'collection-server:catalog.questionnaire:L1', component: 'collection-server', capability: 'catalog.questionnaire',
            layer: 'L1', enabled: true, registry_consistent: true, runtime_health: 'healthy', order: 10,
            policy_source: '/cache/collection.prod.yaml'
          }],
          edges: [{ from: 'collection-server:catalog.questionnaire:L1', to: 'source:questionnaire', kind: 'miss_fallback' }],
          source: { id: 'source:questionnaire', read_model: 'questionnaire published Mongo read model', source_kind: 'mongo_read_model' },
          window_evidence: {}
        }]
      }
    })

    expect(cache.registry_view?.capability_rows[0]).toMatchObject({ topology_group: 'questionnaire', topology_order: 10 })
    expect(cache.runtime_view?.l1_capability_runtime[0].buckets[0]).toMatchObject({ entries: 2, signal_deletions: 1 })
    expect(cache.runtime_view?.family_groups[0].operation_p95?.value).toBe(0.01)
    expect(cache.runtime_view?.family_groups[0].operation_errors?.value).toBe(0)
    expect(cache.topology_view?.topologies[0].nodes[0].policy_source).toBe('/cache/collection.prod.yaml')
  })
})
