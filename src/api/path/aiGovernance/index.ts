import { internalGet, internalPost, internalV2Get, internalV2Post } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'
import type {
  AIAttemptRecheck,
  AIEvaluationCapacity,
  AIEvaluationListQuery,
  AIEvaluationRun,
  AIEvaluationRunPage,
  AIEvaluationRunV2,
  AIEvaluationCandidateEvidenceV2,
  AIEvaluationOutputV2,
  AIParticipantCapacity,
  AIParticipantRetryRequest,
  AIParticipantRetryResult,
  AIProfile,
  AIProfileDefinition,
  AIProfileListQuery,
  AIProfilePage,
  AIReviewAttempt,
  AIHumanReviewBatchRequestV2,
  AIReviewDecision,
  AIReviewRole
} from './types'
import {
  normalizeAIEvaluationCandidateEvidenceV2,
  normalizeAIEvaluationRunV2
} from './normalization'

export * from './types'

const BASE_PATH = '/interpretation/ai-explanation'
const encode = (value: string) => encodeURIComponent(value)

const normalizeResponseData = async <T>(
  request: Promise<[any, QSResponse<T> | undefined]>,
  normalize: (data: T) => T
): Promise<[any, QSResponse<T> | undefined]> => {
  const [error, response] = await request
  return [error, response ? { ...response, data: normalize(response.data) } : undefined]
}

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
  internalV2Post<AIAttemptRecheck>(
    `${BASE_PATH}/legacy-prompt-evaluations/${encode(runID)}/attempts/${encode(caseID)}/${attempt}/rechecks`,
    {
      confirm: true,
      expected_provider_invocations: 2,
      reason
    }
  )

export const getAIEvaluationCapacity = (): Promise<[any, QSResponse<AIEvaluationCapacity> | undefined]> =>
  internalGet<AIEvaluationCapacity>(`${BASE_PATH}/prompt-evaluation-capacity`)

export const getAIParticipantCapacity = (): Promise<[any, QSResponse<AIParticipantCapacity> | undefined]> =>
  internalGet<AIParticipantCapacity>(`${BASE_PATH}/participant-capacity`)

export const startAIEvaluationV2 = (
  expectedProviderInvocations: number,
  reason: string
): Promise<[any, QSResponse<AIEvaluationRunV2> | undefined]> =>
  normalizeResponseData(
    internalV2Post<AIEvaluationRunV2>(`${BASE_PATH}/prompt-evaluations`, {
      confirm: true,
      expected_provider_invocations: expectedProviderInvocations,
      reason
    }),
    normalizeAIEvaluationRunV2
  )

export const getAIEvaluationRunV2 = (
  runID: string
): Promise<[any, QSResponse<AIEvaluationRunV2> | undefined]> =>
  normalizeResponseData(
    internalV2Get<AIEvaluationRunV2>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}`),
    normalizeAIEvaluationRunV2
  )

export const getAIEvaluationCandidateV2 = (
  runID: string,
  candidateID: string
): Promise<[any, QSResponse<AIEvaluationCandidateEvidenceV2> | undefined]> =>
  normalizeResponseData(
    internalV2Get<AIEvaluationCandidateEvidenceV2>(
      `${BASE_PATH}/prompt-evaluations/${encode(runID)}/candidates/${encode(candidateID)}`
    ),
    normalizeAIEvaluationCandidateEvidenceV2
  )

export const getAIEvaluationOutputV2 = (
  runID: string,
  executionID: string
): Promise<[any, QSResponse<AIEvaluationOutputV2> | undefined]> =>
  internalV2Get<AIEvaluationOutputV2>(
    `${BASE_PATH}/prompt-evaluations/${encode(runID)}/executions/${encode(executionID)}/output`
  )

export const recordAIHumanReviewV2 = (
  runID: string,
  input: { candidate_id: string; role: AIReviewRole; decision: AIReviewDecision; reason: string }
): Promise<[any, QSResponse<AIEvaluationRunV2> | undefined]> =>
  normalizeResponseData(
    internalV2Post<AIEvaluationRunV2>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/reviews`, input),
    normalizeAIEvaluationRunV2
  )

export const recordAIHumanReviewsV2 = (
  runID: string,
  input: AIHumanReviewBatchRequestV2
): Promise<[any, QSResponse<AIEvaluationRunV2> | undefined]> =>
  normalizeResponseData(
    internalV2Post<AIEvaluationRunV2>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/reviews/batch`, input),
    normalizeAIEvaluationRunV2
  )

export const finalizeAIEvaluationV2 = (
  runID: string,
  reason: string
): Promise<[any, QSResponse<AIEvaluationRunV2> | undefined]> =>
  normalizeResponseData(
    internalV2Post<AIEvaluationRunV2>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/finalize`, { reason }),
    normalizeAIEvaluationRunV2
  )

export const resolveAIEvaluationResultUnknownV2 = (
  runID: string,
  input: {
    execution_id: string
    decision: 'authorize_replacement' | 'cancel_run'
    acknowledged_duplicate_call_and_cost_risk: boolean
    reason: string
  }
): Promise<[any, QSResponse<AIEvaluationRunV2> | undefined]> =>
  normalizeResponseData(
    internalV2Post<AIEvaluationRunV2>(`${BASE_PATH}/prompt-evaluations/${encode(runID)}/result-unknown/resolve`, {
      ...input,
      confirm: true
    }),
    normalizeAIEvaluationRunV2
  )

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
