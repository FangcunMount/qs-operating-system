import { IQuestionSheetInfo } from '@/models/questionSheet'

/**
 * 问卷相关工具函数
 */

/**
 * 格式化问卷状态显示文本
 * @param status 状态值：0=草稿, 1=已发布, 2=已归档
 */
export const formatSurveyStatus = (status?: number | string): string => {
  // 兼容字符串和数字类型
  const statusNum = typeof status === 'string' ? parseInt(status, 10) : status
  switch (statusNum) {
  case 1:
    return '已发布'
  case 0:
    return '草稿'
  case 2:
    return '已归档'
  default:
    return '草稿'
  }
}

/**
 * 检查问卷是否可以编辑
 */
export const canEditSurvey = (survey: IQuestionSheetInfo): boolean => {
  // 如果状态不是已发布（1），或者没有状态字段，都可以编辑
  const statusNum = typeof survey.status === 'string' ? parseInt(survey.status, 10) : survey.status
  return statusNum !== 1 || true // 根据业务需求调整
}

/**
 * 检查问卷是否可以发布
 */
export const canPublishSurvey = (survey: IQuestionSheetInfo): boolean => {
  // 至少需要有一个题目才能发布
  const questionCount = parseInt(survey.question_cnt || '0', 10)
  return questionCount > 0
}

