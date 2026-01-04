import { IQuestionSheetInfo } from '@/models/questionSheet'

/**
 * 问卷相关工具函数
 */

/**
 * 格式化问卷状态显示文本
 * @param status 状态值：draft/published/archived
 */
export const formatSurveyStatus = (status?: number | string): string => {
  const statusKey = normalizeSurveyStatus(status)
  switch (statusKey) {
  case 'published':
    return '已发布'
  case 'archived':
    return '已归档'
  case 'draft':
  default:
    return '草稿'
  }
}

/**
 * 检查问卷是否可以编辑
 */
export const canEditSurvey = (survey: IQuestionSheetInfo): boolean => {
  // 如果状态不是已发布（1），或者没有状态字段，都可以编辑
  const statusKey = normalizeSurveyStatus(survey.status)
  return statusKey !== 'published' || true // 根据业务需求调整
}

/**
 * 检查问卷是否可以发布
 */
export const canPublishSurvey = (survey: IQuestionSheetInfo): boolean => {
  // 至少需要有一个题目才能发布
  const questionCount = parseInt(survey.question_cnt || '0', 10)
  return questionCount > 0
}

const normalizeSurveyStatus = (status?: number | string): 'draft' | 'published' | 'archived' => {
  if (typeof status === 'number') {
    return status === 1 ? 'published' : status === 2 ? 'archived' : 'draft'
  }
  if (!status) {
    return 'draft'
  }
  if (status === 'draft' || status === 'published' || status === 'archived') {
    return status
  }
  const parsed = Number(status)
  if (!Number.isNaN(parsed)) {
    return parsed === 1 ? 'published' : parsed === 2 ? 'archived' : 'draft'
  }
  return 'draft'
}
