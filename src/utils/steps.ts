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

/**
 * 根据路由路径获取量表编辑步骤 key
 * @param pathname 当前路由路径
 * @returns 步骤 key，如果无法匹配则返回 undefined
 */
export const getScaleStepFromPath = (pathname: string): string | undefined => {
  if (pathname.includes('/scale/info/')) {
    return 'create'
  }
  if (pathname.includes('/scale/create/')) {
    return 'edit-questions'
  }
  if (pathname.includes('/scale/routing/')) {
    return 'set-routing'
  }
  if (pathname.includes('/scale/factor/')) {
    return 'edit-factors'
  }
  if (pathname.includes('/scale/analysis/')) {
    return 'set-interpretation'
  }
  if (pathname.includes('/scale/publish/')) {
    return 'publish'
  }
  return undefined
}

/**
 * 根据路由路径获取调查问卷编辑步骤 key
 * @param pathname 当前路由路径
 * @returns 步骤 key，如果无法匹配则返回 undefined
 */
export const getSurveyStepFromPath = (pathname: string): string | undefined => {
  if (pathname.includes('/survey/info/')) {
    return 'create'
  }
  if (pathname.includes('/survey/create/')) {
    return 'edit-questions'
  }
  if (pathname.includes('/survey/routing/')) {
    return 'set-routing'
  }
  if (pathname.includes('/survey/publish/')) {
    return 'publish'
  }
  return undefined
}
