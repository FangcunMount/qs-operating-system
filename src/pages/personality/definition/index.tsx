import React, { useEffect, useState } from 'react'
import { Alert, Button, message, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { useLocation, useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import PersonalityDefinitionEditor, {
  PersonalityDefinitionTabKey
} from '@/components/personality/definition/PersonalityDefinitionEditor'
import {
  personalityDefinitionStore,
  personalityModelStore,
  personalityModelEditorStore,
  personalityEditorWorkflowStore,
  getPersonalityEditorFlowContext
} from '@/store/personality'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  PERSONALITY_STEPS,
  personalityEditorFlowConfig,
  useEditorFlow
} from '@/utils/editorFlow'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'
import { DefinitionV2 } from '@/models/definitionV2'
import '../index.scss'

const PersonalityDefinition: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const location = useLocation()
  const [spec, setSpec] = useState<PersonalityTypologyRuntimeSpec>(personalityModelStore.runtimeSpec)
  const [definition, setDefinition] = useState<DefinitionV2>(personalityDefinitionStore.definition)
  const [activeTab, setActiveTab] = useState<PersonalityDefinitionTabKey>('factor_graph')
  const flowCtx = getPersonalityEditorFlowContext()
  const editorFlow = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode, flowCtx)

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab') as PersonalityDefinitionTabKey | null
    if (tab) setActiveTab(tab)
  }, [location.search])

  useEffect(() => {
    personalityEditorWorkflowStore.setCurrentStep('edit-definition')
    const init = async () => {
      try {
        await personalityEditorWorkflowStore.initEditor(modelCode)
        setSpec(personalityModelStore.runtimeSpec)
        setDefinition(personalityDefinitionStore.definition)
      } catch {
        message.error('加载人格测评定义失败')
      }
    }
    init()
  }, [modelCode])

  const handleSave = async () => {
    personalityEditorWorkflowStore.setRuntimeSpec(spec)
    await personalityEditorWorkflowStore.saveAndValidateDefinition()
  }

  const handleSaveDraft = async () => {
    personalityEditorWorkflowStore.setRuntimeSpec(spec)
    await personalityEditorWorkflowStore.saveDefinitionDraft()
    message.success('模型定义草稿已保存')
  }

  const handleSpecChange = (next: PersonalityTypologyRuntimeSpec) => {
    setSpec(next)
    personalityEditorWorkflowStore.setRuntimeSpec(next)
    setDefinition(personalityDefinitionStore.definition)
  }

  const handleDefinitionChange = (next: DefinitionV2) => {
    personalityDefinitionStore.setDefinition(
      next,
      personalityModelEditorStore.questionnaireCode,
      personalityModelEditorStore.questionnaireVersion
    )
    setDefinition(personalityDefinitionStore.definition)
    setSpec(personalityDefinitionStore.runtimeSpec)
  }

  const handleLocalValidate = () => {
    personalityEditorWorkflowStore.setRuntimeSpec(spec)
    const issues = personalityEditorWorkflowStore.validateDefinition()
    if (issues.length === 0) {
      message.success('本地校验通过')
    } else {
      message.warning(`本地校验发现 ${issues.length} 项问题`)
    }
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
        <Space style={{ marginBottom: 16 }}>
          {personalityModelStore.canEdit ? (
            <Button onClick={handleLocalValidate}>本地校验</Button>
          ) : null}
        </Space>

        {personalityDefinitionStore.validationIssues.length > 0 ? (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message="定义校验未通过"
            description={personalityDefinitionStore.validationIssues.map((i) => `${i.field}: ${i.message}`).join('；')} />
        ) : null}

        <PersonalityDefinitionEditor
          definition={definition}
          spec={spec}
          algorithm={personalityModelStore.algorithm}
          questions={personalityModelStore.questions}
          onDefinitionChange={handleDefinitionChange}
          onSpecChange={handleSpecChange}
          onApplyOutcomeCode={applyOutcomeCode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </BaseLayout>
  )
})

export default PersonalityDefinition
