import React, { useEffect, useState } from 'react'
import { Alert, Button, message, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { ValidationIssuesPanel } from '@/features/assessment-editor'
import BehaviorAbilityDefinitionEditor from '@/components/behaviorAbility/BehaviorAbilityDefinitionEditor'
import type { BehaviorAbilityDefinitionTabKey } from '@/components/behaviorAbility/BehaviorAbilityDefinitionEditor'
import { behaviorAbilityStore } from '@/store/behaviorAbility'
import { behaviorAbilityEditorFlowConfig, buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'
import { resolveBehaviorAbilityIssueTab } from '@/utils/behaviorAbilityIssueRouter'

const BehaviorAbilityDefinition: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<BehaviorAbilityDefinitionTabKey | undefined>()
  const editorFlow = useEditorFlow(
    behaviorAbilityEditorFlowConfig,
    behaviorAbilityStore.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(behaviorAbilityStore)
  )

  useEffect(() => {
    behaviorAbilityStore.setCurrentStep('edit-definition')
    behaviorAbilityStore.init(modelCode).catch((error) => message.error(getApiErrorMessage(error, '加载模型定义失败')))
  }, [modelCode])

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    setActiveTab(tab === 'measure' || tab === 'execution' || tab === 'norm' || tab === 'json' ? tab : undefined)
  }, [location.search])

  return (
    <BaseLayout
      submitFn={() => behaviorAbilityStore.saveDefinition()}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('模型定义已保存')
          editorFlow.goStep('publish')
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={behaviorAbilityStore.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={behaviorAbilityEditorFlowConfig.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: 16 }}>
        <Space style={{ marginBottom: 12 }}>
          {behaviorAbilityStore.canEdit ? (
            <Button
              onClick={() => {
                const issues = behaviorAbilityStore.validateDefinition()
                if (issues.length) message.warning(`本地校验发现 ${issues.length} 项问题`)
                else message.success('本地校验通过')
              }}
            >
              本地校验
            </Button>
          ) : null}
        </Space>
        {behaviorAbilityStore.validationIssues.length ? (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 12 }}
            message="定义校验未通过"
            description={
              <ValidationIssuesPanel
                issues={behaviorAbilityStore.validationIssues}
                onIssueClick={(issue) => setActiveTab(resolveBehaviorAbilityIssueTab(issue))}
              />
            }
          />
        ) : null}
        <BehaviorAbilityDefinitionEditor
          definition={behaviorAbilityStore.definition}
          algorithm={behaviorAbilityStore.algorithm}
          questions={behaviorAbilityStore.questions}
          onChange={(definition) => behaviorAbilityStore.setDefinition(definition)}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </BaseLayout>
  )
})

export default BehaviorAbilityDefinition
