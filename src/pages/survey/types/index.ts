/**
 * 问卷相关类型定义
 */

export interface SurveyListFilters {
  keyword: string
  status?: number
}

export interface SurveyPagination {
  page: number
  pageSize: number
  total: number
}

export interface SurveyPublishInfo {
  isPublished: boolean
  surveyUrl: string
  shareCode: string
}
