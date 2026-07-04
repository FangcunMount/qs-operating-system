import type { IResilienceComponentStatus } from '../resilienceGovernance'
import type {
  GovernanceResilienceResponse,
  RawSystemGovernanceComponentResilience,
  RawSystemGovernanceResilienceResponse,
  ResilienceBackpressureRow,
  ResilienceCapabilityRow,
  ResilienceQueueRow,
  ResilienceSummary
} from './types.resilience'
import {
  dedupeMetricEvidence,
  isRecord,
  normalizeMetricEvidence,
  normalizeSignals,
  numberFrom
} from './normalizers.shared'

const EMPTY_RESILIENCE_SUMMARY: ResilienceSummary = {
  component_count: 0,
  unavailable_component_count: 0,
  not_ready_component_count: 0,
  queue_count: 0,
  warning_queue_count: 0,
  critical_queue_count: 0,
  max_queue_utilization: 0,
  backpressure_count: 0,
  warning_backpressure_count: 0,
  critical_backpressure_count: 0,
  max_backpressure_utilization: 0,
  degraded_capability_count: 0
}

const componentFromRaw = (
  name: string,
  item: RawSystemGovernanceComponentResilience | IResilienceComponentStatus
): IResilienceComponentStatus => {
  const oldShape = item as IResilienceComponentStatus
  if (oldShape.component && typeof oldShape.degraded === 'boolean') {
    return oldShape
  }
  const raw = item as RawSystemGovernanceComponentResilience
  const snapshot = raw.snapshot
  const available = raw.available !== false
  return {
    component: name,
    source: `/internal/v1/system-governance/resilience#${name}`,
    configured: available || Boolean(snapshot),
    degraded: !available || Boolean(snapshot && !snapshot.summary?.ready),
    error: raw.reason,
    snapshot
  }
}

const normalizeResilienceComponents = (
  components: RawSystemGovernanceResilienceResponse['components']
): { list: IResilienceComponentStatus[]; raw: Record<string, RawSystemGovernanceComponentResilience> } => {
  if (Array.isArray(components)) {
    const raw = components.reduce<Record<string, RawSystemGovernanceComponentResilience>>((acc, item) => {
      acc[item.component] = {
        available: !item.degraded,
        reason: item.error,
        snapshot: item.snapshot
      }
      return acc
    }, {})
    return { list: components, raw }
  }
  const raw = components || {}
  const list = Object.keys(raw)
    .sort()
    .map((name) => componentFromRaw(name, raw[name]))
  return { list, raw }
}

const queueUtilization = (depth: number, capacity: number): number =>
  capacity > 0 ? depth / capacity : 0

const backpressureUtilization = (inFlight: number, maxInflight: number): number =>
  maxInflight > 0 ? inFlight / maxInflight : 0

const severityFromQueueUtilization = (utilization: number): string => {
  if (utilization >= 0.9) return 'critical'
  if (utilization >= 0.7) return 'warning'
  return 'healthy'
}

const severityFromBackpressure = (utilization: number, degraded?: boolean): string => {
  if (utilization >= 0.9) return 'critical'
  if (utilization >= 0.8 || degraded) return 'warning'
  return 'healthy'
}

const normalizeStatusCounts = (value: unknown): Record<string, number> | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  return Object.keys(value).reduce<Record<string, number>>((acc, key) => {
    acc[key] = numberFrom(value[key])
    return acc
  }, {})
}

