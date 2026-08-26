import React, { useEffect, useMemo } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { bindQuestionnaireEditingPort, QuestionRoutingWorkspace } from '@/features/assessment-editor'
import { buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'
import { getAbilityEditorProduct } from '../product'

const BehaviorAbilityQuestionRouting: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const location = useLocation()
  const { store, flow, title } = getAbilityEditorProduct(location.pathname)
  const routingEditor = useMemo(() => bindQuestionnaireEditingPort(store, () => store.questionnaireCode), [store])
  const editorFlow = useEditorFlow(
    flow,
    store.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(store)
  )

  useEffect(() => {
    store.setCurrentStep('set-routing')
    store.init(modelCode).catch((error) => message.error(getApiErrorMessage(error, `加载${title}题目路由失败`)))
  }, [modelCode, store, title])

  return (
    <BaseLayout
      listUrl={flow.listPath}
      submitFn={() => store.saveRouting()}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('题目路由已保存')
          editorFlow.goStep('edit-definition')
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={store.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={flow.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <QuestionRoutingWorkspace editor={routingEditor} warning="跳题路由可能跳过测评或计分关键题，请确认配置。" />
    </BaseLayout>
  )
})

export default BehaviorAbilityQuestionRouting
