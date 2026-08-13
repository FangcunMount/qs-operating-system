import type { CacheComponent, CacheFamilyRow } from './types.cache'
import { projectCacheRuntime } from './cacheRuntimeProjection'

const summary = (ready: boolean) => ({
  family_total: 1,
  available_count: ready ? 1 : 0,
  degraded_count: ready ? 0 : 1,
  unavailable_count: 0,
  ready
})

const row = (instanceID: string, degraded = false): CacheFamilyRow => ({
  component: 'collection-server',
  instance_id: instanceID,
  family: 'static_meta',
  profile: 'static_cache',
  namespace: 'cache:static',
  allow_warmup: true,
  configured: true,
  available: true,
  degraded,
  mode: 'named_profile',
  consecutive_failures: degraded ? 1 : 0,
  severity: degraded ? 'warning' : 'healthy',
  metric_evidence: [{
    name: 'cache_family_available_collection_static',
    window: '5m',
    value: 1,
    unit: 'bool',
    available: true
  }]
})

describe('cache runtime projection', () => {
  it('groups instances, deduplicates metric evidence, and derives the global summary', () => {
    const components: Record<string, CacheComponent> = {
      'collection-server': {
        available: true,
        discovered_instance_count: 2,
        available_instance_count: 2,
        instances: {
          'collection-a': { component: 'collection-server', instance_id: 'collection-a', generation: 'g-a', summary: summary(true), families: [] },
          'collection-b': { component: 'collection-server', instance_id: 'collection-b', generation: 'g-b', summary: summary(false), families: [] }
        }
      }
    }

    const projected = projectCacheRuntime(components, [row('collection-a'), row('collection-b', true)])

    expect(projected.family_groups).toHaveLength(1)
    expect(projected.family_groups[0]).toMatchObject({
      healthy_instance_count: 1,
      discovered_instance_count: 2,
      degraded_instance_count: 1,
      severity: 'warning'
    })
    expect(projected.family_groups[0].metric_evidence).toHaveLength(1)
    expect(projected.family_groups[0].instances.map((item) => item.row_key)).toEqual([
      'collection-server:static_meta:static_cache:cache:static:collection-a',
      'collection-server:static_meta:static_cache:cache:static:collection-b'
    ])
    expect(projected.family_groups[0].instances[0].generation).toBe('g-a')
    expect(projected.summary).toMatchObject({
      ready: false,
      component_total: 1,
      discovered_instance_count: 2,
      healthy_instance_count: 1,
      abnormal_family_group_count: 1
    })
  })

  it('uses a visible compatibility identity when the backend omits instance_id', () => {
    const legacy = row('')
    delete legacy.instance_id
    const projected = projectCacheRuntime({}, [legacy])

    expect(projected.instance_rows[0]).toMatchObject({
      instance_id: 'legacy-representative',
      instance_id_reported: false
    })
  })
})