const normalizeResilienceQueueRows = (
  rows: ResilienceQueueRow[] | undefined,
  components: IResilienceComponentStatus[]
): ResilienceQueueRow[] => {
  if (Array.isArray(rows)) {
    return rows.map((row) => {
      const depth = numberFrom(row.depth)
      const capacity = numberFrom(row.capacity)
      const utilization = numberFrom(row.utilization, queueUtilization(depth, capacity))
      return {
        ...row,
        component: row.component || '',
        name: row.name || '',
        strategy: row.strategy || '',
        depth,
        capacity,
        utilization,
        status_counts: normalizeStatusCounts(row.status_counts),
        severity: row.severity || severityFromQueueUtilization(utilization),
        metric_evidence: normalizeMetricEvidence(row.metric_evidence)
      }
    })
  }
  return components.flatMap((component) => (component.snapshot?.queues || []).map((queue) => {
    const depth = numberFrom(queue.depth)
    const capacity = numberFrom(queue.capacity)
    const utilization = queueUtilization(depth, capacity)
    return {
      component: component.component,
      name: queue.name,
      strategy: queue.strategy,
      depth,
      capacity,
      utilization,
      status_counts: normalizeStatusCounts(queue.status_counts),
      lifecycle_boundary: queue.lifecycle_boundary,
      severity: severityFromQueueUtilization(utilization),
      metric_evidence: []
    }
  }))
}

const normalizeResilienceBackpressureRows = (
  rows: ResilienceBackpressureRow[] | undefined,
  components: IResilienceComponentStatus[]
): ResilienceBackpressureRow[] => {
  if (Array.isArray(rows)) {
    return rows.map((row) => {
      const inFlight = numberFrom(row.in_flight)
      const maxInflight = numberFrom(row.max_inflight)
      const degraded = Boolean(row.degraded)
      const utilization = numberFrom(row.utilization, backpressureUtilization(inFlight, maxInflight))
      return {
        ...row,
        component: row.component || '',
        name: row.name || '',
        dependency: row.dependency || '',
        strategy: row.strategy || '',
        enabled: Boolean(row.enabled),
        in_flight: inFlight,
        max_inflight: maxInflight,
        utilization,
        timeout_millis: numberFrom(row.timeout_millis),
        degraded,
        severity: row.severity || severityFromBackpressure(utilization, degraded),
        metric_evidence: normalizeMetricEvidence(row.metric_evidence)
      }
    })
  }
  return components.flatMap((component) => (component.snapshot?.backpressure || []).map((item) => {
    const inFlight = numberFrom(item.in_flight)
    const maxInflight = numberFrom(item.max_inflight)
    const degraded = Boolean(item.degraded)
    const utilization = backpressureUtilization(inFlight, maxInflight)
    return {
      component: component.component,
      name: item.name,
      dependency: item.dependency,
      strategy: item.strategy,
      enabled: Boolean(item.enabled),
      in_flight: inFlight,
      max_inflight: maxInflight,
      utilization,
      timeout_millis: numberFrom(item.timeout_millis),
      degraded,
      reason: item.reason,
      severity: severityFromBackpressure(utilization, degraded),
      metric_evidence: []
    }
  }))
}

const capabilitySeverity = (degraded?: boolean): string => degraded ? 'warning' : 'healthy'

const normalizeResilienceCapabilityRows = (
  rows: ResilienceCapabilityRow[] | undefined,
  components: IResilienceComponentStatus[]
): ResilienceCapabilityRow[] => {
  if (Array.isArray(rows)) {
    return rows.map((row) => ({
      ...row,
      component: row.component || '',
      kind: row.kind || '',
      name: row.name || '',
      strategy: row.strategy || '',
      configured: Boolean(row.configured),
      degraded: Boolean(row.degraded),
      severity: row.severity || capabilitySeverity(row.degraded)
    }))
  }
  const fields: Array<{ key: 'rate_limits' | 'locks' | 'idempotency' | 'duplicate_suppression'; kind: string }> = [
    { key: 'rate_limits', kind: 'rate_limit' },
    { key: 'locks', kind: 'lock' },
    { key: 'idempotency', kind: 'idempotency' },
    { key: 'duplicate_suppression', kind: 'duplicate_suppression' }
  ]
  return components.flatMap((component) => fields.flatMap((field) => (
    component.snapshot?.[field.key] || []
  ).map((item) => ({
    component: component.component,
    kind: item.kind || field.kind,
    name: item.name,
    strategy: item.strategy,
    configured: Boolean(item.configured),
    degraded: Boolean(item.degraded),
    severity: capabilitySeverity(item.degraded),
    reason: item.reason
  }))))
}

