import { internalGet, internalPost } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'
import type {
  AIAttemptRecheck,
  AIEvaluationCapacity,
  AIEvaluationListQuery,
  AIEvaluationRun,
  AIEvaluationRunPage,
  AIParticipantCapacity,
  AIParticipantRetryRequest,
  AIParticipantRetryResult,
  AIProfile,
  AIProfileDefinition,
  AIProfileListQuery,
  AIProfilePage,
  AIReviewAttempt,
  AIReviewDecision,
  AIReviewRole
} from './types'

export * from './types'

const BASE_PATH = '/interpretation/ai-explanation'
const encode = (value: string) => encodeURIComponent(value)

const cleanQuery = <T extends Record<string, unknown>>(query: T): Partial<T> =>
  Object.keys(query).reduce<Partial<T>>((result, key) => {
    const value = query[key]
    if (value !== undefined && value !== null && value !== '') {
      result[key as keyof T] = value as T[keyof T]
    }
    return result
  }, {})

export const listAIEvaluationRuns = (
  query: AIEvaluationListQuery = {}
): Promise<[any, QSResponse<AIEvaluationRunPage> | undefined]> =>
  internalGet<AIEvaluationRunPage>(`${BASE_PATH}/prompt-evaluations`, cleanQuery({ limit: 20, ...query }))

export const getAIEvaluationRun = (
  runID: string
): Promise<[any, QSResponse<AIEvaluationRun> | undefined]> =>
  internalGet<AIEvaluationRun>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}`)

export const getAIEvaluationAttempt = (
  runID: string,
  caseID: string,
  attempt: number
): Promise<[any, QSResponse<AIReviewAttempt> | undefined]> =>
  internalGet<AIReviewAttempt>(
    `${BASE_PATH}/prompt-evaluations/${encode(runID)}/attempts/${encode(caseID)}/${attempt}`
  )

const attemptRecheckPath = (runID: string, caseID: string, attempt: number): string =>
  `${BASE_PATH}/prompt-evaluations/${encode(runID)}/attempts/${encode(caseID)}/${attempt}/rechecks`

export const listAIEvaluationAttemptRechecks = (
  runID: string,
  caseID: string,
  attempt: number,
  limit = 20
): Promise<[any, QSResponse<AIAttemptRecheck[]> | undefined]> =>
  internalGet<AIAttemptRecheck[]>(attemptRecheckPath(runID, caseID, attempt), { limit })

export const getAIEvaluationAttemptRecheck = (
  runID: string,
  caseID: string,
  attempt: number,
  recheckID: string
): Promise<[any, QSResponse<AIAttemptRecheck> | undefined]> =>
  internalGet<AIAttemptRecheck>(`${attemptRecheckPath(runID, caseID, attempt)}/${encode(recheckID)}`)

export const startAIEvaluationAttemptRecheck = (
  runID: string,
  caseID: string,
  attempt: number,
  reason: string
): Promise<[any, QSResponse<AIAttemptRecheck> | undefined]> =>
  internalPost<AIAttemptRecheck>(attemptRecheckPath(runID, caseID, attempt), {
    confirm: true,
    expected_provider_invocations: 2,
    reason
  })

export const getAIEvaluationCapacity = (): Promise<[any, QSResponse<AIEvaluationCapacity> | undefined]> =>
  internalGet<AIEvaluationCapacity>(`${BASE_PATH}/prompt-evaluation-capacity`)

export const getAIParticipantCapacity = (): Promise<[any, QSResponse<AIParticipantCapacity> | undefined]> =>
  internalGet<AIParticipantCapacity>(`${BASE_PATH}/participant-capacity`)

export const startAIEvaluation = (
  expectedProviderInvocations: number,
  reason: string
): Promise<[any, QSResponse<AIEvaluationRun> | undefined]> =>
  internalPost<AIEvaluationRun>(`${BASE_PATH}/prompt-evaluations`, {
    confirm: true,
    expected_provider_invocations: expectedProviderInvocations,
    reason
  })

export const recoverAIEvaluation = (
  runID: string,
  expectedProviderInvocations: number,
  reason: string
): Promise<[any, QSResponse<AIEvaluationRun> | undefined]> =>
  internalPost<AIEvaluationRun>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/recover`, {
    confirm: true,
    expected_provider_invocations: expectedProviderInvocations,
    reason
  })

export const cancelAIEvaluation = (
  runID: string,
  reason: string
): Promise<[any, QSResponse<AIEvaluationRun> | undefined]> =>
  internalPost<AIEvaluationRun>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/cancel`, { reason })

export const recordAIHumanReview = (
  runID: string,
  input: { case_id: string; attempt: number; role: AIReviewRole; decision: AIReviewDecision; reason: string }
): Promise<[any, QSResponse<AIEvaluationRun> | undefined]> =>
  internalPost<AIEvaluationRun>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/reviews`, input)

export const finalizeAIEvaluation = (
  runID: string,
  reason: string
): Promise<[any, QSResponse<AIEvaluationRun> | undefined]> =>
  internalPost<AIEvaluationRun>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/finalize`, { reason })

export const listAIProfiles = (
  query: AIProfileListQuery = {}
): Promise<[any, QSResponse<AIProfilePage> | undefined]> =>
  internalGet<AIProfilePage>(`${BASE_PATH}/profiles`, cleanQuery({ limit: 20, ...query }))

export const getAIProfile = (
  profileID: string,
  version: string
): Promise<[any, QSResponse<AIProfile> | undefined]> =>
  internalGet<AIProfile>(`${BASE_PATH}/profiles/${encode(profileID)}/versions/${encode(version)}`)

export const createAIProfileDraft = (
  definition: AIProfileDefinition,
  fingerprint: string,
  reason: string
): Promise<[any, QSResponse<AIProfile> | undefined]> =>
  internalPost<AIProfile>(`${BASE_PATH}/profiles`, { definition, fingerprint, reason })

export const publishAIProfile = (
  profileID: string,
  version: string,
  evaluationRunID: string,
  reason: string
): Promise<[any, QSResponse<AIProfile> | undefined]> =>
  internalPost<AIProfile>(`${BASE_PATH}/profiles/${encode(profileID)}/versions/${encode(version)}/publish`, {
    evaluation_run_id: evaluationRunID,
    reason
  })

export const disableAIProfile = (
  profileID: string,
  version: string,
  reason: string
): Promise<[any, QSResponse<AIProfile> | undefined]> =>
  internalPost<AIProfile>(`${BASE_PATH}/profiles/${encode(profileID)}/versions/${encode(version)}/disable`, {
    reason
  })

export const retryAIParticipantGeneration = (
  generationID: string,
  request: AIParticipantRetryRequest
): Promise<[any, QSResponse<AIParticipantRetryResult> | undefined]> =>
  internalPost<AIParticipantRetryResult>(`${BASE_PATH}/generations/${encode(generationID)}/retry`, request)
