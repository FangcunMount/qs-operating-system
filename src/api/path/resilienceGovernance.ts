import { qsInternalRawAxios, internalRawGet } from '../qsServer'
import { config } from '@/config/config'
import type { QSResponse } from '@/types/qs'

export interface IResilienceRuntimeSummary {
  ready: boolean
  capability_count: number
  degraded_count: number
}

export interface IResilienceCapabilitySnapshot {
  name: string
  kind: string
  strategy: string
  configured: boolean
  degraded: boolean
  reason?: string
}

export interface IResilienceQueueSnapshot {
  generated_at?: string
  component: string
  name: string
  strategy: string
  depth: number
  capacity: number
  status_ttl_seconds: number
  status_counts: Record<string, number>
  lifecycle_boundary: string
}

export interface IResilienceBackpressureSnapshot {
  component: string
  name: string
  dependency: string
  strategy: string
  enabled: boolean
  max_inflight: number
  in_flight: number
  timeout_millis: number
  degraded: boolean
  reason?: string
}

export interface IResilienceRuntimeSnapshot {
  generated_at?: string
  component: string
  summary: IResilienceRuntimeSummary
  rate_limits?: IResilienceCapabilitySnapshot[]
  queues?: IResilienceQueueSnapshot[]
  backpressure?: IResilienceBackpressureSnapshot[]
  locks?: IResilienceCapabilitySnapshot[]
  idempotency?: IResilienceCapabilitySnapshot[]
  duplicate_suppression?: IResilienceCapabilitySnapshot[]
}

export interface IResilienceComponentStatus {
  component: 'apiserver' | 'collection-server' | 'worker' | string
  source: string
  configured: boolean
  degraded: boolean
  error?: string
  snapshot?: IResilienceRuntimeSnapshot
}

export interface IResilienceGovernanceLinks {
  overview?: string
  ratelimit?: string
  submitqueue?: string
  backpressure?: string
  locks?: string
}

const GRAFANA_DASHBOARD_PATHS: Record<keyof IResilienceGovernanceLinks, string> = {
  overview: '/d/resilience-overview/qs-resilience-overview',
  ratelimit: '/d/resilience-ratelimit/qs-resilience-ratelimit',
  submitqueue: '/d/resilience-submitqueue/qs-resilience-submitqueue',
  backpressure: '/d/resilience-backpressure/qs-resilience-backpressure',
  locks: '/d/resilience-locks/qs-resilience-locks'
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

const unwrapSnapshot = (payload: IResilienceRuntimeSnapshot | QSResponse<IResilienceRuntimeSnapshot>): IResilienceRuntimeSnapshot => {
  if (typeof (payload as QSResponse<IResilienceRuntimeSnapshot>).code === 'number') {
    return (payload as QSResponse<IResilienceRuntimeSnapshot>).data
  }
  return payload as IResilienceRuntimeSnapshot
}

const normalizeGovernanceURL = (baseURL: string | undefined) => {
  const value = (baseURL || '').trim()
  if (!value) return ''
  const base = trimTrailingSlash(value)
  if (base.endsWith('/governance/resilience')) return base
  if (base.endsWith('/governance')) return `${base}/resilience`
  return `${base}/governance/resilience`
}

const degradedComponent = (component: IResilienceComponentStatus['component'], source: string, error?: string): IResilienceComponentStatus => ({
  component,
  source,
  configured: Boolean(source),
  degraded: true,
  error: error || (source ? 'status unavailable' : 'governance url not configured')
})

const snapshotComponent = (
  component: IResilienceComponentStatus['component'],
  source: string,
  snapshot: IResilienceRuntimeSnapshot
): IResilienceComponentStatus => ({
  component,
  source,
  configured: true,
  degraded: !snapshot?.summary?.ready,
  snapshot
})

export const getApiserverResilienceStatus = (): Promise<IResilienceComponentStatus> =>
  internalRawGet<IResilienceRuntimeSnapshot | QSResponse<IResilienceRuntimeSnapshot>>('/resilience/status')
    .then(([error, response]) => {
      if (error || !response) {
        return degradedComponent('apiserver', '/internal/v1/resilience/status', error?.message || 'request failed')
      }
      const snapshot = unwrapSnapshot(response)
      return snapshotComponent('apiserver', '/internal/v1/resilience/status', snapshot)
    })

export const getExternalResilienceStatus = (
  component: 'collection-server' | 'worker',
  baseURL: string | undefined
): Promise<IResilienceComponentStatus> => {
  const url = normalizeGovernanceURL(baseURL)
  if (!url) {
    return Promise.resolve(degradedComponent(component, '', 'governance url not configured'))
  }
  return qsInternalRawAxios
    .get<IResilienceRuntimeSnapshot | QSResponse<IResilienceRuntimeSnapshot>>(url)
    .then((result) => snapshotComponent(component, url, unwrapSnapshot(result.data)))
    .catch((error) => degradedComponent(component, url, error?.message || 'request failed'))
}

export const getResilienceStatuses = (): Promise<IResilienceComponentStatus[]> =>
  Promise.all([
    getApiserverResilienceStatus(),
    getExternalResilienceStatus('collection-server', process.env.REACT_APP_QS_COLLECTION_GOVERNANCE_URL),
    getExternalResilienceStatus('worker', process.env.REACT_APP_QS_WORKER_GOVERNANCE_URL)
  ])

export const getResilienceGovernanceLinks = (): IResilienceGovernanceLinks => ({
  overview: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_RESILIENCE_OVERVIEW_URL, GRAFANA_DASHBOARD_PATHS.overview),
  ratelimit: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_RESILIENCE_RATELIMIT_URL, GRAFANA_DASHBOARD_PATHS.ratelimit),
  submitqueue: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_RESILIENCE_SUBMITQUEUE_URL, GRAFANA_DASHBOARD_PATHS.submitqueue),
  backpressure: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_RESILIENCE_BACKPRESSURE_URL, GRAFANA_DASHBOARD_PATHS.backpressure),
  locks: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_RESILIENCE_LOCKS_URL, GRAFANA_DASHBOARD_PATHS.locks)
})
