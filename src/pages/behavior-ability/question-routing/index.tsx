import React, { useEffect } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { behaviorAbilityStore } from '@/store/behaviorAbility'
import { bindQuestionnaireEditingPort, QuestionRoutingWorkspace } from '@/features/assessment-editor'
import { behaviorAbilityEditorFlowConfig, buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'

const BehaviorAbilityQuestionRouting: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const editorFlow = useEditorFlow(
    behaviorAbilityEditorFlowConfig,
    behaviorAbilityStore.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(behaviorAbilityStore)
  )

  useEffect(() => {
    behaviorAbilityStore.setCurrentStep('set-routing')
    behaviorAbilityStore.init(modelCode).catch((error) => message.error(getApiErrorMessage(error, '加载题目路由失败')))
  }, [modelCode])

  return (
    <BaseLayout
      submitFn={() => behaviorAbilityStore.saveRouting()}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('题目路由已保存')
          editorFlow.goStep('edit-definition')
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={behaviorAbilityStore.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={behaviorAbilityEditorFlowConfig.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <QuestionRoutingWorkspace editor={behaviorAbilityRoutingEditor} warning="跳题路由可能跳过 SPM 或计分关键题，请确认配置。" />
    </BaseLayout>
  )
})

const behaviorAbilityRoutingEditor = bindQuestionnaireEditingPort(behaviorAbilityStore, () => behaviorAbilityStore.questionnaireCode)

export default BehaviorAbilityQuestionRouting
