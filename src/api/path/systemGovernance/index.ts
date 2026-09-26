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
  DeliveryReplayReviewPage,
  DeliveryReplayReviewQuery,
  DeliveryResolutionRequest,
  GovernanceActionsResponse,
  GovernanceCacheResponse,
  GovernanceEventsResponse,
  GovernanceOverviewResponse,
  GovernanceResilienceResponse,
  GovernanceWindow,
  PendingReplayAuditPage,
  PendingReplayAuditQuery,
  RawSystemGovernanceCacheResponse,
  RawSystemGovernanceEventsResponse,
  RawSystemGovernanceOverviewResponse,
  RawSystemGovernanceResilienceResponse,
  ReminderReviewPage,
  ReminderReviewQuery,
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

export const getSystemGovernancePendingReplayAudits = (
  query: PendingReplayAuditQuery = {}
): Promise<[any, QSResponse<PendingReplayAuditPage> | undefined]> => {
  const params: PendingReplayAuditQuery = { limit: query.limit || 50 }
  if (query.cursor) params.cursor = query.cursor
  return internalGet<PendingReplayAuditPage>('/system-governance/actions/pending-reconciliations', params)
}

export const getSystemGovernanceDeliveryReplayReviews = (
  query: DeliveryReplayReviewQuery = {}
): Promise<[any, QSResponse<DeliveryReplayReviewPage> | undefined]> => {
  const params: DeliveryReplayReviewQuery = { limit: query.limit || 50 }
  if (query.cursor) params.cursor = query.cursor
  return internalGet<DeliveryReplayReviewPage>('/system-governance/actions/delivery-replay-reviews', params)
}

export const getSystemGovernanceReminderReviews = (
  query: ReminderReviewQuery = {}
): Promise<[any, QSResponse<ReminderReviewPage> | undefined]> => {
  const params: ReminderReviewQuery = { limit: query.limit || 50 }
  if (query.cursor) params.cursor = query.cursor
  return internalGet<ReminderReviewPage>('/system-governance/actions/reminder-reviews', params)
}

export const postSystemGovernanceDeliveryResolution = (
  data: DeliveryResolutionRequest
): Promise<[any, QSResponse<ActionRunResponse> | undefined]> =>
  internalPost<ActionRunResponse>('/system-governance/actions/delivery-resolutions', data)

export const getSystemGovernanceDeliveryResolution = (
  requestID: string
): Promise<[any, QSResponse<ActionRunResponse> | undefined]> =>
  internalGet<ActionRunResponse>(`/system-governance/actions/delivery-resolutions/${encodeURIComponent(requestID)}`)

export const postSystemGovernanceActionRun = (
  actionId: string,
  data: ActionRunRequest = {}
): Promise<[any, QSResponse<ActionRunResponse> | undefined]> =>
  internalPost<ActionRunResponse>(`/system-governance/actions/${encodeURIComponent(actionId)}/runs`, data)
