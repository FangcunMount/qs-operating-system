import { useLocation } from 'react-router'
import { useHistory } from 'react-router-dom'
import { EditorStep } from '@/components/layout/BaseLayout'

export interface EditorFlowConfig {
  kind: 'personality' | 'scale' | 'survey'
  listPath: string
  themeClass: string
  steps: EditorStep[]
  getPathForStep: (stepKey: string, modelCode: string) => string
  getStepFromPath: (pathname: string) => string | undefined
}

export interface UseEditorFlowResult {
  currentStepIndex: number
  handleStepChange: (stepIndex: number) => void
  navigateToStep: (stepKey: string) => void
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

export const useEditorFlow = (config: EditorFlowConfig, modelCode?: string): UseEditorFlowResult => {
  const history = useHistory()
  const location = useLocation()

  const currentStepKey = config.getStepFromPath(location.pathname) || config.steps[0]?.key || ''
  const currentStepIndex = config.steps.findIndex((step) => step.key === currentStepKey)

  const navigateToStep = (stepKey: string) => {
    if (!modelCode) return
    history.push(config.getPathForStep(stepKey, modelCode))
  }

  const handleStepChange = (stepIndex: number) => {
    const step = config.steps[stepIndex]
    if (!step?.key) return
    navigateToStep(step.key)
  }

  return {
    currentStepIndex: currentStepIndex < 0 ? 0 : currentStepIndex,
    handleStepChange,
    navigateToStep
  }
}
