import { internalGet, internalPost } from '../../qsServer'
import type { QSResponse } from '@/types/qs'
import {
  normalizeSystemGovernanceCache,
  normalizeSystemGovernanceEvents,
  normalizeSystemGovernanceOverview,
  normalizeSystemGovernanceResilience
} from './normalizers'
import type {
  ActionRunRequest,
  ActionRunResponse,
  GovernanceActionsResponse,
  GovernanceCacheResponse,
  GovernanceEventsResponse,
  GovernanceOverviewResponse,
  GovernanceResilienceResponse,
  GovernanceWindow,
  RawSystemGovernanceCacheResponse,
  RawSystemGovernanceEventsResponse,
  RawSystemGovernanceOverviewResponse,
  RawSystemGovernanceResilienceResponse,
  RetryCandidatePage,
  RetryCandidateQuery
} from './types'

export * from './types'
export {
  normalizeSignalEvidence,
  normalizeSignals,
  normalizeSystemGovernanceCache,
  normalizeSystemGovernanceEvents,
  normalizeSystemGovernanceOverview,
  normalizeSystemGovernanceResilience,
  sortSignalsBySeverity
} from './normalizers'

const withWindow = (window: GovernanceWindow = '5m') => ({ window })

const normalizeResponse = <Raw, Normalized>(
  promise: Promise<[any, QSResponse<Raw> | undefined]>,
  normalize: (raw: Raw) => Normalized
): Promise<[any, QSResponse<Normalized> | undefined]> =>
    promise.then(([error, response]) => {
      if (error || !response) {
        return [error, undefined]
      }
      return [null, {
        ...response,
        data: normalize(response.data)
      }]
    })

export const getSystemGovernanceOverview = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceOverviewResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawSystemGovernanceOverviewResponse>('/system-governance/overview', withWindow(window)),
    normalizeSystemGovernanceOverview
  )

export const getSystemGovernanceEvents = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceEventsResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawSystemGovernanceEventsResponse>('/system-governance/events', withWindow(window)),
    normalizeSystemGovernanceEvents
  )

export const getSystemGovernanceCache = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceCacheResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawSystemGovernanceCacheResponse>('/system-governance/cache', withWindow(window)),
    normalizeSystemGovernanceCache
  )

export const getSystemGovernanceResilience = (
  window: GovernanceWindow = '5m'
): Promise<[any, QSResponse<GovernanceResilienceResponse> | undefined]> =>
  normalizeResponse(
    internalGet<RawSystemGovernanceResilienceResponse>('/system-governance/resilience', withWindow(window)),
    normalizeSystemGovernanceResilience
  )

export const getSystemGovernanceRetryCandidates = (
  query: RetryCandidateQuery = {}
): Promise<[any, QSResponse<RetryCandidatePage> | undefined]> => {
  const params: RetryCandidateQuery = { limit: query.limit || 50 }
  if (query.cursor) params.cursor = query.cursor
  return internalGet<RetryCandidatePage>('/system-governance/events/retry-candidates', params)
}

export const getSystemGovernanceActions = (): Promise<[any, QSResponse<GovernanceActionsResponse> | undefined]> =>
  internalGet<GovernanceActionsResponse>('/system-governance/actions')

export const postSystemGovernanceActionRun = (
  actionId: string,
  data: ActionRunRequest = {}
): Promise<[any, QSResponse<ActionRunResponse> | undefined]> =>
  internalPost<ActionRunResponse>(`/system-governance/actions/${encodeURIComponent(actionId)}/runs`, data)
