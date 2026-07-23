import { get } from '../qsServer'
import type { QSResponse } from '@/types/qs'

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

export interface IAnswerSheetListResponse {
  items: IAnswerSheetSummaryItem[]
  total: number
}

export interface IAnswerSheetResponse extends IAnswerSheetSummaryItem {
  answers: any[]
}

export async function getAnswerSheetList(
  questionnaireCode?: string,
  page?: number,
  pageSize?: number,
  fillerId?: number,
  startTime?: string,
  endTime?: string
): Promise<[any, QSResponse<IAnswerSheetListResponse> | undefined]> {
  const params: Record<string, string | number> = {}
  if (questionnaireCode) params.questionnaire_code = questionnaireCode
  if (page) params.page = page
  if (pageSize) params.page_size = pageSize
  if (fillerId) params.filler_id = fillerId
  if (startTime) params.start_time = startTime
  if (endTime) params.end_time = endTime
  return get<IAnswerSheetListResponse>('/answersheets', params)
}

export function getAnswerSheetDetail(id: number | string): Promise<[any, QSResponse<IAnswerSheetResponse> | undefined]> {
  return get<IAnswerSheetResponse>(`/answersheets/${id}`)
}

export const answerSheetApi = { getAnswerSheetList, getAnswerSheetDetail }
