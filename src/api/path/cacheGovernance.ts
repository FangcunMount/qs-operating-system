import { internalGet, internalPost } from '../qsServer'
import { config } from '@/config/config'
import type { QSResponse } from '@/types/qs'

/** 热点预览支持的 kind（meta hotset / static_meta） */
export const CACHE_GOVERNANCE_HOTSET_KINDS = [
  'static.scale',
  'static.questionnaire',
  'static.scale_list'
] as const

/** 手工预热支持的 kind（含 query_result 查询统计类） */
export const CACHE_GOVERNANCE_WARMUP_KINDS = [
  'static.scale',
  'static.questionnaire',
  'static.scale_list',
  'query.stats_system',
  'query.stats_questionnaire',
  'query.stats_plan'
] as const

export type CacheGovernanceHotsetKind = typeof CACHE_GOVERNANCE_HOTSET_KINDS[number]
export type CacheGovernanceWarmupKind = typeof CACHE_GOVERNANCE_WARMUP_KINDS[number]

export interface ICacheGovernanceSummary {
  family_total: number
  available_count: number
  degraded_count: number
  unavailable_count: number
  ready: boolean
}

export interface ICacheGovernanceFamilyStatus {
  component: string
  family: string
  profile: string
  namespace: string
  allow_warmup: boolean
  configured: boolean
  available: boolean
  degraded: boolean
  mode: string
  last_error?: string
  last_success_at?: string
  last_failure_at?: string
  consecutive_failures: number
  updated_at?: string
}

export interface ICacheGovernanceWarmupRun {
  trigger: string
  started_at?: string
  finished_at?: string
  result: string
  target_count: number
  ok_count: number
  error_count: number
  skipped_count: number
}

export interface ICacheGovernanceWarmupConfig {
  enabled: boolean
  startup: {
    static: boolean
    query: boolean
  }
  hotset: {
    enable: boolean
    top_n: number
    max_items_per_kind: number
  }
  latest_runs: ICacheGovernanceWarmupRun[]
}

export interface ICacheGovernanceStatusResponse {
  generated_at?: string
  component?: string
  summary: ICacheGovernanceSummary
  families: ICacheGovernanceFamilyStatus[]
  warmup: ICacheGovernanceWarmupConfig
}

export interface ICacheGovernanceHotsetTarget {
  family?: string
  Family?: string
  kind?: string
  Kind?: string
  scope?: string
  Scope?: string
}

/** qs-apiserver 原始 hotset item（Go 导出字段为 PascalCase） */
export interface ICacheGovernanceHotsetItemRaw {
  target?: ICacheGovernanceHotsetTarget
  scope?: string
  score: number
}

export interface ICacheGovernanceHotsetItem {
  scope: string
  score: number
  family?: string
  kind?: string
}

export const normalizeHotsetItem = (item: ICacheGovernanceHotsetItemRaw): ICacheGovernanceHotsetItem => {
  const target = item.target
  return {
    scope: item.scope || target?.scope || target?.Scope || '',
    family: target?.family || target?.Family,
    kind: target?.kind || target?.Kind,
    score: item.score
  }
}

export const normalizeHotsetItems = (
  items: ICacheGovernanceHotsetItemRaw[] = []
): ICacheGovernanceHotsetItem[] => items.map((item) => normalizeHotsetItem(item))

export interface ICacheGovernanceHotsetResponseRaw {
  family: string
  kind: CacheGovernanceHotsetKind | string
  limit: number
  available: boolean
  degraded: boolean
  message?: string
  items: ICacheGovernanceHotsetItemRaw[]
}

export interface ICacheGovernanceHotsetResponse extends Omit<ICacheGovernanceHotsetResponseRaw, 'items'> {
  items: ICacheGovernanceHotsetItem[]
}

export interface ICacheGovernanceManualWarmupTarget {
  kind: CacheGovernanceWarmupKind
  scope: string
}

export interface ICacheGovernanceManualWarmupRequest {
  targets: ICacheGovernanceManualWarmupTarget[]
}

export interface ICacheGovernanceManualWarmupSummary {
  target_count: number
  ok_count: number
  skipped_count: number
  error_count: number
  result: string
}

export interface ICacheGovernanceManualWarmupItemResult {
  family: string
  kind: string
  scope: string
  status: 'ok' | 'skipped' | 'error'
  message: string
}

export interface ICacheGovernanceManualWarmupResult {
  trigger: string
  started_at?: string
  finished_at?: string
  summary: ICacheGovernanceManualWarmupSummary
  items: ICacheGovernanceManualWarmupItemResult[]
}

export interface ICacheGovernanceLinks {
  overview?: string
  family?: string
  warmup?: string
  hotset?: string
  query_version?: string
  worker_lock?: string
}

const GRAFANA_DASHBOARD_PATHS: Record<keyof ICacheGovernanceLinks, string> = {
  overview: '/d/cache-overview/qs-cache-overview',
  family: '/d/cache-family/qs-cache-family',
  warmup: '/d/cache-warmup/qs-cache-warmup',
  hotset: '/d/cache-hotset/qs-cache-hotset',
  query_version: '/d/cache-query-version/qs-cache-query-version',
  worker_lock: '/d/cache-worker-lock/qs-cache-worker-lock'
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const getGrafanaBaseURL = () => {
  const explicit = process.env.REACT_APP_GRAFANA_URL || config.grafanaURL || ''
  return explicit ? trimTrailingSlash(explicit) : ''
}

const resolveGrafanaLink = (explicitEnv: string | undefined, fallbackPath = '') => {
  if (explicitEnv && explicitEnv.trim()) {
    return explicitEnv.trim()
  }

  const base = getGrafanaBaseURL()
  if (!base) return undefined
  if (!fallbackPath) return base
  const normalized = fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`
  return `${base}${normalized}`
}

export const getCacheGovernanceStatus = (): Promise<[any, QSResponse<ICacheGovernanceStatusResponse> | undefined]> =>
  internalGet<ICacheGovernanceStatusResponse>('/cache/governance/status')

export const getCacheGovernanceHotset = (
  kind: CacheGovernanceHotsetKind,
  limit = 20
): Promise<[any, QSResponse<ICacheGovernanceHotsetResponseRaw> | undefined]> =>
  internalGet<ICacheGovernanceHotsetResponseRaw>('/cache/governance/hotset', { kind, limit })

export const postCacheGovernanceWarmupTargets = (
  data: ICacheGovernanceManualWarmupRequest
): Promise<[any, QSResponse<ICacheGovernanceManualWarmupResult> | undefined]> =>
  internalPost<ICacheGovernanceManualWarmupResult>('/cache/governance/warmup-targets', data)

export const getCacheGovernanceLinks = (): ICacheGovernanceLinks => ({
  overview: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_CACHE_OVERVIEW_URL, GRAFANA_DASHBOARD_PATHS.overview),
  family: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_CACHE_FAMILY_URL, GRAFANA_DASHBOARD_PATHS.family),
  warmup: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_CACHE_WARMUP_URL, GRAFANA_DASHBOARD_PATHS.warmup),
  hotset: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_CACHE_HOTSET_URL, GRAFANA_DASHBOARD_PATHS.hotset),
  query_version: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_CACHE_QUERY_VERSION_URL, GRAFANA_DASHBOARD_PATHS.query_version),
  worker_lock: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_CACHE_WORKER_LOCK_URL, GRAFANA_DASHBOARD_PATHS.worker_lock)
})
