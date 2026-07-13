import React, { useEffect } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { behaviorAbilityStore } from '@/store/behaviorAbility'
import { createBehaviorAbilityQuestionnairePort, QuestionEditorWorkspace, validateQuestionList } from '@/features/assessment-editor'
import { behaviorAbilityEditorFlowConfig, buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'

const behaviorAbilityQuestionEditor = createBehaviorAbilityQuestionnairePort(behaviorAbilityStore)

const BehaviorAbilityQuestionEdit: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const editorFlow = useEditorFlow(
    behaviorAbilityEditorFlowConfig,
    behaviorAbilityStore.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(behaviorAbilityStore)
  )

  useEffect(() => {
    behaviorAbilityStore.setCurrentStep('edit-questions')
    behaviorAbilityStore.init(modelCode).catch((error) => message.error(getApiErrorMessage(error, '加载题目失败')))
  }, [modelCode])

  const save = async () => behaviorAbilityStore.saveQuestions()

  return (
    <BaseLayout
      beforeSubmit={() => validateQuestionList(behaviorAbilityStore.questions)}
      submitFn={save}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('题目已保存')
          editorFlow.goStep('set-routing')
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={behaviorAbilityStore.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={behaviorAbilityEditorFlowConfig.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <QuestionEditorWorkspace editor={behaviorAbilityQuestionEditor} />
    </BaseLayout>
  )
})

export default BehaviorAbilityQuestionEdit
