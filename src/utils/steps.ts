import { EditorStep } from '@/components/layout/BaseLayout'

/**
 * 调查问卷步骤配置
 */
export const SURVEY_STEPS: EditorStep[] = [
  { title: '基本信息', key: 'create' },
  { title: '编辑问题', key: 'edit-questions' },
  { title: '题目路由', key: 'set-routing' },
  { title: '发布问卷', key: 'publish' }
]

/**
 * 医学量表步骤配置
 */
export const SCALE_STEPS: EditorStep[] = [
  { title: '基本信息', key: 'create' },
  { title: '编辑问题', key: 'edit-questions' },
  { title: '题目路由', key: 'set-routing' },
  { title: '编辑因子', key: 'edit-factors' },
  { title: '解读规则', key: 'set-interpretation' },
  { title: '发布量表', key: 'publish' }
]

/**
 * 根据步骤 key 获取步骤索引
 */
export const getStepIndex = (steps: EditorStep[], stepKey: string): number => {
  return steps.findIndex(step => step.key === stepKey)
}

/**
 * 获取调查问卷当前步骤索引
 */
export const getSurveyStepIndex = (stepKey: string): number => {
  return getStepIndex(SURVEY_STEPS, stepKey)
}

/**
 * 获取医学量表当前步骤索引
 */
export const getScaleStepIndex = (stepKey: string): number => {
  return getStepIndex(SCALE_STEPS, stepKey)
}
