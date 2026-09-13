import { internalV2Get, internalV2PostOnce } from '@/api/qsServer'
import type { QSResponse } from '@/types/qs'
import type {
  EvaluationPlanQuery,
  EvaluationPlan,
  NativeEvaluationCreate,
  NativeEvaluationStart,
  NativeEvaluationState,
  NativeCandidateIndex,
  NativeCandidateEvidence,
  NativeReviewCommand,
  NativeGatePreview,
  NativeFinalizeCommand,
  NativeReopenCommand,
  NativeUnknownIndex,
  NativeResolutionCommand,
  NativeCancelCommand,
  NativeEvaluationPage,
  EvaluationStatus,
  NativeExecutionPage,
  NativeExecutionOutput,
  NativeEvaluationCapacity
} from './evaluationTypes'

type Result<T> = Promise<[unknown, QSResponse<T> | undefined]>
const BASE = '/interpretation/ai-workflow/evaluations'
export const listNativeEvaluations = (status: EvaluationStatus | '' = '', cursor = ''): Result<NativeEvaluationPage> =>
  internalV2Get<NativeEvaluationPage>(BASE, { status, cursor, limit: 20 })
const path = (id: string) => `${BASE}/${encodeURIComponent(id)}`
export const listNativeExecutions = (id: string, version: number, cursor = ''): Result<NativeExecutionPage> =>
  internalV2Get<NativeExecutionPage>(`${path(id)}/executions`, { expected_version: version, cursor, limit: 20 })
export const getNativeExecutionOutput = (id: string, version: number, execution: string): Result<NativeExecutionOutput> =>
  internalV2Get<NativeExecutionOutput>(`${path(id)}/executions/${encodeURIComponent(execution)}/output`, { expected_version: version })
export const prepareNativeEvaluation = (query: EvaluationPlanQuery): Result<EvaluationPlan> =>
  internalV2PostOnce<EvaluationPlan>(`${BASE}/prepare`, query)
export const createNativeEvaluation = (
  id: string,
  command: NativeEvaluationCreate
): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/create`, command)
export const startNativeEvaluation = (
  id: string,
  command: NativeEvaluationStart
): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/start`, command)
export const getNativeEvaluation = (id: string): Result<NativeEvaluationState> =>
  internalV2Get<NativeEvaluationState>(path(id))
export const listNativeCandidates = (id: string): Result<NativeCandidateIndex> =>
  internalV2Get<NativeCandidateIndex>(`${path(id)}/candidates`)
export const getNativeCandidate = (
  id: string,
  candidate: string,
  version: number
): Result<NativeCandidateEvidence> =>
  internalV2Get<NativeCandidateEvidence>(
    `${path(id)}/candidates/${encodeURIComponent(candidate)}`,
    { expected_version: version }
  )

export const reviewNativeEvaluation = (
  id: string,
  command: NativeReviewCommand
): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/reviews`, command)

export const previewNativeGates = (id: string, version: number): Result<NativeGatePreview> =>
  internalV2Get<NativeGatePreview>(`${path(id)}/gates`, { expected_version: version })
export const finalizeNativeEvaluation = (
  id: string,
  command: NativeFinalizeCommand
): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/finalize`, command)

export const reopenNativeReview = (
  id: string,
  command: NativeReopenCommand
): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/reopen-review`, command)

export const listNativeUnknowns = (id: string, version: number): Result<NativeUnknownIndex> =>
  internalV2Get<NativeUnknownIndex>(`${path(id)}/result-unknown`, { expected_version: version })
export const resolveNativeUnknown = (id: string, command: NativeResolutionCommand): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/result-unknown/resolve`, command)

export const cancelNativeEvaluation = (id: string, command: NativeCancelCommand): Result<NativeEvaluationState> =>
  internalV2PostOnce<NativeEvaluationState>(`${path(id)}/cancel`, command)

export const getNativeEvaluationCapacity = (): Result<NativeEvaluationCapacity> =>
  internalV2Get<NativeEvaluationCapacity>('/interpretation/ai-workflow/evaluation-capacity')
