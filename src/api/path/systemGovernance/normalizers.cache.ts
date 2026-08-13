import type { MetricEvidence } from './types.shared'
import type {
  CacheCapabilityPolicyView,
  CacheCapabilityRow,
  CacheCapabilityWorkload,
  CacheEffectiveRegistrySnapshot,
  CacheFamilyRow,
  CacheHotsetItem,
  CacheHotsetView,
  ICacheGovernanceStatusResponse,
  CachePolicyReloadStatus,
  CachePolicyView,
  CacheStatusSnapshot,
  CacheWarmupKind,
  CacheRegistryView,
  CacheRegistryCapabilityRow,
  CacheRuntimeView,
  CacheTopologyView,
  GovernanceCacheResponse,
  RawSystemGovernanceCacheResponse
} from './types.cache'
import { isRecord, normalizeMetricEvidence, normalizeSignals, numberFrom, stringFrom } from './normalizers.shared'

const EMPTY_CACHE_SUMMARY: ICacheGovernanceStatusResponse['summary'] = {
  family_total: 0,
  available_count: 0,
  degraded_count: 0,
  unavailable_count: 0,
  ready: true
}

const EMPTY_CACHE_WARMUP: ICacheGovernanceStatusResponse['warmup'] = {
  enabled: false,
  startup: {
    static: false,
    query: false
  },
  hotset: {
    enable: false,
    top_n: 0,
    max_items_per_kind: 0
  },
  latest_runs: []
}

const EMPTY_RELOAD_STATUS: CachePolicyReloadStatus = {}

const normalizePolicyView = (value: unknown): CachePolicyView => {
  const raw = isRecord(value) ? value : {}
  return {
    ttl: stringFrom(raw.ttl),
    negative_ttl: stringFrom(raw.negative_ttl),
    ttl_jitter_ratio: numberFrom(raw.ttl_jitter_ratio),
    compress: stringFrom(raw.compress) || 'inherit',
    singleflight: stringFrom(raw.singleflight) || 'inherit',
    negative: stringFrom(raw.negative) || 'inherit'
  }
}

const normalizeCapabilityPolicy = (value: unknown): CacheCapabilityPolicyView => {
  const raw = isRecord(value) ? value : {}
  return {
    capability: stringFrom(raw.capability),
    owner: stringFrom(raw.owner),
    kind: stringFrom(raw.kind),
    layer: stringFrom(raw.layer),
    family: stringFrom(raw.family),
    enabled: Boolean(raw.enabled),
    spec_default: normalizePolicyView(raw.spec_default),
    global_default: normalizePolicyView(raw.global_default),
    family_default: normalizePolicyView(raw.family_default),
    override: normalizePolicyView(raw.override),
    effective: normalizePolicyView(raw.effective),
    source: stringFrom(raw.source),
    metric_label: stringFrom(raw.metric_label),
    topology_group: stringFrom(raw.topology_group) || undefined,
    topology_order: raw.topology_order === undefined ? undefined : numberFrom(raw.topology_order),
    read_model: stringFrom(raw.read_model) || undefined
  }
}

const normalizeEffectiveRegistry = (value: unknown): CacheEffectiveRegistrySnapshot | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  const reload = isRecord(value.reload) ? value.reload : EMPTY_RELOAD_STATUS
  const capabilities = Array.isArray(value.capabilities) ? value.capabilities : []
  return {
    snapshot_version: numberFrom(value.snapshot_version),
    catalog_version: stringFrom(value.catalog_version),
    generated_at: stringFrom(value.generated_at) || undefined,
    capabilities: capabilities
      .map(normalizeCapabilityPolicy)
      .sort((left, right) => left.capability.localeCompare(right.capability)),
    policy_source: isRecord(value.policy_source) ? {
      component: stringFrom(value.policy_source.component),
      schema_version: stringFrom(value.policy_source.schema_version),
      path: stringFrom(value.policy_source.path),
      policy_sha256: stringFrom(value.policy_source.policy_sha256)
    } : undefined,
    reload: {
      last_attempt_at: stringFrom(reload.last_attempt_at) || undefined,
      last_success_at: stringFrom(reload.last_success_at) || undefined,
      last_failure_at: stringFrom(reload.last_failure_at) || undefined,
      last_error: stringFrom(reload.last_error) || undefined
    }
  }
}