const normalizeResilienceSummary = (
  rawSummary: Partial<ResilienceSummary> | undefined,
  components: IResilienceComponentStatus[],
  rawComponents: Record<string, RawSystemGovernanceComponentResilience>,
  queueRows: ResilienceQueueRow[],
  backpressureRows: ResilienceBackpressureRow[],
  capabilityRows: ResilienceCapabilityRow[]
): ResilienceSummary => {
  const unavailableComponentCount = components.filter((component) => {
    const raw = rawComponents[component.component]
    return raw?.available === false || (!component.snapshot && Boolean(component.error))
  }).length
  const warningBackpressureCount = backpressureRows.filter((row) => row.severity === 'warning').length
  const criticalBackpressureCount = backpressureRows.filter((row) => row.severity === 'critical').length
  const maxBackpressureUtilization = Math.max(0, ...backpressureRows.map((row) => row.utilization))
  return {
    ...EMPTY_RESILIENCE_SUMMARY,
    ...rawSummary,
    component_count: numberFrom(rawSummary?.component_count, components.length),
    unavailable_component_count: numberFrom(rawSummary?.unavailable_component_count, unavailableComponentCount),
    not_ready_component_count: numberFrom(
      rawSummary?.not_ready_component_count,
      components.filter((component) => component.snapshot && !component.snapshot.summary?.ready).length
    ),
    queue_count: numberFrom(rawSummary?.queue_count, queueRows.length),
    warning_queue_count: numberFrom(rawSummary?.warning_queue_count, queueRows.filter((row) => row.severity === 'warning').length),
    critical_queue_count: numberFrom(rawSummary?.critical_queue_count, queueRows.filter((row) => row.severity === 'critical').length),
    max_queue_utilization: numberFrom(rawSummary?.max_queue_utilization, Math.max(0, ...queueRows.map((row) => row.utilization))),
    backpressure_count: numberFrom(rawSummary?.backpressure_count, backpressureRows.length),
    warning_backpressure_count: numberFrom(rawSummary?.warning_backpressure_count, warningBackpressureCount),
    critical_backpressure_count: numberFrom(rawSummary?.critical_backpressure_count, criticalBackpressureCount),
    max_backpressure_utilization: numberFrom(rawSummary?.max_backpressure_utilization, maxBackpressureUtilization),
    degraded_capability_count: numberFrom(rawSummary?.degraded_capability_count, capabilityRows.filter((row) => row.degraded).length)
  }
}

export const normalizeSystemGovernanceResilience = (
  raw: RawSystemGovernanceResilienceResponse = {}
): GovernanceResilienceResponse => {
  const components = normalizeResilienceComponents(raw.components)
  const signals = normalizeSignals(raw.signals || [])
  const queueRows = normalizeResilienceQueueRows(raw.queue_rows, components.list)
  const backpressureRows = normalizeResilienceBackpressureRows(raw.backpressure_rows, components.list)
  const capabilityRows = normalizeResilienceCapabilityRows(raw.capability_rows, components.list)
  return {
    generated_at: raw.generated_at,
    window: raw.window,
    metrics: raw.metrics,
    components: components.list,
    raw_components: components.raw,
    summary: normalizeResilienceSummary(raw.summary, components.list, components.raw, queueRows, backpressureRows, capabilityRows),
    queue_rows: queueRows,
    backpressure_rows: backpressureRows,
    capability_rows: capabilityRows,
    signals,
    metric_evidence: dedupeMetricEvidence([
      ...normalizeMetricEvidence(raw.metric_evidence),
      ...signals.flatMap((signal) => signal.metric_evidence || []),
      ...queueRows.flatMap((row) => row.metric_evidence || []),
      ...backpressureRows.flatMap((row) => row.metric_evidence || [])
    ])
  }
}
