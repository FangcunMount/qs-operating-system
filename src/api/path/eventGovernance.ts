import { internalRawGet } from '../qsServer'
import { config } from '@/config/config'
import type { QSResponse } from '@/types/qs'

export interface IEventCatalogSummary {
  topic_count: number
  event_count: number
  best_effort_count: number
  durable_outbox_count: number
}

export interface IEventOutboxBucket {
  status: 'pending' | 'failed' | 'publishing' | string
  count: number
  oldest_created_at?: string
  oldest_age_seconds: number
}

export interface IEventOutboxSummary {
  name: string
  store: string
  degraded: boolean
  error?: string
  generated_at?: string
  buckets?: IEventOutboxBucket[]
}

export interface IEventStatusResponse {
  generated_at?: string
  catalog: IEventCatalogSummary
  outboxes: IEventOutboxSummary[]
}

export interface IEventGovernanceLinks {
  overview?: string
  outbox?: string
  worker?: string
}

const GRAFANA_DASHBOARD_PATHS: Record<keyof IEventGovernanceLinks, string> = {
  overview: '/d/event-overview/qs-event-overview',
  outbox: '/d/event-outbox/qs-event-outbox',
  worker: '/d/event-worker/qs-event-worker'
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

export const getEventStatus = (): Promise<[any, QSResponse<IEventStatusResponse> | undefined]> =>
  internalRawGet<IEventStatusResponse | QSResponse<IEventStatusResponse>>('/events/status')
    .then(([error, response]) => {
      if (error || !response) {
        return [error, undefined]
      }
      if (typeof (response as QSResponse<IEventStatusResponse>).code === 'number') {
        return [null, response as QSResponse<IEventStatusResponse>]
      }
      return [null, {
        code: 0,
        data: response as IEventStatusResponse,
        message: 'OK'
      }]
    })

export const getEventGovernanceLinks = (): IEventGovernanceLinks => ({
  overview: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_EVENT_OVERVIEW_URL, GRAFANA_DASHBOARD_PATHS.overview),
  outbox: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_EVENT_OUTBOX_URL, GRAFANA_DASHBOARD_PATHS.outbox),
  worker: resolveGrafanaLink(process.env.REACT_APP_GRAFANA_EVENT_WORKER_URL, GRAFANA_DASHBOARD_PATHS.worker)
})
