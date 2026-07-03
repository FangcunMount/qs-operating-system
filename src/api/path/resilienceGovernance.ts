import { getSystemGovernanceResilience } from './systemGovernance'
import { buildGrafanaLinks } from '../grafanaLinks'
import { internalRawGet } from '../qsServer'
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

const GRAFANA_LINK_KEYS = ['overview', 'ratelimit', 'submitqueue', 'backpressure', 'locks'] as const

const GRAFANA_DASHBOARD_PATHS: Record<typeof GRAFANA_LINK_KEYS[number], string> = {
  overview: '/d/resilience-overview/qs-resilience-overview',
  ratelimit: '/d/resilience-ratelimit/qs-resilience-ratelimit',
  submitqueue: '/d/resilience-submitqueue/qs-resilience-submitqueue',
  backpressure: '/d/resilience-backpressure/qs-resilience-backpressure',
  locks: '/d/resilience-locks/qs-resilience-locks'
}

const unwrapSnapshot = (payload: IResilienceRuntimeSnapshot | QSResponse<IResilienceRuntimeSnapshot>): IResilienceRuntimeSnapshot => {
  if (typeof (payload as QSResponse<IResilienceRuntimeSnapshot>).code === 'number') {
    return (payload as QSResponse<IResilienceRuntimeSnapshot>).data
  }
  return payload as IResilienceRuntimeSnapshot
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

export const getResilienceStatuses = async (): Promise<IResilienceComponentStatus[]> => {
  const [error, response] = await getSystemGovernanceResilience()
  if (error || !response?.data?.components) {
    return [
      degradedComponent('apiserver', '/internal/v1/system-governance/resilience', error?.message || 'request failed')
    ]
  }
  return response.data.components
}

export const getResilienceGovernanceLinks = (): IResilienceGovernanceLinks => buildGrafanaLinks(
  GRAFANA_LINK_KEYS,
  GRAFANA_DASHBOARD_PATHS,
  {
    overview: process.env.REACT_APP_GRAFANA_RESILIENCE_OVERVIEW_URL,
    ratelimit: process.env.REACT_APP_GRAFANA_RESILIENCE_RATELIMIT_URL,
    submitqueue: process.env.REACT_APP_GRAFANA_RESILIENCE_SUBMITQUEUE_URL,
    backpressure: process.env.REACT_APP_GRAFANA_RESILIENCE_BACKPRESSURE_URL,
    locks: process.env.REACT_APP_GRAFANA_RESILIENCE_LOCKS_URL
  }
)
