import eventBacklogFixture from '../__fixtures__/systemGovernance.event-backlog.json'
import eventTypeBacklogFixture from '../__fixtures__/systemGovernance.event-type-backlog.json'
import { normalizeSystemGovernanceEvents } from './normalizers.events'

describe('systemGovernance events normalizer', () => {
  it('normalizes backend events snapshot and event type groups', () => {
    const events = normalizeSystemGovernanceEvents(eventBacklogFixture)
    expect(events.catalog.topic_count).toBe(3)
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
      event_type: 'evaluation.requested',
      pending_count: 90,
      failed_count: 2,
      oldest_age_seconds: 300,
      degraded: true
    })
    expect(events.event_type_rows[0]).toMatchObject({
      store: 'mysql',
      event_type: 'evaluation.requested',
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
      event_type: 'evaluation.requested',
      pending_count: 9,
      severity: 'critical'
    })
  })

  it('preserves the runtime topology and effective event contract from the status snapshot', () => {
    const events = normalizeSystemGovernanceEvents(eventTypeBacklogFixture)

    expect(events.snapshot?.profiles).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'mongo_domain_events', running: true, relay_enabled: true })
    ]))
    expect(events.snapshot?.consumers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'modelcatalog.hot_rank_projection', healthy: false })
    ]))
    expect(events.snapshot?.events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'evaluation.requested', profile: 'assessment_mysql_events', priority: 'p0' })
    ]))
  })
})
