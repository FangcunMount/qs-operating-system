import { buildGrafanaLinks } from '../grafanaLinks'
import { internalRawGet } from '../qsServer'
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

// IEventRuntimeEvent describes the effective, process-independent event contract.
// It is emitted by qs-server from the merged EventSpec and wire catalog.
export interface IEventRuntimeEvent {
  type: string
  owner: string
  delivery: string
  profile?: string
  immediate: boolean
  priority?: string
  handler: string
  idempotency: string
  settlement: string
}

// IEventRuntimeProfile describes the lifecycle state of one durable outbox profile.
export interface IEventRuntimeProfile {
  name: string
  event_count: number
  immediate_event_types?: string[]
  running: boolean
  relay_enabled: boolean
  reconciler_enabled: boolean
  immediate_enabled: boolean
}

// IEventRuntimeConsumer describes an additional, independently settled consumer.
export interface IEventRuntimeConsumer {
  id: string
  event_type: string
  runtime: string
  topic: string
  channel: string
  enabled: boolean
  healthy: boolean
  last_error?: string
  settlement: string
}

export interface IEventStatusResponse {
  generated_at?: string
  catalog: IEventCatalogSummary
  outboxes: IEventOutboxSummary[]
  events?: IEventRuntimeEvent[]
  profiles?: IEventRuntimeProfile[]
  consumers?: IEventRuntimeConsumer[]
}

export interface IEventGovernanceLinks {
  overview?: string
  outbox?: string
  worker?: string
}

const GRAFANA_LINK_KEYS = ['overview', 'outbox', 'worker'] as const

const GRAFANA_DASHBOARD_PATHS: Record<typeof GRAFANA_LINK_KEYS[number], string> = {
  overview: '/d/event-overview/qs-event-overview',
  outbox: '/d/event-outbox/qs-event-outbox',
  worker: '/d/event-worker/qs-event-worker'
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

export const getEventGovernanceLinks = (): IEventGovernanceLinks => buildGrafanaLinks(
  GRAFANA_LINK_KEYS,
  GRAFANA_DASHBOARD_PATHS,
  {
    overview: process.env.REACT_APP_GRAFANA_EVENT_OVERVIEW_URL,
    outbox: process.env.REACT_APP_GRAFANA_EVENT_OUTBOX_URL,
    worker: process.env.REACT_APP_GRAFANA_EVENT_WORKER_URL
  }
)