const normalizeMetricEvidenceItem = (value: unknown): MetricEvidence | undefined => {
  if (!isRecord(value)) {
    return undefined
  }
  return {
    name: stringFrom(value.name),
    window: stringFrom(value.window),
    value: typeof value.value === 'number' || typeof value.value === 'string' ? value.value : undefined,
    unit: stringFrom(value.unit) || undefined,
    available: Boolean(value.available),
    reason: stringFrom(value.reason) || undefined
  }
}

const normalizeCapabilityRows = (rows: unknown): CacheCapabilityRow[] =>
  (Array.isArray(rows) ? rows : [])
    .map((item): CacheCapabilityRow => {
      const raw = isRecord(item) ? item : {}
      const workload = isRecord(raw.workload) ? raw.workload : {}
      const normalizedWorkload: CacheCapabilityWorkload = {
        hit_rate: normalizeMetricEvidenceItem(workload.hit_rate),
        samples: normalizeMetricEvidenceItem(workload.samples),
        error_count: normalizeMetricEvidenceItem(workload.error_count),
        get_latency_p95: normalizeMetricEvidenceItem(workload.get_latency_p95)
      }
      return {
        capability: stringFrom(raw.capability),
        family: stringFrom(raw.family),
        metric_label: stringFrom(raw.metric_label),
        workload: normalizedWorkload
      }
    })
    .sort((left, right) => left.capability.localeCompare(right.capability))

const DEFAULT_CACHE_WARMUP_KINDS: CacheWarmupKind[] = [
  { kind: 'static.scale', family: 'static_meta', scope_example: 'scale:S-001', supports_manual_warmup: true },
  { kind: 'static.questionnaire', family: 'static_meta', scope_example: 'questionnaire:Q-001', supports_manual_warmup: true },
  { kind: 'static.scale_list', family: 'static_meta', scope_example: 'published', supports_manual_warmup: true },
  { kind: 'static.personality_model', family: 'static_meta', scope_example: 'personality_model:M-001', supports_manual_warmup: true },
  { kind: 'query.stats_overview', family: 'query_result', scope_example: 'org:1:preset:30d', supports_manual_warmup: true },
  { kind: 'query.stats_system', family: 'query_result', scope_example: 'org:1', supports_manual_warmup: true },
  { kind: 'query.stats_questionnaire', family: 'query_result', scope_example: 'org:1:questionnaire:Q-001', supports_manual_warmup: true },
  { kind: 'query.stats_plan', family: 'query_result', scope_example: 'org:1:plan:99', supports_manual_warmup: true }
]

const normalizeCacheFamilyRows = (
  rows: CacheFamilyRow[] | undefined,
  families: ICacheGovernanceStatusResponse['families'] = []
): CacheFamilyRow[] => {
  if (Array.isArray(rows) && rows.length > 0) {
    return rows.map((row) => ({
      ...row,
      available: Boolean(row.available),
      degraded: Boolean(row.degraded),
      severity: row.severity || (!row.available ? 'critical' : row.degraded ? 'warning' : 'healthy'),
      reason: row.reason || row.last_error,
      metric_evidence: normalizeMetricEvidence(row.metric_evidence)
    }))
  }
  return families.map((family) => ({
    ...family,
    severity: !family.available ? 'critical' : family.degraded ? 'warning' : 'healthy',
    reason: family.last_error,
    metric_evidence: []
  }))
}

const normalizeCacheHotsetItem = (item: unknown): CacheHotsetItem => {
  const raw = isRecord(item) ? item : {}
  const target = isRecord(raw.target) ? raw.target : isRecord(raw.Target) ? raw.Target : {}
  return {
    family: stringFrom(raw.family ?? raw.Family ?? target.family ?? target.Family),
    kind: stringFrom(raw.kind ?? raw.Kind ?? target.kind ?? target.Kind),
    scope: stringFrom(raw.scope ?? raw.Scope ?? target.scope ?? target.Scope),
    score: numberFrom(raw.score ?? raw.Score)
  }
}

