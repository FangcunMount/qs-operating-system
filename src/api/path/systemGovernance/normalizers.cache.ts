import type { ICacheGovernanceStatusResponse } from '../cacheGovernance'
import type { MetricEvidence } from './types.shared'
import type {
  CacheCapabilityPolicyView,
  CacheCapabilityRow,
  CacheCapabilityWorkload,
  CacheEffectiveRegistrySnapshot,
  CacheFamilyRow,
  CacheHotsetItem,
  CacheHotsetView,
  CachePolicyReloadStatus,
  CachePolicyView,
  CacheStatusSnapshot,
  CacheWarmupKind,
  GovernanceCacheResponse,
  RawSystemGovernanceCacheResponse
} from './types.cache'
import {
  isRecord,
  normalizeMetricEvidence,
  normalizeSignals,
  numberFrom,
  stringFrom
} from './normalizers.shared'

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
    capabilities: capabilities.map((item): CacheCapabilityPolicyView => {
      const raw = isRecord(item) ? item : {}
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
        metric_label: stringFrom(raw.metric_label)
      }
    }).sort((left, right) => left.capability.localeCompare(right.capability)),
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
  (Array.isArray(rows) ? rows : []).map((item): CacheCapabilityRow => {
    const raw = isRecord(item) ? item : {}
    const workload = isRecord(raw.workload) ? raw.workload : {}
    const normalizedWorkload: CacheCapabilityWorkload = {
      hit_rate: normalizeMetricEvidenceItem(workload.hit_rate),
      error_count: normalizeMetricEvidenceItem(workload.error_count),
      get_latency_p95: normalizeMetricEvidenceItem(workload.get_latency_p95)
    }
    return {
      capability: stringFrom(raw.capability),
      family: stringFrom(raw.family),
      metric_label: stringFrom(raw.metric_label),
      workload: normalizedWorkload
    }
  }).sort((left, right) => left.capability.localeCompare(right.capability))

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

export const normalizeSystemGovernanceCache = (
  raw: RawSystemGovernanceCacheResponse = {}
): GovernanceCacheResponse => {
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
    hotsets: normalizeCacheHotsets(raw.hotsets)
  }
}
