import { useLocation } from 'react-router'
import { useHistory } from 'react-router-dom'
import { message } from 'antd'
import { EditorStep } from '@/components/layout/BaseLayout'

export interface EditorFlowConfig {
  kind: 'personality' | 'scale' | 'survey'
  listPath: string
  themeClass: string
  steps: EditorStep[]
  getPathForStep: (stepKey: string, modelCode: string) => string
  getStepFromPath: (pathname: string) => string | undefined
}

export interface EditorFlowContext {
  modelCode?: string
  questionnaireCode?: string
  hasQuestions?: boolean
  hasDefinition?: boolean
  readonly?: boolean
}

export interface UseEditorFlowResult {
  currentStepIndex: number
  currentStepKey: string
  handleStepChange: (stepIndex: number) => void
  navigateToStep: (stepKey: string) => void
  goNext: () => void
  goPrev: () => void
  goStep: (stepKey: string) => void
  canEnterStep: (stepKey: string) => boolean
  getBlockedReason: (stepKey: string) => string
}

export const PERSONALITY_STEPS: EditorStep[] = [
  { title: '基本信息', key: 'create' },
  { title: '编辑问题', key: 'edit-questions' },
  { title: '题目路由', key: 'set-routing' },
  { title: '模型定义', key: 'edit-definition' },
  { title: '发布测评', key: 'publish' }
]

export const getPersonalityStepIndex = (stepKey: string): number =>
  PERSONALITY_STEPS.findIndex((step) => step.key === stepKey)

export const getPersonalityStepFromPath = (pathname: string): string | undefined => {
  if (pathname.includes('/personality/info/')) return 'create'
  if (pathname.includes('/personality/create/')) return 'edit-questions'
  if (pathname.includes('/personality/routing/')) return 'set-routing'
  if (pathname.includes('/personality/definition/')) return 'edit-definition'
  if (pathname.includes('/personality/publish/')) return 'publish'
  return undefined
}

export const canEnterPersonalityStep = (
  stepKey: string,
  ctx: EditorFlowContext
): boolean => getBlockedReasonForStep(stepKey, ctx) === ''

export const getBlockedReasonForStep = (
  stepKey: string,
  ctx: EditorFlowContext
): string => {
  if (ctx.readonly && stepKey !== 'create' && stepKey !== 'publish') {
    return '归档模型仅可查看'
  }
  switch (stepKey) {
  case 'create':
    return ''
  case 'edit-questions':
    if (!ctx.modelCode || ctx.modelCode === 'new') return '请先保存基本信息'
    if (!ctx.questionnaireCode) return '请先绑定题目问卷'
    return ''
  case 'set-routing':
    if (!ctx.hasQuestions) return '请先添加题目'
    return canEnterPersonalityStep('edit-questions', ctx) ? '' : getBlockedReasonForStep('edit-questions', ctx)
  case 'edit-definition':
    if (!ctx.hasQuestions) return '请先添加题目'
    return canEnterPersonalityStep('edit-questions', ctx) ? '' : getBlockedReasonForStep('edit-questions', ctx)
  case 'publish':
    if (!ctx.hasDefinition) return '请先完成模型定义'
    return canEnterPersonalityStep('edit-definition', ctx) ? '' : getBlockedReasonForStep('edit-definition', ctx)
  default:
    return ''
  }
}

export const personalityEditorFlowConfig: EditorFlowConfig = {
  kind: 'personality',
  listPath: '/personality/list',
  themeClass: 'personality-page-theme',
  steps: PERSONALITY_STEPS,
  getPathForStep: (stepKey: string, modelCode: string) => {
    switch (stepKey) {
    case 'create':
      return `/personality/info/${modelCode}`
    case 'edit-questions':
      return `/personality/create/${modelCode}/0`
    case 'set-routing':
      return `/personality/routing/${modelCode}`
    case 'edit-definition':
      return `/personality/definition/${modelCode}`
    case 'publish':
      return `/personality/publish/${modelCode}`
    default:
      return '/personality/list'
    }
  },
  getStepFromPath: getPersonalityStepFromPath
}

export const useEditorFlow = (
  config: EditorFlowConfig,
  modelCode?: string,
  context: Omit<EditorFlowContext, 'modelCode'> = {}
): UseEditorFlowResult => {
  const history = useHistory()
  const location = useLocation()

  const flowContext: EditorFlowContext = {
    modelCode,
    ...context
  }

  const currentStepKey = config.getStepFromPath(location.pathname) || config.steps[0]?.key || ''
  const currentStepIndex = config.steps.findIndex((step) => step.key === currentStepKey)

  const canEnterStep = (stepKey: string) => {
    if (config.kind !== 'personality') return true
    return canEnterPersonalityStep(stepKey, flowContext)
  }

  const getBlockedReason = (stepKey: string) => {
    if (config.kind !== 'personality') return ''
    return getBlockedReasonForStep(stepKey, flowContext)
  }

  const navigateToStep = (stepKey: string, showMessage = true) => {
    if (!modelCode) return
    const blocked = getBlockedReason(stepKey)
    if (blocked) {
      if (showMessage) message.warning(blocked)
      return
    }
    history.push(config.getPathForStep(stepKey, modelCode))
  }

  const handleStepChange = (stepIndex: number) => {
    const step = config.steps[stepIndex]
    if (!step?.key) return
    navigateToStep(step.key)
  }

  const goStep = (stepKey: string) => navigateToStep(stepKey)
  const goNext = () => {
    const idx = currentStepIndex < 0 ? 0 : currentStepIndex
    const next = config.steps[idx + 1]
    if (next?.key) navigateToStep(next.key)
  }
  const goPrev = () => {
    const idx = currentStepIndex < 0 ? 0 : currentStepIndex
    const prev = config.steps[idx - 1]
    if (prev?.key) navigateToStep(prev.key)
  }

  return {
    currentStepIndex: currentStepIndex < 0 ? 0 : currentStepIndex,
    currentStepKey,
    handleStepChange,
    navigateToStep,
    goNext,
    goPrev,
    goStep,
    canEnterStep,
    getBlockedReason
  }
}

export const buildPersonalityFlowContext = (store: {
  modelCode: string
  flowContext?: Omit<EditorFlowContext, 'modelCode'>
  id?: string
  questions?: unknown[]
  runtimeSpec?: { factor_graph?: { factors?: Record<string, unknown> } }
  payload?: { dimensions?: unknown[]; outcomes?: unknown[] }
  status?: string
}): Omit<EditorFlowContext, 'modelCode'> => {
  if (store.flowContext) return store.flowContext
  return {
    questionnaireCode: store.id,
    hasQuestions: (store.questions || []).length > 0,
    hasDefinition: Boolean(
      (store.runtimeSpec?.factor_graph?.factors && Object.keys(store.runtimeSpec.factor_graph.factors).length > 0)
      || (store.payload?.outcomes?.length && store.payload.outcomes.length > 0)
    ),
    readonly: store.status === 'archived'
  }
}
