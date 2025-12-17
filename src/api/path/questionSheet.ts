import { get, post } from '../server'
import { IQuestionSheet, IQuestionSheetInfo } from '@/models/questionSheet'
import { ApiResponse } from '@/types/server'

type QuestionSheetListParams = {
  pagesize: string
  pagenum: string
  keyword?: string
}

export function getQuestionSheet<T = { questionsheet: IQuestionSheet }>(id: string | number): ApiResponse<T> {
  return get<T>(`/questionnaires/${id}`, {})
}

export function getQuestionSheetList<T = { pagesize: string; pagenum: string; total_count: string; list: Array<IQuestionSheetInfo> }>(
  pagesize: string,
  pagenum: string,
  keyword?: string
): ApiResponse<T> {
  const params: QuestionSheetListParams = { pagesize, pagenum }
  if (keyword) {
    params['keyword'] = keyword
  }
  return get<T>('/questionnaires', params)
}

export function delQuestionSheet<T = string>(id: string): ApiResponse<T> {
  return post<T>(`/questionnaires/${id}`, {})
}

export function modifyQuestionSheet<T = { questionsheetid: string }>(data: IQuestionSheetInfo): ApiResponse<T> {
  return post<T>(`/questionnaires/${data.id}/basic-info`, { title: data.title, img_url: data.img_url, description: data.desc })
}

export function addQuestionSheet<T = { questionsheetid: string }>(data: IQuestionSheetInfo): ApiResponse<T> {
  return post<T>('/questionnaires', { title: data.title, img_url: data.img_url, description: data.desc })
}

export const questionSheetApi = {
  getQuestionSheet,
  getQuestionSheetList,
  delQuestionSheet,
  modifyQuestionSheet,
  addQuestionSheet
}
