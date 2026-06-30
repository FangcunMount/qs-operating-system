import { del, get, post, put } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import {
  AssessmentModelDefinition,
  AssessmentModelDetail,
  AssessmentModelKind,
  AssessmentModelOptions,
  AssessmentModelPreviewReportRequest,
  AssessmentModelPreviewReportResponse,
  AssessmentModelSubKind,
  AssessmentModelSummary,
  AssessmentModelValidationResult,
  AssessmentQRCodeResponse
} from '@/models/assessmentModel'
import {
  normalizeAssessmentModelDetail,
  normalizeAssessmentModelDefinition,
  normalizeAssessmentModelOptions,
  normalizeListResponse,
  normalizePreviewReportResponse,
  normalizeQRCodeResponse,
  normalizeValidationResult
} from '@/models/assessmentModel.mapper'

export interface AssessmentModelListParams {
  kind?: AssessmentModelKind
  status?: string
  keyword?: string
  algorithm?: string
  sub_kind?: AssessmentModelSubKind
  category?: string
  page?: number
  page_size?: number
}

export interface AssessmentModelListResponse {
  models: AssessmentModelSummary[]
  page: number
  page_size: number
  total_count: number
}

export interface CreateAssessmentModelRequest {
  code?: string
  title: string
  description?: string
  kind: AssessmentModelKind
  sub_kind: AssessmentModelSubKind
  algorithm: string
  questionnaire_code?: string
  questionnaire_version?: string
  category?: string
  tags?: string[]
}

export interface UpdateAssessmentModelBasicInfoRequest {
  title?: string
  description?: string
  sub_kind?: string
  algorithm?: string
  category?: string
  tags?: string[]
}

export interface UpdateAssessmentModelQuestionnaireRequest {
  questionnaire_code: string
  questionnaire_version: string
}

export interface AssessmentModelQuestionnaireResponse {
  model_code?: string
  questionnaire_code: string
  questionnaire_version: string
  title?: string
  question_count?: number
}

export interface ApplyAssessmentModelCodesRequest {
  target: 'dimension' | 'outcome'
  count?: number
}

export interface ApplyAssessmentModelCodesResponse {
  codes: string[]
  count: number
}

export type { AssessmentQRCodeResponse }

const mapResponse = <T, U>(
  response: QSResponse<T> | undefined,
  mapper: (data: T) => U
): QSResponse<U> | undefined => {
  if (!response) return undefined
  return {
    ...response,
    data: mapper(response.data)
  }
}

export async function listAssessmentModels(
  params: AssessmentModelListParams = {}
): Promise<[any, QSResponse<AssessmentModelListResponse> | undefined]> {
  const [err, res] = await get<any>('/assessment-models', params)
  return [err, mapResponse(res, normalizeListResponse)]
}

export async function createAssessmentModel(
  data: CreateAssessmentModelRequest
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  const [err, res] = await post<any>('/assessment-models', data)
  return [err, mapResponse(res, normalizeAssessmentModelDetail)]
}

export async function getAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  const [err, res] = await get<any>(`/assessment-models/${code}`)
  return [err, mapResponse(res, normalizeAssessmentModelDetail)]
}

export async function updateAssessmentModelBasicInfo(
  code: string,
  data: UpdateAssessmentModelBasicInfoRequest
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  const [err, res] = await put<any>(`/assessment-models/${code}/basic-info`, data)
  return [err, mapResponse(res, normalizeAssessmentModelDetail)]
}

export async function updateAssessmentModelQuestionnaire(
  code: string,
  data: UpdateAssessmentModelQuestionnaireRequest
): Promise<[any, QSResponse<AssessmentModelQuestionnaireResponse> | undefined]> {
  return put<AssessmentModelQuestionnaireResponse>(`/assessment-models/${code}/questionnaire`, data)
}

export async function getAssessmentModelDefinition(
  code: string
): Promise<[any, QSResponse<AssessmentModelDefinition> | undefined]> {
  const [err, res] = await get<any>(`/assessment-models/${code}/definition`)
  return [err, mapResponse(res, normalizeAssessmentModelDefinition)]
}

export async function saveAssessmentModelDefinition(
  code: string,
  definition: AssessmentModelDefinition
): Promise<[any, QSResponse<AssessmentModelDefinition> | undefined]> {
  const [err, res] = await put<any>(`/assessment-models/${code}/definition`, definition)
  return [err, mapResponse(res, normalizeAssessmentModelDefinition)]
}

export async function publishAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  const [err, res] = await post<any>(`/assessment-models/${code}/publish`, undefined)
  return [err, mapResponse(res, normalizeAssessmentModelDetail)]
}

export async function unpublishAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  const [err, res] = await post<any>(`/assessment-models/${code}/unpublish`, undefined)
  return [err, mapResponse(res, normalizeAssessmentModelDetail)]
}

export async function archiveAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  const [err, res] = await post<any>(`/assessment-models/${code}/archive`, undefined)
  return [err, mapResponse(res, normalizeAssessmentModelDetail)]
}

export async function deleteAssessmentModel(
  code: string
): Promise<[any, QSResponse<unknown> | undefined]> {
  return del<unknown>(`/assessment-models/${code}`)
}

export async function getAssessmentModelQRCode(
  code: string
): Promise<[any, QSResponse<AssessmentQRCodeResponse> | undefined]> {
  const [err, res] = await get<any>(`/assessment-models/${code}/qrcode`)
  return [err, mapResponse(res, normalizeQRCodeResponse)]
}

export async function getAssessmentModelOptions(
  kind?: AssessmentModelKind
): Promise<[any, QSResponse<AssessmentModelOptions> | undefined]> {
  const [err, res] = await get<any>('/assessment-models/options', kind ? { kind } : {})
  return [err, mapResponse(res, normalizeAssessmentModelOptions)]
}

export function applyAssessmentModelCodes(
  code: string,
  data: ApplyAssessmentModelCodesRequest
): Promise<[any, QSResponse<ApplyAssessmentModelCodesResponse> | undefined]> {
  return post<ApplyAssessmentModelCodesResponse>(`/assessment-models/${code}/codes/apply`, {
    target: data.target,
    count: data.count || 1
  })
}

export async function validateAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelValidationResult> | undefined]> {
  const [err, res] = await post<any>(`/assessment-models/${code}/validate`, undefined)
  return [err, mapResponse(res, normalizeValidationResult)]
}

export async function previewAssessmentModelReport(
  code: string,
  data: AssessmentModelPreviewReportRequest
): Promise<[any, QSResponse<AssessmentModelPreviewReportResponse> | undefined]> {
  const [err, res] = await post<any>(`/assessment-models/${code}/preview-report`, data)
  return [err, mapResponse(res, normalizePreviewReportResponse)]
}

export const assessmentModelApi = {
  listAssessmentModels,
  createAssessmentModel,
  getAssessmentModel,
  updateAssessmentModelBasicInfo,
  updateAssessmentModelQuestionnaire,
  getAssessmentModelDefinition,
  saveAssessmentModelDefinition,
  publishAssessmentModel,
  unpublishAssessmentModel,
  archiveAssessmentModel,
  deleteAssessmentModel,
  getAssessmentModelQRCode,
  getAssessmentModelOptions,
  applyAssessmentModelCodes,
  validateAssessmentModel,
  previewAssessmentModelReport
}
