import type { ICacheGovernanceStatusResponse } from '../cacheGovernance'
import type {
  CacheFamilyRow,
  CacheHotsetItem,
  CacheHotsetView,
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
  const snapshot = raw.snapshot || raw as ICacheGovernanceStatusResponse
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
    components: raw.components || {},
    family_rows: normalizeCacheFamilyRows(raw.family_rows, families),
    warmup_kinds: Array.isArray(raw.warmup_kinds) && raw.warmup_kinds.length > 0 ? raw.warmup_kinds : DEFAULT_CACHE_WARMUP_KINDS,
    hotsets: normalizeCacheHotsets(raw.hotsets)
  }
}
