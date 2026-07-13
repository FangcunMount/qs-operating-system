import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, message, Radio, Select, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { useHistory, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { BEHAVIOR_ABILITY_MODEL_PROFILES } from '@/constants/behaviorAbility'
import type { BehaviorAbilityAlgorithm } from '@/constants/behaviorAbility'
import { behaviorAbilityStore } from '@/store/behaviorAbility'
import { behaviorAbilityEditorFlowConfig, buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'

const BehaviorAbilityBasicInfo: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const history = useHistory()
  const [form] = Form.useForm()
  const [available, setAvailable] = useState<Set<string>>(new Set())
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const editorFlow = useEditorFlow(
    behaviorAbilityEditorFlowConfig,
    behaviorAbilityStore.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(behaviorAbilityStore)
  )

  useEffect(() => {
    const load = async () => {
      try {
        await behaviorAbilityStore.init(modelCode)
        form.setFieldsValue({
          code: behaviorAbilityStore.customModelCode,
          title: behaviorAbilityStore.title,
          description: behaviorAbilityStore.description,
          profile: behaviorAbilityStore.profile?.algorithm,
          category: behaviorAbilityStore.category || undefined,
          tags: behaviorAbilityStore.tags,
          questionnaireStrategy: behaviorAbilityStore.questionnaireStrategy,
          bindQuestionnaireCode: behaviorAbilityStore.bindQuestionnaireCode
        })
        const [brief, spm] = await Promise.all([
          assessmentModelApi.getAssessmentModelOptions('behavioral_rating'),
          assessmentModelApi.getAssessmentModelOptions('cognitive')
        ])
        const next = new Set<string>()
        const supports = (data: any, kind: string, algorithm: string) =>
          data?.kinds?.some((item: any) => item.value === kind) &&
          data?.algorithms?.some((item: any) => item.value === algorithm) &&
          data?.product_channels?.some((item: any) => item.value === 'behavior_ability')
        if (!brief[0] && supports(brief[1]?.data, 'behavioral_rating', 'brief2')) next.add('brief2')
        if (!spm[0] && supports(spm[1]?.data, 'cognitive', 'spm')) next.add('spm')
        setAvailable(next)
        setOptionsLoaded(true)
      } catch (error) {
        message.error(getApiErrorMessage(error, '加载行为能力测评失败'))
      }
    }
    load()
  }, [modelCode, form])

  const save = async () => {
    const values = await form.validateFields()
    behaviorAbilityStore.customModelCode = values.code || ''
    behaviorAbilityStore.title = values.title
    behaviorAbilityStore.description = values.description || ''
    behaviorAbilityStore.category = values.category || ''
    behaviorAbilityStore.tags = values.tags || []
    behaviorAbilityStore.questionnaireStrategy = values.questionnaireStrategy || 'create'
    behaviorAbilityStore.bindQuestionnaireCode = values.bindQuestionnaireCode || ''
    if (!behaviorAbilityStore.modelCode) behaviorAbilityStore.setProfile(values.profile as BehaviorAbilityAlgorithm)
    return behaviorAbilityStore.saveBasicInfo()
  }

  return (
    <BaseLayout
      submitFn={save}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('基本信息已保存')
          history.push(behaviorAbilityEditorFlowConfig.getPathForStep('edit-questions', behaviorAbilityStore.modelCode))
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={behaviorAbilityStore.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={behaviorAbilityEditorFlowConfig.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {behaviorAbilityStore.isArchived ? <Alert type="warning" showIcon message="归档模型仅可查看" style={{ marginBottom: 16 }} /> : null}
        <Card title="行为能力测评基本信息">
          <Form form={form} layout="vertical">
            {!behaviorAbilityStore.modelCode ? (
              <Form.Item name="code" label="模型编码（可选）">
                <Input placeholder="例如 BRIEF2_PARENT_CN" />
              </Form.Item>
            ) : (
              <Form.Item label="模型编码">
                <Input disabled value={behaviorAbilityStore.modelCode} />
              </Form.Item>
            )}
            <Form.Item name="title" label="测评名称" rules={[{ required: true, message: '请输入测评名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="测评说明">
              <Input.TextArea rows={3} />
            </Form.Item>
            {!behaviorAbilityStore.modelCode ? (
              <Form.Item name="profile" label="测评类型" rules={[{ required: true, message: '请选择 BRIEF-2 或 SPM' }]}>
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {BEHAVIOR_ABILITY_MODEL_PROFILES.map((profile) => (
                      <Card
                        key={profile.algorithm}
                        size="small"
                        hoverable={!optionsLoaded || available.has(profile.algorithm)}
                        style={{ opacity: optionsLoaded && !available.has(profile.algorithm) ? 0.5 : 1 }}
                      >
                        <Radio value={profile.algorithm} disabled={optionsLoaded && !available.has(profile.algorithm)}>
                          {profile.label}（{profile.kind} / {profile.algorithm}）
                        </Radio>
                      </Card>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>
            ) : (
              <Form.Item label="测评类型">
                <Input
                  disabled
                  value={`${behaviorAbilityStore.profile?.label || ''}（${behaviorAbilityStore.kind} / ${behaviorAbilityStore.algorithm}）`}
                />
              </Form.Item>
            )}
            <Form.Item name="category" label="业务分类">
              <Input />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" />
            </Form.Item>
            {!behaviorAbilityStore.modelCode ? (
              <>
                <Form.Item name="questionnaireStrategy" label="题目问卷" initialValue="create">
                  <Radio.Group>
                    <Radio value="create">新建普通问卷</Radio>
                    <Radio value="bind">绑定已发布问卷</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(prev, current) => prev.questionnaireStrategy !== current.questionnaireStrategy}>
                  {({ getFieldValue }) =>
                    getFieldValue('questionnaireStrategy') === 'bind' ? (
                      <Form.Item name="bindQuestionnaireCode" label="问卷编码" rules={[{ required: true, message: '请输入已发布问卷编码' }]}>
                        <Input />
                      </Form.Item>
                    ) : null
                  }
                </Form.Item>
              </>
            ) : (
              <Form.Item label="绑定问卷">
                <Input disabled value={behaviorAbilityStore.questionnaireCode || '—'} />
              </Form.Item>
            )}
            {behaviorAbilityStore.canEdit ? (
              <Button
                type="primary"
                onClick={() =>
                  save()
                    .then(() => history.push(behaviorAbilityEditorFlowConfig.getPathForStep('edit-questions', behaviorAbilityStore.modelCode)))
                    .catch((error) => message.error(getApiErrorMessage(error, '保存失败')))
                }
              >
                保存并编辑题目
              </Button>
            ) : null}
          </Form>
        </Card>
      </div>
    </BaseLayout>
  )
})

export default BehaviorAbilityBasicInfo