const normalizeCacheHotsets = (hotsets: CacheHotsetView[] | undefined): CacheHotsetView[] =>
  (Array.isArray(hotsets) ? hotsets : []).map((hotset) => ({
    ...hotset,
    family: hotset.family,
    kind: hotset.kind,
    limit: numberFrom(hotset.limit),
    available: Boolean(hotset.available),
    degraded: Boolean(hotset.degraded),
    items: (Array.isArray(hotset.items) ? hotset.items : []).map((item) => normalizeCacheHotsetItem(item)),
    metric_evidence: normalizeMetricEvidence(hotset.metric_evidence)
  }))

const normalizePolicySource = (value: unknown) => isRecord(value) ? {
  component: stringFrom(value.component),
  schema_version: stringFrom(value.schema_version),
  path: stringFrom(value.path),
  policy_sha256: stringFrom(value.policy_sha256)
} : undefined

const normalizeRegistryView = (value: unknown): CacheRegistryView | undefined => {
  if (!isRecord(value)) return undefined
  const componentRegistries = Array.isArray(value.component_registries) ? value.component_registries : []
  const capabilityRows = Array.isArray(value.capability_rows) ? value.capability_rows : []
  const driftRows = Array.isArray(value.registry_drift) ? value.registry_drift : []
  return {
    component_registries: componentRegistries.map((item) => {
      const raw = isRecord(item) ? item : {}
      return {
        component: stringFrom(raw.component),
        instance_id: stringFrom(raw.instance_id) || undefined,
        generation: stringFrom(raw.generation) || undefined,
        available: Boolean(raw.available),
        reason: stringFrom(raw.reason) || undefined,
        snapshot_version: raw.snapshot_version === undefined ? undefined : numberFrom(raw.snapshot_version),
        catalog_version: stringFrom(raw.catalog_version) || undefined,
        policy_source: normalizePolicySource(raw.policy_source),
        capabilities: (Array.isArray(raw.capabilities) ? raw.capabilities : []).map(normalizeCapabilityPolicy)
      }
    }),
    capability_rows: capabilityRows.map((item): CacheRegistryCapabilityRow => {
      const raw = isRecord(item) ? item : {}
      return {
        component: stringFrom(raw.component),
        capability: stringFrom(raw.capability),
        layer: stringFrom(raw.layer),
        consistent: Boolean(raw.consistent),
        instance_ids: Array.isArray(raw.instance_ids) ? raw.instance_ids.map((item) => stringFrom(item)) : [],
        policy_sha256: stringFrom(raw.policy_sha256) || undefined,
        owner: stringFrom(raw.owner) || undefined,
        kind: stringFrom(raw.kind) || undefined,
        family: stringFrom(raw.family) || undefined,
        enabled: typeof raw.enabled === 'boolean' ? raw.enabled : undefined,
        metric_label: stringFrom(raw.metric_label) || undefined,
        effective_policy: isRecord(raw.effective_policy) ? normalizePolicyView(raw.effective_policy) : undefined,
        variants: (Array.isArray(raw.variants) ? raw.variants : []).map((variant) => {
          const rawVariant = isRecord(variant) ? variant : {}
          return {
            policy_sha256: stringFrom(rawVariant.policy_sha256) || undefined,
            instance_ids: Array.isArray(rawVariant.instance_ids) ? rawVariant.instance_ids.map((item) => stringFrom(item)) : [],
            owner: stringFrom(rawVariant.owner),
            kind: stringFrom(rawVariant.kind),
            layer: stringFrom(rawVariant.layer),
            family: stringFrom(rawVariant.family),
            enabled: Boolean(rawVariant.enabled),
            metric_label: stringFrom(rawVariant.metric_label),
            effective_policy: normalizePolicyView(rawVariant.effective_policy),
            topology_group: stringFrom(rawVariant.topology_group) || undefined,
            topology_order: rawVariant.topology_order === undefined ? undefined : numberFrom(rawVariant.topology_order),
            read_model: stringFrom(rawVariant.read_model) || undefined
          }
        }),
        topology_group: stringFrom(raw.topology_group) || undefined,
        topology_order: raw.topology_order === undefined ? undefined : numberFrom(raw.topology_order),
        read_model: stringFrom(raw.read_model) || undefined
      }
    }),
    registry_drift: driftRows.map((item) => {
      const raw = isRecord(item) ? item : {}
      return {
        component: stringFrom(raw.component),
        kind: stringFrom(raw.kind),
        message: stringFrom(raw.message),
        instance_ids: Array.isArray(raw.instance_ids) ? raw.instance_ids.map((item) => stringFrom(item)) : undefined,
        values: isRecord(raw.values)
          ? Object.fromEntries(Object.entries(raw.values).map(([key, values]) => [
            key,
            Array.isArray(values) ? values.map((item) => stringFrom(item)) : []
          ]))
          : undefined
      }
    })
  }
}

