import { get, getHttpStatus, internalGet, post, v2Get, v2SilentGet } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface IListAssessmentRequest {
  page?: number
  page_size?: number
  status?: 'pending' | 'submitted' | 'evaluated' | 'failed' | string
  testee_id?: string | number
}

export interface ModelIdentity {
  kind: string
  sub_kind?: string
  algorithm?: string
  code: string
  version?: string
  title?: string
  product_channel?: string
  algorithm_family?: string
}

export interface ScoreValue {
  kind: string
  value: number
  label?: string
  max?: number
}

export interface ResultLevel {
  code: string
  label: string
  severity?: string
}

/** V2 Evaluation fact. evaluated only means outcome persistence succeeded. */
export interface IAssessment {
  id: string
  answer_sheet_id: string
  testee_id: string
  questionnaire_code: string
  questionnaire_version: string
  model: ModelIdentity
  primary_score?: ScoreValue
  level?: ResultLevel
  status: 'pending' | 'submitted' | 'evaluated' | 'failed' | string
  status_label?: string
  submitted_at?: string
  failed_at?: string
  failure_reason?: string
  org_id?: string
  origin_id?: string
  origin_type?: string
  origin_type_label?: string
}

export interface IAssessmentListResponse {
  items: IAssessment[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface IFactorScoreItem {
  factor_code: string
  factor_name: string
  raw_score: number
  max_score?: number
  risk_level?: string
  risk_level_label?: string
  conclusion?: string
  suggestion?: string
  is_total_score?: boolean
}

export interface IScoreResponse {
  assessment_id: string
  factor_scores: IFactorScoreItem[]
  total_score?: number
  risk_level?: string
  risk_level_label?: string
}

export interface IDimensionItem {
  factor_code: string
  factor_name: string
  raw_score: number
  max_score?: number
  risk_level?: string
  risk_level_label?: string
  description?: string
  suggestion?: string
  role?: string
  hierarchy_level?: number
  parent_code?: string
  t_score?: number
}

export interface ISuggestionItem {
  category?: string
  content: string
  factor_code?: string
}

export interface IReportResponse {
  assessment_id: string
  model?: ModelIdentity
  primary_score?: ScoreValue
  level?: ResultLevel
  conclusion?: string
  created_at?: string
  dimensions: IDimensionItem[]
  suggestions: ISuggestionItem[]
  model_extra?: Record<string, unknown>
}

export interface IReportListResponse {
  items: IReportResponse[]
  page: number
  page_size: number
  total: number
}

export interface IListReportRequest {
  testee_id: string | number
  page?: number
  page_size?: number
}

export interface IHighRiskFactorsResponse {
  assessment_id: string
  has_high_risk: boolean
  high_risk_factors: IFactorScoreItem[]
  needs_urgent_care: boolean
}

export interface IEvaluationRun {
  run_id: string
  assessment_id?: string
  attempt_no: number
  status: string
  retryable: boolean
  error_code?: string
  error_message?: string
  trace_id?: string
  started_at?: string
  finished_at?: string
}

export interface IEvaluationRunListResponse {
  items: IEvaluationRun[]
}

export interface InterpretationFailure {
  Kind?: string
  Code?: string
  SafeMessage?: string
  Retryable?: boolean
}

export interface InterpretationRun {
  ID: string | number
  Attempt?: number
  Status?: string
  TraceID?: string
  StartedAt?: string
  FinishedAt?: string
  Failure?: InterpretationFailure
}

export interface InterpretationReport {
  ID: string | number
  AssessmentID?: string | number
  GenerationID?: string | number
  OutcomeID?: string | number
  GeneratedAt?: string
  ReportType?: string
  TemplateVersion?: string
}

export interface InterpretationGeneration {
  ID: string | number
  OutcomeID?: string | number
  Status: string
  Version?: number
  ReportType?: string
  TemplateVersion?: string
  LatestRun?: InterpretationRun
  Report?: InterpretationReport
  CreatedAt?: string
  UpdatedAt?: string
}

export type OutcomeReportState =
  | { state: 'ready'; report: IReportResponse }
  | { state: 'pending' }
  | { state: 'unavailable'; status?: number }

type HttpStatusCarrier = { status?: number; response?: { status?: number } }

export const assessmentApi = {
  list: (params: IListAssessmentRequest): Promise<[any, QSResponse<IAssessmentListResponse> | undefined]> =>
    v2Get<IAssessmentListResponse>('/evaluations/assessments', params),

  get: (id: number | string): Promise<[any, QSResponse<IAssessment> | undefined]> =>
    v2Get<IAssessment>(`/evaluations/assessments/${id}`),

  getReport: (id: number | string): Promise<[any, QSResponse<IReportResponse> | undefined]> =>
    v2Get<IReportResponse>(`/evaluations/assessments/${id}/report`),

  /** A missing report is a normal Interpretation-pending state, not an error. */
  getReportState: async (id: number | string): Promise<[any, OutcomeReportState]> => {
    const [err, response] = await v2SilentGet<IReportResponse>(`/evaluations/assessments/${id}/report`)
    if (response?.data) return [null, { state: 'ready', report: response.data }]
    const statusCarrier = err as HttpStatusCarrier | undefined
    const status = getHttpStatus(err) ?? statusCarrier?.status ?? statusCarrier?.response?.status
    if (status === 404) return [null, { state: 'pending' }]
    return [err, { state: 'unavailable', status }]
  },

  getReports: (params: IListReportRequest): Promise<[any, QSResponse<IReportListResponse> | undefined]> =>
    v2Get<IReportListResponse>('/evaluations/reports', params),

  getScores: (id: number | string): Promise<[any, QSResponse<IScoreResponse> | undefined]> =>
    get<IScoreResponse>(`/evaluations/assessments/${id}/scores`),

  getHighRiskFactors: (id: number | string): Promise<[any, QSResponse<IHighRiskFactorsResponse> | undefined]> =>
    get<IHighRiskFactorsResponse>(`/evaluations/assessments/${id}/high-risk-factors`),

  getRuns: (id: number | string, limit = 20): Promise<[any, QSResponse<IEvaluationRunListResponse> | undefined]> =>
    get<IEvaluationRunListResponse>(`/evaluations/assessments/${id}/runs`, { limit }),

  getLatestRun: (id: number | string): Promise<[any, QSResponse<IEvaluationRun> | undefined]> =>
    get<IEvaluationRun>(`/evaluations/assessments/${id}/runs/latest`),

  retry: (id: number | string): Promise<[any, QSResponse<IAssessment> | undefined]> =>
    post<IAssessment>(`/evaluations/assessments/${id}/retry`, undefined),

  getInterpretationLifecycle: (id: number | string): Promise<[any, QSResponse<InterpretationGeneration[]> | undefined]> =>
    internalGet<InterpretationGeneration[]>(`/interpretation/assessments/${id}/lifecycle`)
}
