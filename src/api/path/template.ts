import { get } from '../server'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import { ApiResponse } from '@/types/server'
import { getScaleListCompat } from './scale'

type QuestionSheetListParams = {
  pagesize: string
  pagenum: string
  keyword?: string
  type?: 'survey' | 'scale'
}

// Mock 列表已移除，使用真实后端数据

/**
 * 获取问卷列表（支持类型区分）
 */
export function getQuestionSheetListByType<T = { 
  pagesize: string
  pagenum: string
  total_count: string
  list: Array<IQuestionSheetInfo> 
}>(
  pagesize: string,
  pagenum: string,
  type: 'survey' | 'scale',
  keyword?: string
): ApiResponse<T> {
  const params: QuestionSheetListParams = { pagesize, pagenum, type }
  if (keyword) {
    params.keyword = keyword
  }

  // 真实 API 调用
  return get<T>('/api/questionsheet/list', params)
}

/**
 * 获取调查问卷列表
 */
export function getSurveyList<T = { 
  pagesize: string
  pagenum: string
  total_count: string
  list: Array<IQuestionSheetInfo> 
}>(
  pagesize: string,
  pagenum: string,
  keyword?: string
): ApiResponse<T> {
  return getQuestionSheetListByType<T>(pagesize, pagenum, 'survey', keyword)
}

/**
 * 获取医学量表列表（使用新 API）
 */
export function getScaleList<T = { 
  pagesize: string
  pagenum: string
  total_count: string
  list: Array<IQuestionSheetInfo> 
}>(
  pagesize: string,
  pagenum: string,
  keyword?: string
): ApiResponse<T> {
  // 使用新 API
  return getScaleListCompat(pagesize, pagenum, keyword) as ApiResponse<T>
}

export const templateApi = {
  getSurveyList,
  getScaleList,
  getQuestionSheetListByType
}
