import type { CacheComponent, CacheFamilyRow, CacheRuntimeView } from './types.cache'
import type { MetricEvidence, SignalSeverity } from './types.shared'

const LEGACY_INSTANCE_ID = 'legacy-representative'

export interface CacheFamilyInstanceRow extends CacheFamilyRow {
  row_key: string
  instance_id: string
  instance_id_reported: boolean
  metric_evidence?: MetricEvidence[]
}

export interface CacheFamilyGroup {
  row_key: string
  component: string
  family: string
  profile: string
  namespace: string
  healthy_instance_count: number
  discovered_instance_count: number
  degraded_instance_count: number
  unavailable_instance_count: number
  severity: SignalSeverity | string
  last_error?: string
  operation_p95?: MetricEvidence
  operation_errors?: MetricEvidence
  metric_evidence: MetricEvidence[]
  instances: CacheFamilyInstanceRow[]
}

export interface CacheRuntimeSummaryView {
  ready: boolean
  component_total: number
  healthy_component_count: number
  discovered_instance_count: number
  healthy_instance_count: number
  family_group_count: number
  abnormal_family_group_count: number
  abnormal_l1_capability_count: number
}

export interface CacheRuntimeProjection {
  summary: CacheRuntimeSummaryView
  family_groups: CacheFamilyGroup[]
  instance_rows: CacheFamilyInstanceRow[]
}

const componentDiscoveredCount = (component?: CacheComponent): number => {
  if (!component) return 0
  if ((component.discovered_instance_count || 0) > 0) return component.discovered_instance_count || 0
  const instanceCount = Object.keys(component.instances || {}).length
  if (instanceCount > 0) return instanceCount
  return component.snapshot ? 1 : 0
}

const componentHealthyInstanceCount = (component?: CacheComponent): number => {
  if (!component?.available) return 0
  const instances = Object.values(component.instances || {})
  if (instances.length > 0) return instances.filter((instance) => instance.summary?.ready).length
  return component.snapshot?.summary?.ready ? 1 : 0
}

const metricIdentity = (item: MetricEvidence): string =>
  [item.name, item.window, item.unit, String(item.value), String(item.available), item.reason].join('|')

const dedupeEvidence = (rows: CacheFamilyRow[]): MetricEvidence[] => {
  const seen = new Set<string>()
  const result: MetricEvidence[] = []
  rows.flatMap((row) => row.metric_evidence || []).forEach((item) => {
    const identity = metricIdentity(item)
    if (!seen.has(identity)) {
      seen.add(identity)
      result.push(item)
    }
  })
  return result
}

const resolveGeneration = (
  components: Record<string, CacheComponent>,
  componentName: string,
  instanceID: string
): string | undefined => {
  const component = components[componentName]
  return component?.instances?.[instanceID]?.generation ||
    (component?.snapshot?.instance_id === instanceID ? component.snapshot.generation : undefined)
}

