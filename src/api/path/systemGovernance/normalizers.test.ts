import healthyFixture from '../__fixtures__/systemGovernance.healthy.json'
import promUnavailableFixture from '../__fixtures__/systemGovernance.prometheus-unavailable.json'
import eventBacklogFixture from '../__fixtures__/systemGovernance.event-backlog.json'
import eventTypeBacklogFixture from '../__fixtures__/systemGovernance.event-type-backlog.json'
import cacheDegradedFixture from '../__fixtures__/systemGovernance.cache-degraded.json'
import cacheHotsetFixture from '../__fixtures__/systemGovernance.cache-hotset.json'
import queueFullFixture from '../__fixtures__/systemGovernance.queue-full.json'
import {
  normalizeSignalEvidence,
  normalizeSignals,
  normalizeSystemGovernanceCache,
  normalizeSystemGovernanceEvents,
  normalizeSystemGovernanceOverview,
  normalizeSystemGovernanceResilience,
  sortSignalsBySeverity
} from './normalizers'

describe('systemGovernance normalizers', () => {
  it('normalizes string and object evidence into display lines', () => {
    expect(normalizeSignalEvidence('queue depth high')).toEqual(['queue depth high'])
    expect(normalizeSignalEvidence(['a', 'b'])).toEqual(['a', 'b'])
    expect(normalizeSignalEvidence({ count: 3, store: 'mysql' })).toEqual(['count: 3', 'store: mysql'])
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

  it('normalizes backend events snapshot and event type groups', () => {
    const events = normalizeSystemGovernanceEvents(eventBacklogFixture)
    expect(events.catalog.topic_count).toBe(4)
    expect(events.outboxes[0].name).toBe('mysql')
    expect(events.summary.pending_count).toBe(120)
    expect(events.outbox_rows[0]).toMatchObject({
      name: 'mysql',
      store: 'mysql',
      pending_count: 120,
      failed_count: 0,
      severity: 'warning'
    })
    expect(events.event_types?.[0]).toMatchObject({
      store: 'mysql',
      event_type: 'assessment.submitted',
      pending_count: 90,
      failed_count: 2,
      oldest_age_seconds: 300,
      degraded: true
    })
    expect(events.event_type_rows[0]).toMatchObject({
      store: 'mysql',
      event_type: 'assessment.submitted',
      severity: 'critical'
    })
  })

  it('prefers backend event drain rows when present', () => {
    const events = normalizeSystemGovernanceEvents(eventTypeBacklogFixture)
    expect(events.summary).toMatchObject({
      outbox_count: 1,
      pending_count: 12,
      failed_count: 1,
      stale_event_type_count: 1
    })
    expect(events.outbox_rows[0]).toMatchObject({
      name: 'mysql',
      pending_count: 12,
      severity: 'critical'
    })
    expect(events.outbox_rows[0].metric_evidence?.[0]).toMatchObject({
      name: 'outbox_pending_backlog_mysql',
      value: 12
    })
    expect(events.event_type_rows[0]).toMatchObject({
      event_type: 'assessment.submitted',
      pending_count: 9,
      severity: 'critical'
    })
  })

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

  it('normalizes backend resilience components map and metric evidence', () => {
    const resilience = normalizeSystemGovernanceResilience(queueFullFixture)
    expect(resilience.components).toHaveLength(1)
    expect(resilience.components[0]).toMatchObject({
      component: 'collection-server',
      configured: true,
      degraded: false
    })
    expect(resilience.metric_evidence?.[0]).toMatchObject({
      name: 'queue_full_collection-server_answersheet_submit',
      value: 3
    })
  })
})
