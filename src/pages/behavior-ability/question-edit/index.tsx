import React, { useEffect, useMemo } from 'react'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { createBehaviorAbilityQuestionnairePort, QuestionEditorWorkspace, validateQuestionList } from '@/features/assessment-editor'
import { buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'
import { getAbilityEditorProduct } from '../product'

const BehaviorAbilityQuestionEdit: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const location = useLocation()
  const { store, flow, title } = getAbilityEditorProduct(location.pathname)
  const questionnaireEditor = useMemo(() => createBehaviorAbilityQuestionnairePort(store), [store])
  const editorFlow = useEditorFlow(
    flow,
    store.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(store)
  )

  useEffect(() => {
    store.setCurrentStep('edit-questions')
    store.init(modelCode).catch((error) => message.error(getApiErrorMessage(error, `加载${title}题目失败`)))
  }, [modelCode, store, title])

  const save = async () => store.saveQuestions()

  return (
    <BaseLayout
      listUrl={flow.listPath}
      beforeSubmit={() => validateQuestionList(store.questions)}
      submitFn={save}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('题目已保存')
          editorFlow.goStep('set-routing')
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={store.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={flow.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <QuestionEditorWorkspace editor={questionnaireEditor} />
    </BaseLayout>
  )
})

export default BehaviorAbilityQuestionEdit