export const projectCacheRuntime = (
  components: Record<string, CacheComponent> = {},
  familyRows: CacheFamilyRow[] = []
): CacheRuntimeProjection => {
  const instanceRows = familyRows.map((row): CacheFamilyInstanceRow => {
    const reportedID = Boolean(row.instance_id)
    const instanceID = row.instance_id || LEGACY_INSTANCE_ID
    return {
      ...row,
      instance_id: instanceID,
      instance_id_reported: reportedID,
      generation: row.generation || resolveGeneration(components, row.component, instanceID),
      row_key: [row.component, row.family, row.profile, row.namespace, instanceID].join(':'),
      metric_evidence: []
    }
  })

  const rowsByGroup = new Map<string, CacheFamilyInstanceRow[]>()
  instanceRows.forEach((row) => {
    const key = [row.component, row.family, row.profile, row.namespace].join(':')
    rowsByGroup.set(key, [...(rowsByGroup.get(key) || []), row])
  })

  const familyGroups = Array.from(rowsByGroup.entries()).map(([key, rows]): CacheFamilyGroup => {
    const component = components[rows[0].component]
    const discovered = Math.max(componentDiscoveredCount(component), rows.length)
    const healthy = rows.filter((row) => row.available && !row.degraded).length
    const degraded = rows.filter((row) => row.degraded).length
    const unavailable = rows.filter((row) => !row.available).length + Math.max(0, discovered - rows.length)
    const errors = rows.map((row) => row.last_error || row.reason).filter(Boolean) as string[]
    const severity = unavailable > 0
      ? 'critical'
      : degraded > 0 || Boolean(component?.partial) || errors.length > 0
        ? 'warning'
        : 'healthy'
    const sourceRows = familyRows.filter((source) =>
      source.component === rows[0].component && source.family === rows[0].family &&
      source.profile === rows[0].profile && source.namespace === rows[0].namespace
    )
    return {
      row_key: key,
      component: rows[0].component,
      family: rows[0].family,
      profile: rows[0].profile,
      namespace: rows[0].namespace,
      healthy_instance_count: healthy,
      discovered_instance_count: discovered,
      degraded_instance_count: degraded,
      unavailable_instance_count: unavailable,
      severity,
      last_error: errors[0],
      metric_evidence: dedupeEvidence(sourceRows),
      instances: [...rows].sort((left, right) => left.instance_id.localeCompare(right.instance_id))
    }
  }).sort((left, right) => left.row_key.localeCompare(right.row_key))

  const componentNames = new Set<string>([
    ...Object.keys(components),
    ...familyRows.map((row) => row.component)
  ])
  let discoveredInstances = 0
  let healthyInstances = 0
  let healthyComponents = 0
  componentNames.forEach((name) => {
    const component = components[name]
    const fallbackRows = instanceRows.filter((row) => row.component === name)
    const fallbackCount = new Set(fallbackRows.map((row) => row.instance_id)).size
    const discovered = componentDiscoveredCount(component) || fallbackCount
    const healthy = component
      ? componentHealthyInstanceCount(component)
      : new Set(fallbackRows.filter((row) => row.available && !row.degraded).map((row) => row.instance_id)).size
    discoveredInstances += discovered
    healthyInstances += healthy
    if (discovered > 0 && healthy === discovered && !component?.partial && component?.available !== false) {
      healthyComponents++
    }
  })

  const abnormalGroups = familyGroups.filter((group) => group.severity !== 'healthy').length
  const ready = componentNames.size > 0 && healthyComponents === componentNames.size && abnormalGroups === 0
  return {
    summary: {
      ready,
      component_total: componentNames.size,
      healthy_component_count: healthyComponents,
      discovered_instance_count: discoveredInstances,
      healthy_instance_count: healthyInstances,
      family_group_count: familyGroups.length,
      abnormal_family_group_count: abnormalGroups,
      abnormal_l1_capability_count: 0
    },
    family_groups: familyGroups,
    instance_rows: instanceRows
  }
}

export const projectFormalCacheRuntime = (view: CacheRuntimeView): CacheRuntimeProjection => {
  const instanceRows = view.instance_rows.map((row): CacheFamilyInstanceRow => {
    const reportedID = Boolean(row.instance_id)
    const instanceID = row.instance_id || LEGACY_INSTANCE_ID
    return {
      ...row,
      instance_id: instanceID,
      instance_id_reported: reportedID,
      row_key: [row.component, row.family, row.profile, row.namespace, instanceID].join(':'),
      metric_evidence: []
    }
  })
  const familyGroups = view.family_groups.map((group): CacheFamilyGroup => {
    const instances = instanceRows.filter((row) =>
      row.component === group.component && row.family === group.family &&
      row.profile === group.profile && row.namespace === group.namespace
    )
    return {
      ...group,
      row_key: [group.component, group.family, group.profile, group.namespace].join(':'),
      metric_evidence: group.metric_evidence || [],
      instances: instances.sort((left, right) => left.instance_id.localeCompare(right.instance_id))
    }
  }).sort((left, right) => left.row_key.localeCompare(right.row_key))
  return { summary: view.summary, family_groups: familyGroups, instance_rows: instanceRows }
}
