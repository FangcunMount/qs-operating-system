import React, { useEffect } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { personalityModelStore, personalityEditorWorkflowStore, getPersonalityEditorFlowContext } from '@/store/personality'
import { createPersonalityQuestionnairePort, QuestionEditorWorkspace, validateQuestionList } from '@/features/assessment-editor'
import { getApiErrorMessage } from '@/utils/apiError'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import RepublishHint from '@/components/personality/RepublishHint'
import '../index.scss'

const RECOMMENDED_TYPES = new Set(['Radio', 'ScoreRadio'])

const personalityQuestionEditor = createPersonalityQuestionnairePort(personalityModelStore)

const PersonalityQuestionEdit: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string; answercnt: string }>()
  const flowCtx = getPersonalityEditorFlowContext()
  const editorFlow = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode, flowCtx)

  useEffect(() => {
    personalityEditorWorkflowStore.setCurrentStep('edit-questions')
    personalityEditorWorkflowStore.initEditor(modelCode).catch(() => message.error('加载类型学模型题目失败'))
  }, [modelCode])

  const verifyQuestionSheet = () =>
    validateQuestionList(personalityModelStore.questions, {
      onValidated: (question) => {
        if (!RECOMMENDED_TYPES.has(question.type)) {
          message.warning(`题目「${question.title || question.code}」题型 ${question.type} 可能不适合人格因子映射`)
        }
      }
    })

  const handleSave = async () => {
    if (personalityModelStore.questions.length === 0) {
      message.warning('请至少添加一个问题')
      return
    }
    await personalityEditorWorkflowStore.saveQuestions({ persist: true })
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('问题保存成功')
      editorFlow.goStep('set-routing')
    } else {
      message.error(getApiErrorMessage(error, '问题更新失败'))
    }
  }

  return (
    <BaseLayout
      listUrl={personalityEditorFlowConfig.listPath}
      beforeSubmit={verifyQuestionSheet}
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={personalityModelStore.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={PERSONALITY_STEPS}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-question-edit-shell personality-page-theme">
        <RepublishHint status={personalityModelStore.status} />
        <QuestionEditorWorkspace editor={personalityQuestionEditor} className="personality-page-theme" />
      </div>
    </BaseLayout>
  )
})

export default PersonalityQuestionEdit
