import { del, get, post, put } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import {
  AssessmentModelDefinition,
  AssessmentModelDetail,
  AssessmentModelKind,
  AssessmentModelOptions,
  AssessmentModelSummary,
  AssessmentModelValidationResult,
  normalizeAssessmentModelDetail,
  normalizeAssessmentModelOptions,
  normalizeAssessmentModelSummary
} from '@/models/assessmentModel'

export interface AssessmentModelListParams {
  kind?: AssessmentModelKind
  status?: string
  keyword?: string
  algorithm?: string
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
  title: string
  description?: string
  kind: AssessmentModelKind
  sub_kind?: string
  algorithm?: string
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
  questionnaire_version?: string
}

export interface ApplyAssessmentModelCodesRequest {
  target: 'dimension' | 'outcome'
  count?: number
}

export interface ApplyAssessmentModelCodesResponse {
  codes: string[]
  count: number
}

export interface AssessmentQRCodeResponse {
  code: string
  url?: string
  qrcode_url?: string
  qrcode?: string
}

const normalizeListResponse = (data: any): AssessmentModelListResponse => {
  const list = data?.models || data?.list || data?.items || []
  return {
    models: Array.isArray(list) ? list.map(normalizeAssessmentModelSummary) : [],
    page: Number(data?.page || data?.pagenum || 1),
    page_size: Number(data?.page_size || data?.pagesize || 10),
    total_count: Number(data?.total_count || data?.total || 0)
  }
}

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

export function updateAssessmentModelQuestionnaire(
  code: string,
  data: UpdateAssessmentModelQuestionnaireRequest
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  return put<AssessmentModelDetail>(`/assessment-models/${code}/questionnaire`, data)
}

export function getAssessmentModelDefinition(
  code: string
): Promise<[any, QSResponse<AssessmentModelDefinition> | undefined]> {
  return get<AssessmentModelDefinition>(`/assessment-models/${code}/definition`)
}

export function saveAssessmentModelDefinition(
  code: string,
  definition: AssessmentModelDefinition
): Promise<[any, QSResponse<AssessmentModelDefinition> | undefined]> {
  return put<AssessmentModelDefinition>(`/assessment-models/${code}/definition`, definition)
}

export function publishAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  return post<AssessmentModelDetail>(`/assessment-models/${code}/publish`, undefined)
}

export function unpublishAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  return post<AssessmentModelDetail>(`/assessment-models/${code}/unpublish`, undefined)
}

export function archiveAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelDetail> | undefined]> {
  return post<AssessmentModelDetail>(`/assessment-models/${code}/archive`, undefined)
}

export function deleteAssessmentModel(
  code: string
): Promise<[any, QSResponse<unknown> | undefined]> {
  return del<unknown>(`/assessment-models/${code}`)
}

export function getAssessmentModelQRCode(
  code: string
): Promise<[any, QSResponse<AssessmentQRCodeResponse> | undefined]> {
  return get<AssessmentQRCodeResponse>(`/assessment-models/${code}/qrcode`)
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

export function validateAssessmentModel(
  code: string
): Promise<[any, QSResponse<AssessmentModelValidationResult> | undefined]> {
  return post<AssessmentModelValidationResult>(`/assessment-models/${code}/validate`, undefined)
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
  validateAssessmentModel
}
