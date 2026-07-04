import queueFullFixture from '../__fixtures__/systemGovernance.queue-full.json'
import resiliencePressureFixture from '../__fixtures__/systemGovernance.resilience-pressure.json'
import { normalizeSystemGovernanceResilience } from './normalizers.resilience'

describe('systemGovernance resilience normalizer', () => {
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
    expect(resilience.queue_rows[0]).toMatchObject({
      component: 'collection-server',
      name: 'answersheet_submit',
      utilization: 0.95,
      severity: 'critical'
    })
    expect(resilience.summary).toMatchObject({
      component_count: 1,
      queue_count: 1,
      critical_queue_count: 1,
      max_queue_utilization: 0.95
    })
  })

  it('prefers backend resilience rows and summary when present', () => {
    const resilience = normalizeSystemGovernanceResilience(resiliencePressureFixture)
    expect(resilience.summary).toMatchObject({
      component_count: 2,
      unavailable_component_count: 1,
      critical_queue_count: 1,
      warning_backpressure_count: 1,
      degraded_capability_count: 1
    })
    expect(resilience.queue_rows[0]).toMatchObject({
      component: 'collection-server',
      name: 'answersheet_submit',
      status_counts: { pending: 95 },
      severity: 'critical'
    })
    expect(resilience.backpressure_rows[0]).toMatchObject({
      component: 'apiserver',
      dependency: 'mysql',
      utilization: 0.8,
      severity: 'warning'
    })
    expect(resilience.capability_rows[0]).toMatchObject({
      kind: 'rate_limit',
      name: 'api_global',
      severity: 'warning'
    })
    expect(resilience.metric_evidence?.map((item) => item.name)).toContain('backpressure_timeout_apiserver_mysql')
  })
})