const normalizeRuntimeView = (value: unknown): CacheRuntimeView | undefined => {
  if (!isRecord(value)) return undefined
  const summary = isRecord(value.summary) ? value.summary : {}
  const familyGroups = Array.isArray(value.family_groups) ? value.family_groups : []
  const instanceRows = Array.isArray(value.instance_rows) ? value.instance_rows : []
  const l1Rows = Array.isArray(value.l1_capability_runtime) ? value.l1_capability_runtime : []
  return {
    summary: {
      ready: Boolean(summary.ready),
      component_total: numberFrom(summary.component_total),
      healthy_component_count: numberFrom(summary.healthy_component_count),
      discovered_instance_count: numberFrom(summary.discovered_instance_count),
      healthy_instance_count: numberFrom(summary.healthy_instance_count),
      family_group_count: numberFrom(summary.family_group_count),
      abnormal_family_group_count: numberFrom(summary.abnormal_family_group_count),
      abnormal_l1_capability_count: numberFrom(summary.abnormal_l1_capability_count)
    },
    l1_capability_runtime: l1Rows.map((item) => {
      const raw = isRecord(item) ? item : {}
      const watcher = isRecord(raw.signal_watcher) ? raw.signal_watcher : {}
      return {
        component: stringFrom(raw.component),
        instance_id: stringFrom(raw.instance_id),
        generation: stringFrom(raw.generation) || undefined,
        capability: stringFrom(raw.capability),
        enabled: Boolean(raw.enabled),
        buckets: (Array.isArray(raw.buckets) ? raw.buckets : []).map((bucket) => {
          const rawBucket = isRecord(bucket) ? bucket : {}
          return {
            bucket: stringFrom(rawBucket.bucket), entries: numberFrom(rawBucket.entries),
            max_entries: numberFrom(rawBucket.max_entries), hits: numberFrom(rawBucket.hits), misses: numberFrom(rawBucket.misses),
            fifo_evictions: numberFrom(rawBucket.fifo_evictions), ttl_expirations: numberFrom(rawBucket.ttl_expirations),
            explicit_deletions: numberFrom(rawBucket.explicit_deletions), signal_deletions: numberFrom(rawBucket.signal_deletions)
          }
        }),
        signal_watcher: {
          configured: Boolean(watcher.configured), status: stringFrom(watcher.status),
          last_signal_at: stringFrom(watcher.last_signal_at) || undefined,
          last_eviction_at: stringFrom(watcher.last_eviction_at) || undefined,
          last_error_at: stringFrom(watcher.last_error_at) || undefined,
          last_error: stringFrom(watcher.last_error) || undefined,
          reconnect_count: numberFrom(watcher.reconnect_count)
        },
        hit_rate: normalizeMetricEvidenceItem(raw.hit_rate),
        samples: normalizeMetricEvidenceItem(raw.samples)
      }
    }),
    family_groups: familyGroups.map((item) => {
      const raw = isRecord(item) ? item : {}
      return {
        component: stringFrom(raw.component), family: stringFrom(raw.family), profile: stringFrom(raw.profile),
        namespace: stringFrom(raw.namespace), healthy_instance_count: numberFrom(raw.healthy_instance_count),
        discovered_instance_count: numberFrom(raw.discovered_instance_count),
        degraded_instance_count: numberFrom(raw.degraded_instance_count),
        unavailable_instance_count: numberFrom(raw.unavailable_instance_count),
        severity: stringFrom(raw.severity) || 'healthy', last_error: stringFrom(raw.last_error) || undefined,
        operation_p95: normalizeMetricEvidenceItem(raw.operation_p95),
        operation_errors: normalizeMetricEvidenceItem(raw.operation_errors),
        metric_evidence: normalizeMetricEvidence(raw.metric_evidence)
      }
    }),
    instance_rows: normalizeCacheFamilyRows(instanceRows as CacheFamilyRow[], [])
  }
}

