import React, { useEffect, useState } from 'react'
import { Alert, Button, message, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { ValidationIssuesPanel } from '@/features/assessment-editor'
import BehaviorAbilityDefinitionEditor from '@/components/behaviorAbility/BehaviorAbilityDefinitionEditor'
import type { BehaviorAbilityDefinitionTabKey } from '@/components/behaviorAbility/BehaviorAbilityDefinitionEditor'
import { normalizeBehaviorAbilityDefinitionTab } from '@/components/behaviorAbility/BehaviorAbilityDefinitionEditor'
import { buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'
import { resolveBehaviorAbilityIssueTab } from '@/utils/behaviorAbilityIssueRouter'
import { getAbilityEditorProduct } from '../product'

const BehaviorAbilityDefinition: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const location = useLocation()
  const { store, flow, title } = getAbilityEditorProduct(location.pathname)
  const [activeTab, setActiveTab] = useState<BehaviorAbilityDefinitionTabKey | undefined>()
  const editorFlow = useEditorFlow(
    flow,
    store.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(store)
  )

  useEffect(() => {
    store.setCurrentStep('edit-definition')
    store.init(modelCode).catch((error) => message.error(getApiErrorMessage(error, `加载${title}定义失败`)))
  }, [modelCode, store, title])

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    setActiveTab(normalizeBehaviorAbilityDefinitionTab(tab || undefined))
  }, [location.search])

  return (
    <BaseLayout
      listUrl={flow.listPath}
      submitFn={() => store.saveDefinition()}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('模型定义已保存')
          editorFlow.goStep('publish')
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={store.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={flow.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          {store.canEdit ? (
            <Button
              onClick={() => {
                const issues = store.validateDefinition()
                if (issues.length) message.warning(`本地校验发现 ${issues.length} 项问题`)
                else message.success('本地校验通过')
              }}
            >
              本地校验
            </Button>
          ) : null}
        </Space>
        {store.validationIssues.length ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="定义校验未通过"
            description={
              <ValidationIssuesPanel
                issues={store.validationIssues}
                onIssueClick={(issue) => setActiveTab(resolveBehaviorAbilityIssueTab(issue))}
              />
            }
          />
        ) : null}
        <BehaviorAbilityDefinitionEditor
          definition={store.definition}
          algorithm={store.algorithm}
          questions={store.questions}
          onChange={(definition) => store.setDefinition(definition)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </BaseLayout>
  )
})

export default BehaviorAbilityDefinition
