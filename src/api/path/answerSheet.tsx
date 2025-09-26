import { IAnswerSheet } from '@/models/answerSheet'
import { ApiResponse } from '@/types/server'
import { get, post } from '../server'

interface IAnswerSheetResponse {
  pagesize: string
  pagenum: string
  total_count: string
  list: IAnswerSheet[]
}

export function getAnswerSheetList<T = IAnswerSheetResponse>(questionsheetid: string, pagesize: string, pagenum: string): ApiResponse<T> {
  return get<T>('/api/answersheet/list', { questionsheetid, pagesize, pagenum })
}

export function getAnswerSheetDetail<T = { answersheet: IAnswerSheet }>(answersheetid: string): ApiResponse<T> {
  return get<T>('/api/answersheet/one', { answersheetid })
}

export function postExportAnswerSheetDetails<T = Record<string, never>>(
  questionsheetid: string,
  start: string,
  end: string,
  doctorid: string
): ApiResponse<T> {
  return post<T>('/api/qsexport/answersheetdetails', { questionsheetid, start_date: start, end_date: end, doctorid })
}

export function postExportAnswerSheetScores<T = Record<string, never>>(
  questionsheetid: string,
  start: string,
  end: string,
  doctorid: string
): ApiResponse<T> {
  return post<T>('/api/qsexport/answersheetscores', { questionsheetid, start_date: start, end_date: end, doctorid })
}

export const answerSheetApi = {
  getAnswerSheetList,
  getAnswerSheetDetail,
  postExportAnswerSheetDetails,
  postExportAnswerSheetScores
}
