import { useHistory } from 'react-router-dom'
import { SURVEY_STEPS } from '@/utils/steps'

/**
 * 问卷步骤导航 Hook
 * 统一管理问卷编辑流程的步骤跳转逻辑
 */
export const useSurveySteps = (): {
  handleStepChange: (stepIndex: number, questionsheetId: string) => void
  navigateToStep: (stepKey: string, questionsheetId: string) => void
} => {
  const history = useHistory()

  /**
   * 处理步骤跳转
   * @param stepIndex 步骤索引
   * @param questionsheetId 问卷ID
   */
  const handleStepChange = (stepIndex: number, questionsheetId: string) => {
    const step = SURVEY_STEPS[stepIndex]
    if (!step || !questionsheetId) return

    switch (step.key) {
    case 'create':
      history.push(`/survey/info/${questionsheetId}`)
      break
    case 'edit-questions':
      history.push(`/survey/create/${questionsheetId}/0`)
      break
    case 'set-routing':
      history.push(`/survey/routing/${questionsheetId}`)
      break
    case 'publish':
      history.push(`/survey/publish/${questionsheetId}`)
      break
    }
  }

  /**
   * 跳转到指定步骤
   * @param stepKey 步骤key
   * @param questionsheetId 问卷ID
   */
  const navigateToStep = (stepKey: string, questionsheetId: string) => {
    const stepIndex = SURVEY_STEPS.findIndex(s => s.key === stepKey)
    if (stepIndex >= 0) {
      handleStepChange(stepIndex, questionsheetId)
    }
  }

  return {
    handleStepChange,
    navigateToStep
  }
}