const normalizeTopologyView = (value: unknown): CacheTopologyView | undefined => {
  if (!isRecord(value)) return undefined
  const topologies = Array.isArray(value.topologies) ? value.topologies : []
  return {
    topologies: topologies.map((item) => {
      const raw = isRecord(item) ? item : {}
      const source = isRecord(raw.source) ? raw.source : {}
      const evidence = isRecord(raw.window_evidence) ? raw.window_evidence : {}
      return {
        topology_group: stringFrom(raw.topology_group),
        read_model: stringFrom(raw.read_model),
        status: stringFrom(raw.status),
        nodes: (Array.isArray(raw.nodes) ? raw.nodes : []).map((node) => {
          const rawNode = isRecord(node) ? node : {}
          return {
            id: stringFrom(rawNode.id), component: stringFrom(rawNode.component), capability: stringFrom(rawNode.capability),
            layer: stringFrom(rawNode.layer), enabled: typeof rawNode.enabled === 'boolean' ? rawNode.enabled : undefined,
            registry_consistent: Boolean(rawNode.registry_consistent), runtime_health: stringFrom(rawNode.runtime_health),
            policy_source: stringFrom(rawNode.policy_source) || undefined,
            hit_rate: normalizeMetricEvidenceItem(rawNode.hit_rate), samples: normalizeMetricEvidenceItem(rawNode.samples),
            order: numberFrom(rawNode.order)
          }
        }),
        edges: (Array.isArray(raw.edges) ? raw.edges : []).map((edge) => {
          const rawEdge = isRecord(edge) ? edge : {}
          return { from: stringFrom(rawEdge.from), to: stringFrom(rawEdge.to), kind: stringFrom(rawEdge.kind) }
        }),
        source: { id: stringFrom(source.id), read_model: stringFrom(source.read_model), source_kind: stringFrom(source.source_kind) },
        window_evidence: Object.fromEntries(Object.entries(evidence).map(([key, metric]) => [key, normalizeMetricEvidenceItem(metric)]))
      }
    })
  }
}

export const normalizeSystemGovernanceCache = (raw: RawSystemGovernanceCacheResponse = {}): GovernanceCacheResponse => {
  const rawSnapshot = (raw.snapshot || raw) as CacheStatusSnapshot
  const snapshot: CacheStatusSnapshot = {
    ...rawSnapshot,
    effective_registry: normalizeEffectiveRegistry(rawSnapshot.effective_registry)
  }
  const families = snapshot.families || raw.families || []
  return {
    generated_at: raw.generated_at || snapshot.generated_at,
    component: snapshot.component || raw.component,
    window: raw.window,
    metrics: raw.metrics,
    signals: normalizeSignals(raw.signals || []),
    snapshot,
    summary: snapshot.summary || raw.summary || EMPTY_CACHE_SUMMARY,
    families,
    warmup: snapshot.warmup || raw.warmup || EMPTY_CACHE_WARMUP,
    effective_registry: snapshot.effective_registry,
    components: raw.components || {},
    family_rows: normalizeCacheFamilyRows(raw.family_rows, families),
    capability_rows: normalizeCapabilityRows(raw.capability_rows),
    warmup_kinds: Array.isArray(raw.warmup_kinds) && raw.warmup_kinds.length > 0 ? raw.warmup_kinds : DEFAULT_CACHE_WARMUP_KINDS,
    hotsets: normalizeCacheHotsets(raw.hotsets),
    registry_view: normalizeRegistryView(raw.registry_view),
    runtime_view: normalizeRuntimeView(raw.runtime_view),
    topology_view: normalizeTopologyView(raw.topology_view)
  }
}
