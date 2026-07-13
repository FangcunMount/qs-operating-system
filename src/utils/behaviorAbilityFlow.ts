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

export const behaviorAbilityPathForStep = (step: BehaviorAbilityStep, modelCode: string): string => {
  switch (step) {
    case 'create':
      return `/behavior-ability/info/${modelCode}`
    case 'edit-questions':
      return `/behavior-ability/create/${modelCode}/0`
    case 'set-routing':
      return `/behavior-ability/routing/${modelCode}`
    case 'edit-definition':
      return `/behavior-ability/definition/${modelCode}`
    case 'publish':
      return `/behavior-ability/publish/${modelCode}`
    default:
      return '/behavior-ability/list'
  }
}

export const behaviorAbilityStepIndex = (step: BehaviorAbilityStep): number => BEHAVIOR_ABILITY_STEPS.findIndex((item) => item.key === step)

const getBehaviorAbilityPathForFlow = (step: string, modelCode: string): string => behaviorAbilityPathForStep(step as BehaviorAbilityStep, modelCode)

export const getBehaviorAbilityStepFromPath = (pathname: string): BehaviorAbilityStep | undefined => {
  if (pathname.includes('/behavior-ability/info/')) return 'create'
  if (pathname.includes('/behavior-ability/create/')) return 'edit-questions'
  if (pathname.includes('/behavior-ability/routing/')) return 'set-routing'
  if (pathname.includes('/behavior-ability/definition/')) return 'edit-definition'
  if (pathname.includes('/behavior-ability/publish/')) return 'publish'
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
  listPath: '/behavior-ability/list',
  themeClass: 'behavior-ability-page-theme',
  steps: BEHAVIOR_ABILITY_STEPS,
  getPathForStep: getBehaviorAbilityPathForFlow,
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
