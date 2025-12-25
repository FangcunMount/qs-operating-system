import { get, post } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import type { IQuestionnaireStatistics } from './statistics'

// ============ 类型定义 ============

// 答卷摘要项
export interface IAnswerSheetSummaryItem {
  id: number
  title: string
  filler_id: number
  filler_name: string
  questionnaire_code: string
  questionnaire_ver: string
  filled_at: string
  score: number
}

// 答卷列表响应
export interface IAnswerSheetListResponse {
  items: IAnswerSheetSummaryItem[]
  total: number
}

// 答卷详情响应
export interface IAnswerSheetResponse {
  id: number
  title: string
  filler_id: number
  filler_name: string
  questionnaire_code: string
  questionnaire_ver: string
  filled_at: string
  score: number
  answers: any[] // AnswerDTO[]
}

// 答卷统计响应
export interface IAnswerSheetStatisticsResponse {
  questionnaire_code: string
  total_count: number
  average_score: number
  max_score: number
  min_score: number
}

// ============ API 函数 ============

/**
 * 查询答卷列表
 * GET /answersheets
 */
export async function getAnswerSheetList(
  questionnaireCode?: string,
  page?: number,
  pageSize?: number,
  fillerId?: number,
  startTime?: string,
  endTime?: string
): Promise<[any, QSResponse<IAnswerSheetListResponse> | undefined]> {
  const params: any = {}
  if (questionnaireCode) params.questionnaire_code = questionnaireCode
  if (page) params.page = page
  if (pageSize) params.page_size = pageSize
  if (fillerId) params.filler_id = fillerId
  if (startTime) params.start_time = startTime
  if (endTime) params.end_time = endTime
  
  return get<IAnswerSheetListResponse>('/answersheets', params)
}

/**
 * 获取答卷详情
 * GET /answersheets/{id}
 */
export async function getAnswerSheetDetail(
  id: number | string
): Promise<[any, QSResponse<IAnswerSheetResponse> | undefined]> {
  return get<IAnswerSheetResponse>(`/answersheets/${id}`)
}

/**
 * 获取答卷统计
 * 已迁移到统计模块：GET /statistic/questionnaires/{code}
 * 注意：此接口保留用于向后兼容，建议使用 statisticsApi.getQuestionnaireStatistics
 */
export async function getAnswerSheetStatistics(
  code: string
): Promise<[any, QSResponse<IAnswerSheetStatisticsResponse> | undefined]> {
  // 使用统计模块的新接口，但返回格式保持兼容
  const [error, data] = await get<IQuestionnaireStatistics>(`/statistics/questionnaires/${code}`)
  if (error || !data?.data) {
    return [error, undefined]
  }
  
  // 转换为旧格式以保持向后兼容
  const stats = data.data
  const legacyStats: IAnswerSheetStatisticsResponse = {
    questionnaire_code: stats.questionnaire_code,
    total_count: stats.total_submissions,
    average_score: 0, // 新接口不提供此字段，设为0
    max_score: 0,     // 新接口不提供此字段，设为0
    min_score: 0      // 新接口不提供此字段，设为0
  }
  
  return [null, { ...data, data: legacyStats }]
}

/**
 * 导出答卷详情（保留旧接口兼容性）
 */
export async function postExportAnswerSheetDetails<T = Record<string, never>>(
  questionsheetid: string,
  start: string,
  end: string,
  doctorid: string
): Promise<[any, QSResponse<T> | undefined]> {
  return post<T>('/api/qsexport/answersheetdetails', { questionsheetid, start_date: start, end_date: end, doctorid })
}

/**
 * 导出答卷得分（保留旧接口兼容性）
 */
export async function postExportAnswerSheetScores<T = Record<string, never>>(
  questionsheetid: string,
  start: string,
  end: string,
  doctorid: string
): Promise<[any, QSResponse<T> | undefined]> {
  return post<T>('/api/qsexport/answersheetscores', { questionsheetid, start_date: start, end_date: end, doctorid })
}

export const answerSheetApi = {
  getAnswerSheetList,
  getAnswerSheetDetail,
  getAnswerSheetStatistics,
  postExportAnswerSheetDetails,
  postExportAnswerSheetScores
}
