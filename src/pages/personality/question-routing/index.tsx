import React, { useEffect } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { personalityModelStore, personalityEditorWorkflowStore, getPersonalityEditorFlowContext } from '@/store/personality'
import { bindQuestionnaireEditingPort, QuestionRoutingWorkspace } from '@/features/assessment-editor'
import { getApiErrorMessage } from '@/utils/apiError'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import '@/pages/survey/question-routing/index.scss'
import '../index.scss'

const personalityRoutingEditor = bindQuestionnaireEditingPort(personalityModelStore, () => personalityModelStore.id || '')

const PersonalityQuestionRouting: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const flowCtx = getPersonalityEditorFlowContext()
  const editorFlow = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode, flowCtx)

  useEffect(() => {
    personalityEditorWorkflowStore.setCurrentStep('set-routing')
    personalityEditorWorkflowStore.initEditor(modelCode).catch(() => message.error('加载人格测评路由失败'))
  }, [modelCode])

  const handleSave = async () => {
    if (personalityModelStore.questions.length === 0) throw new Error('请先添加问题')
    await personalityEditorWorkflowStore.saveRouting()
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存成功')
      editorFlow.goStep('edit-definition')
    } else {
      message.error(getApiErrorMessage(error, '路由设置保存失败'))
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={personalityModelStore.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={PERSONALITY_STEPS}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-routing-shell personality-page-theme">
        <QuestionRoutingWorkspace
          editor={personalityRoutingEditor}
          className="personality-page-theme"
          warning="跳题路由可能影响因子完整性，请确认显隐规则不会跳过关键计分题"
        />
      </div>
    </BaseLayout>
  )
})

export default PersonalityQuestionRouting
