import React, { useEffect, useState } from 'react'
import { Button, Card, Form, Input, message, Select } from 'antd'
import { observer } from 'mobx-react-lite'
import { useParams, useHistory } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { personalityModelStore } from '@/store'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import '../index.scss'

const { TextArea } = Input

const PersonalityBasicInfo: React.FC = observer(() => {
  const history = useHistory()
  const { modelCode } = useParams<{ modelCode: string }>()
  const [form] = Form.useForm()
  const [algorithmOptions, setAlgorithmOptions] = useState<Array<{ value: string; label: string }>>([])
  const [categoryOptions, setCategoryOptions] = useState<Array<{ value: string; label: string }>>([])
  const { currentStepIndex, handleStepChange } = useEditorFlow(
    personalityEditorFlowConfig,
    personalityModelStore.modelCode || (modelCode !== 'new' ? modelCode : undefined)
  )

  useEffect(() => {
    personalityModelStore.setCurrentStep('create')

    const init = async () => {
      try {
        await personalityModelStore.initEditor(modelCode)
        form.setFieldsValue({
          title: personalityModelStore.title,
          desc: personalityModelStore.desc,
          algorithm: personalityModelStore.algorithm,
          subKind: personalityModelStore.subKind,
          category: personalityModelStore.category || undefined,
          tags: personalityModelStore.tags
        })
      } catch (error) {
        message.error('加载人格测评失败')
      }
    }

    const loadOptions = async () => {
      const [err, res] = await assessmentModelApi.getAssessmentModelOptions('personality')
      if (!err && res?.data) {
        setAlgorithmOptions(res.data.algorithms)
        setCategoryOptions(res.data.categories)
      }
    }

    init()
    loadOptions()
  }, [modelCode, form])

  const handleSave = async () => {
    const values = await form.validateFields()
    personalityModelStore.title = values.title
    personalityModelStore.desc = values.desc || ''
    personalityModelStore.algorithm = values.algorithm || 'typology_v1'
    personalityModelStore.subKind = values.subKind || 'typology'
    personalityModelStore.category = values.category || ''
    personalityModelStore.tags = values.tags || []
    const nextModelCode = await personalityModelStore.saveBasicInfo()
    return nextModelCode
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('人格测评基本信息保存成功')
      history.push(`/personality/create/${personalityModelStore.modelCode}/0`)
    } else {
      message.error(`保存失败 -- ${error?.errmsg || error?.message || error}`)
    }
  }

  const handleInlineSave = () => {
    handleSave()
      .then(() => handleAfterSubmit('success', null))
      .catch((error) => handleAfterSubmit('fail', error))
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      steps={PERSONALITY_STEPS}
      currentStep={currentStepIndex}
      onStepChange={handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-form-shell personality-page-theme">
        <Card title="基本信息" className="personality-card" style={{ maxWidth: 860 }}>
          <Form form={form} layout="vertical">
            <Form.Item name="title" label="测评名称" rules={[{ required: true, message: '请输入测评名称' }]}>
              <Input placeholder="例如：青少年人格测评" />
            </Form.Item>
            <Form.Item name="desc" label="测评说明">
              <TextArea rows={4} placeholder="填写测评说明、适用场景或运营备注" />
            </Form.Item>
            <Form.Item name="algorithm" label="算法">
              <Select
                options={algorithmOptions.length > 0 ? algorithmOptions : [{ value: 'typology_v1', label: '人格类型 v1' }]}
                placeholder="选择算法"
              />
            </Form.Item>
            <Form.Item name="subKind" label="分类模型">
              <Select
                options={[{ value: 'typology', label: '类型模型' }]}
                placeholder="选择分类模型"
              />
            </Form.Item>
            <Form.Item name="category" label="业务分类">
              <Select allowClear options={categoryOptions} placeholder="选择业务分类" />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" placeholder="输入标签后回车" />
            </Form.Item>
            <Button type="primary" onClick={handleInlineSave}>
              保存并编辑题目
            </Button>
          </Form>
        </Card>
      </div>
    </BaseLayout>
  )
})

export default PersonalityBasicInfo
