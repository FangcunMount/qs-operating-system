import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, message, Radio, Select, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { personalityModelEditorStore, personalityModelStore } from '@/store/personality'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  buildPersonalityFlowContext,
  PERSONALITY_STEPS,
  personalityEditorFlowConfig,
  useEditorFlow
} from '@/utils/editorFlow'
import { needsRepublishHint } from '@/utils/personalityPermissions'
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
  const [subKindOptions, setSubKindOptions] = useState<Array<{ value: string; label: string }>>([])

  const flowCtx = buildPersonalityFlowContext(personalityModelStore)
  const editorFlow = useEditorFlow(
    personalityEditorFlowConfig,
    personalityModelStore.modelCode || (modelCode !== 'new' ? modelCode : undefined),
    flowCtx
  )

  useEffect(() => {
    personalityModelStore.setCurrentStep('create')
    const init = async () => {
      try {
        await personalityModelStore.initEditor(modelCode)
        form.setFieldsValue({
          customModelCode: personalityModelEditorStore.customModelCode,
          title: personalityModelStore.title,
          desc: personalityModelStore.desc,
          algorithm: personalityModelStore.algorithm,
          subKind: personalityModelStore.subKind,
          category: personalityModelStore.category || undefined,
          tags: personalityModelStore.tags,
          questionnaireStrategy: personalityModelEditorStore.questionnaireStrategy,
          bindQuestionnaireCode: personalityModelEditorStore.bindQuestionnaireCode
        })
      } catch {
        message.error('加载人格测评失败')
      }
    }
    const loadOptions = async () => {
      const [err, res] = await assessmentModelApi.getAssessmentModelOptions('personality')
      if (!err && res?.data) {
        setAlgorithmOptions(res.data.algorithms.length > 0 ? res.data.algorithms : [
          { value: 'mbti', label: 'MBTI' },
          { value: 'sbti', label: 'SBTI' },
          { value: 'bigfive', label: 'Big Five' },
          { value: 'custom_typology', label: '自定义类型' }
        ])
        setCategoryOptions(res.data.categories)
        setSubKindOptions(res.data.sub_kinds.length > 0 ? res.data.sub_kinds : [
          { value: 'typology', label: '类型模型' },
          { value: 'dimension_score', label: '维度计分' }
        ])
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
    personalityModelEditorStore.algorithm = values.algorithm
    personalityModelEditorStore.subKind = values.subKind
    personalityModelEditorStore.category = values.category || ''
    personalityModelEditorStore.tags = values.tags || []
    personalityModelEditorStore.setQuestionnaireStrategy(values.questionnaireStrategy)
    personalityModelEditorStore.bindQuestionnaireCode = values.bindQuestionnaireCode || ''
    return personalityModelStore.saveBasicInfo()
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
        {needsRepublishHint({ status: personalityModelStore.status }) ? (
          <Alert type="info" showIcon style={{ marginBottom: 16, maxWidth: 860 }}
            message="该模型已发布，修改后需重新发布才会影响 C 端" />
        ) : null}
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
            <Form.Item name="algorithm" label="算法" rules={[{ required: true, message: '请选择算法' }]}>
              <Select options={algorithmOptions} placeholder="选择算法" />
            </Form.Item>
            <Form.Item name="subKind" label="分类模型" rules={[{ required: true, message: '请选择分类模型' }]}>
              <Select options={subKindOptions} placeholder="选择分类模型" />
            </Form.Item>
            <Form.Item name="category" label="业务分类">
              <Select allowClear options={categoryOptions} placeholder="选择业务分类" />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="输入标签后回车" />
            </Form.Item>
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
                  rules={[{ required: true, message: '请输入问卷编码' }]}>
                  <Input placeholder="输入已有问卷 code" />
                </Form.Item>
              ) : null}
            </Form.Item>
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
