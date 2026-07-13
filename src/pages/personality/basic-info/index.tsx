import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, message, Radio, Select, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import {
  personalityModelEditorStore,
  personalityModelStore,
  personalityEditorWorkflowStore,
  getPersonalityEditorFlowContext
} from '@/store/personality'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  PERSONALITY_STEPS,
  personalityEditorFlowConfig,
  useEditorFlow
} from '@/utils/editorFlow'
import {
  filterPersonalityAlgorithmOptions,
  normalizePersonalityAlgorithm,
  PERSONALITY_SUB_KIND
} from '@/constants/personalityScope'
import RepublishHint from '@/components/personality/RepublishHint'
import '../index.scss'

const { TextArea } = Input

const statusTag: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'default' },
  published: { label: '已发布', color: 'success' },
  archived: { label: '已归档', color: 'warning' }
}

const PersonalityBasicInfo: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const [form] = Form.useForm()
  const [algorithmOptions, setAlgorithmOptions] = useState<Array<{ value: string; label: string }>>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([])

  const flowCtx = getPersonalityEditorFlowContext()
  const editorFlow = useEditorFlow(
    personalityEditorFlowConfig,
    personalityModelStore.modelCode || (modelCode !== 'new' ? modelCode : undefined),
    flowCtx
  )

  useEffect(() => {
    personalityEditorWorkflowStore.setCurrentStep('create')
    const init = async () => {
      try {
        await personalityEditorWorkflowStore.initEditor(modelCode)
        const isNewModel = !personalityModelStore.modelCode
        form.setFieldsValue({
          customModelCode: personalityModelEditorStore.customModelCode,
          title: personalityModelStore.title,
          desc: personalityModelStore.desc,
          algorithm: normalizePersonalityAlgorithm(personalityModelStore.algorithm),
          subKind: PERSONALITY_SUB_KIND,
          category: personalityModelStore.category || undefined,
          tags: personalityModelStore.tags,
          ...(isNewModel ? {
            questionnaireStrategy: personalityModelEditorStore.questionnaireStrategy,
            bindQuestionnaireCode: personalityModelEditorStore.bindQuestionnaireCode
          } : {})
        })
      } catch {
        message.error('加载人格测评失败')
      }
    }
    const loadOptions = async () => {
      const [err, res] = await assessmentModelApi.getAssessmentModelOptions('typology')
      if (!err && res?.data) {
        setAlgorithmOptions(filterPersonalityAlgorithmOptions(res.data.algorithms))
        setCategoryOptions(res.data.categories)
      }
    }
    init()
    loadOptions()
  }, [modelCode, form])

  const handleSave = async () => {
    const values = await form.validateFields()
    personalityModelEditorStore.customModelCode = values.customModelCode || ''
    personalityModelEditorStore.title = values.title
    personalityModelEditorStore.desc = values.desc || ''
    personalityModelEditorStore.algorithm = normalizePersonalityAlgorithm(values.algorithm)
    personalityModelEditorStore.subKind = PERSONALITY_SUB_KIND
    personalityModelEditorStore.category = values.category || ''
    personalityModelEditorStore.tags = values.tags || []
    if (!personalityModelStore.modelCode) {
      personalityModelEditorStore.setQuestionnaireStrategy(values.questionnaireStrategy)
      personalityModelEditorStore.bindQuestionnaireCode = values.bindQuestionnaireCode || ''
    }
    return personalityEditorWorkflowStore.saveBasicInfoAndQuestionnaire()
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('人格测评基本信息保存成功')
      editorFlow.goStep('edit-questions')
    } else {
      message.error(getApiErrorMessage(error, '保存失败'))
    }
  }

  const handleInlineSave = () => {
    handleSave()
      .then(() => handleAfterSubmit('success', null))
      .catch((e) => handleAfterSubmit('fail', e))
  }

  const st = statusTag[personalityModelStore.status] || statusTag.draft

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
      <div className="personality-form-shell personality-page-theme">
        <RepublishHint
          status={personalityModelStore.status}
          message="该模型已发布，修改后需重新发布才会影响 C 端"
        />
        {personalityModelStore.isArchived ? (
          <Alert type="warning" showIcon style={{ marginBottom: 16, maxWidth: 860 }}
            message="归档模型仅可查看，不可编辑" />
        ) : null}

        <Card title="基本信息" className="personality-card" style={{ maxWidth: 860 }}
          extra={<Tag color={st.color}>{st.label}</Tag>}>
          <Form form={form} layout="vertical">
            {!personalityModelStore.modelCode ? (
              <Form.Item name="customModelCode" label="模型编码（可选）"
                extra="留空则由系统自动生成">
                <Input placeholder="例如：personality_mbti_v1" />
              </Form.Item>
            ) : (
              <Form.Item label="模型编码">
                <Input value={personalityModelStore.modelCode} disabled />
              </Form.Item>
            )}
            <Form.Item name="title" label="测评名称" rules={[{ required: true, message: '请输入测评名称' }]}>
              <Input placeholder="例如：青少年人格测评" />
            </Form.Item>
            <Form.Item name="desc" label="测评说明">
              <TextArea rows={4} placeholder="填写测评说明、适用场景或运营备注" />
            </Form.Item>
            <Form.Item name="algorithm" label="人格算法" rules={[{ required: true, message: '请选择算法' }]}>
              <Select options={algorithmOptions} placeholder="选择人格算法" />
            </Form.Item>
            <Form.Item label="模型类型">
              <Input value="人格探索 / 类型模型（typology）" disabled />
            </Form.Item>
            <Form.Item name="subKind" hidden initialValue={PERSONALITY_SUB_KIND}>
              <Input />
            </Form.Item>
            <Form.Item name="category" label="业务分类">
              <Select allowClear options={categoryOptions} placeholder="选择业务分类" />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="输入标签后回车" />
            </Form.Item>
            {personalityModelStore.modelCode ? (
              <Form.Item label="题目问卷编码">
                <Input value={personalityModelEditorStore.questionnaireCode || '—'} disabled />
              </Form.Item>
            ) : (
              <>
                <Form.Item name="questionnaireStrategy" label="题目问卷策略" initialValue="create">
                  <Radio.Group>
                    <Radio value="create">创建新题目问卷</Radio>
                    <Radio value="bind">绑定已有问卷</Radio>
                    <Radio value="copy" disabled>复制已有问卷（待后端支持）</Radio>
                  </Radio.Group>
                </Form.Item>
                <Form.Item noStyle shouldUpdate={(p, c) => p.questionnaireStrategy !== c.questionnaireStrategy}>
                  {({ getFieldValue }) => getFieldValue('questionnaireStrategy') === 'bind' ? (
                    <Form.Item name="bindQuestionnaireCode" label="问卷编码"
                      extra="仅支持绑定已发布状态的问卷"
                      rules={[{ required: true, message: '请输入问卷编码' }]}>
                      <Input placeholder="输入已有问卷 code" />
                    </Form.Item>
                  ) : null}
                </Form.Item>
              </>
            )}
            {personalityModelStore.canEdit ? (
              <Button type="primary" onClick={handleInlineSave}>
                保存并编辑题目
              </Button>
            ) : null}
          </Form>
        </Card>
      </div>
    </BaseLayout>
  )
})

export default PersonalityBasicInfo
