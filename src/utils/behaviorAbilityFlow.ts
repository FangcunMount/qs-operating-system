import type { EditorFlowConfig, EditorFlowContext } from '@/utils/editorFlow'
import type { EditorStep } from '@/components/layout/BaseLayout'
import type { BehaviorAbilityStep } from '@/store/behaviorAbility'

export const BEHAVIOR_ABILITY_STEPS: EditorStep[] = [
  { title: '基本信息', key: 'create' },
  { title: '编辑问题', key: 'edit-questions' },
  { title: '题目路由', key: 'set-routing' },
  { title: '模型定义', key: 'edit-definition' },
  { title: '发布测评', key: 'publish' }
]

const abilityPathForStep = (basePath: string, step: BehaviorAbilityStep, modelCode: string): string => {
  switch (step) {
  case 'create':
    return `${basePath}/info/${modelCode}`
  case 'edit-questions':
    return `${basePath}/create/${modelCode}/0`
  case 'set-routing':
    return `${basePath}/routing/${modelCode}`
  case 'edit-definition':
    return `${basePath}/definition/${modelCode}`
  case 'publish':
    return `${basePath}/publish/${modelCode}`
  default:
    return basePath
  }
}

export const behaviorAbilityPathForStep = (step: BehaviorAbilityStep, modelCode: string): string =>
  abilityPathForStep('/behavioral-rating', step, modelCode)

export const behaviorAbilityStepIndex = (step: BehaviorAbilityStep): number => BEHAVIOR_ABILITY_STEPS.findIndex((item) => item.key === step)

const getBehaviorAbilityPathForFlow = (step: string, modelCode: string): string => behaviorAbilityPathForStep(step as BehaviorAbilityStep, modelCode)

export const getBehaviorAbilityStepFromPath = (pathname: string): BehaviorAbilityStep | undefined => {
  if (/\/(?:behavior-ability|behavioral-rating|cognitive)\/info\//.test(pathname)) return 'create'
  if (/\/(?:behavior-ability|behavioral-rating|cognitive)\/create\//.test(pathname)) return 'edit-questions'
  if (/\/(?:behavior-ability|behavioral-rating|cognitive)\/routing\//.test(pathname)) return 'set-routing'
  if (/\/(?:behavior-ability|behavioral-rating|cognitive)\/definition\//.test(pathname)) return 'edit-definition'
  if (/\/(?:behavior-ability|behavioral-rating|cognitive)\/publish\//.test(pathname)) return 'publish'
  return undefined
}

export const getBehaviorAbilityBlockedReason = (step: string, context: EditorFlowContext): string => {
  if (context.readonly && step !== 'create' && step !== 'publish') {
    return '归档模型仅可查看'
  }
  if (step === 'create') return ''
  if (!context.modelCode || context.modelCode === 'new') return '请先保存基本信息'
  if (!context.questionnaireCode) return '请先绑定题目问卷'
  if (step === 'edit-questions') return ''
  if ((step === 'set-routing' || step === 'edit-definition') && !context.hasQuestions) {
    return '请先添加题目'
  }
  if (step === 'publish' && !context.hasDefinition) return '请先完成模型定义'
  return ''
}

export const behaviorAbilityEditorFlowConfig: EditorFlowConfig = {
  listPath: '/behavioral-rating',
  themeClass: 'behavior-ability-page-theme',
  steps: BEHAVIOR_ABILITY_STEPS,
  getPathForStep: getBehaviorAbilityPathForFlow,
  getStepFromPath: getBehaviorAbilityStepFromPath,
  getBlockedReason: getBehaviorAbilityBlockedReason
}

export const cognitiveEditorFlowConfig: EditorFlowConfig = {
  listPath: '/cognitive',
  themeClass: 'behavior-ability-page-theme',
  steps: BEHAVIOR_ABILITY_STEPS,
  getPathForStep: (step, modelCode) => abilityPathForStep('/cognitive', step as BehaviorAbilityStep, modelCode),
  getStepFromPath: getBehaviorAbilityStepFromPath,
  getBlockedReason: getBehaviorAbilityBlockedReason
}

export const buildBehaviorAbilityFlowContext = (store: {
  questionnaireCode?: string
  questions?: unknown[]
  definition?: { Measure?: { Factors?: unknown[] }; Execution?: unknown }
  status?: string
}): Omit<EditorFlowContext, 'modelCode'> => ({
  questionnaireCode: store.questionnaireCode,
  hasQuestions: Boolean(store.questions?.length),
  hasDefinition: Boolean(store.definition?.Measure?.Factors?.length || store.definition?.Execution),
  readonly: store.status === 'archived'
})
