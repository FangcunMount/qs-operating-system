import React, { useEffect, useState } from 'react'
import { Alert, message } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import PersonalityDefinitionEditor, {
  PersonalityDefinitionTabKey
} from '@/components/personality/definition/PersonalityDefinitionEditor'
import { personalityDefinitionStore, personalityModelStore } from '@/store/personality'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  buildPersonalityFlowContext,
  PERSONALITY_STEPS,
  personalityEditorFlowConfig,
  useEditorFlow
} from '@/utils/editorFlow'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import '../index.scss'

const PersonalityDefinition: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const location = useLocation()
  const [spec, setSpec] = useState<PersonalityTypologyRuntimeSpec>(personalityModelStore.runtimeSpec)
  const [activeTab, setActiveTab] = useState<PersonalityDefinitionTabKey>('factor_graph')
  const flowCtx = buildPersonalityFlowContext(personalityModelStore)
  const editorFlow = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode, flowCtx)

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab') as PersonalityDefinitionTabKey | null
    if (tab) setActiveTab(tab)
  }, [location.search])

  useEffect(() => {
    personalityModelStore.setCurrentStep('edit-definition')
    const init = async () => {
      try {
        await personalityModelStore.initEditor(modelCode)
        setSpec(personalityModelStore.runtimeSpec)
      } catch {
        message.error('加载人格测评定义失败')
      }
    }
    init()
  }, [modelCode])

  const handleSave = async () => {
    personalityModelStore.setRuntimeSpec(spec)
    await personalityModelStore.saveAndValidateDefinition()
  }

  const handleSaveDraft = async () => {
    personalityModelStore.setRuntimeSpec(spec)
    await personalityModelStore.saveDraftDefinition()
    message.success('模型定义草稿已保存')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('模型定义保存成功')
      editorFlow.goStep('publish')
    } else {
      message.error(getApiErrorMessage(error, '保存失败'))
    }
  }

  const applyOutcomeCode = async () => {
    if (!personalityModelStore.modelCode) return `outcome_${Date.now().toString(36)}`
    return personalityDefinitionStore.applyCode(personalityModelStore.modelCode, 'outcome')
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      saveDraftFn={handleSaveDraft}
      afterSubmit={handleAfterSubmit}
      footerButtons={personalityModelStore.canEdit ? ['backToList', 'break', 'saveDraft', 'saveToNext'] : ['backToList']}
      steps={PERSONALITY_STEPS}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-definition-shell personality-page-theme">
        {personalityDefinitionStore.validationIssues.length > 0 ? (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message="定义校验未通过"
            description={personalityDefinitionStore.validationIssues.map((i) => `${i.field}: ${i.message}`).join('；')} />
        ) : null}

        <PersonalityDefinitionEditor
          spec={spec}
          algorithm={personalityModelStore.algorithm}
          questions={personalityModelStore.questions}
          onChange={setSpec}
          onApplyOutcomeCode={applyOutcomeCode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </BaseLayout>
  )
})

export default PersonalityDefinition
