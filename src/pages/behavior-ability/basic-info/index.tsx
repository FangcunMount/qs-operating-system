import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Input, message, Radio, Select, Space } from 'antd'
import { observer } from 'mobx-react-lite'
import { useHistory, useLocation, useParams } from 'react-router-dom'
import BaseLayout from '@/components/layout/BaseLayout'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import type { BehaviorAbilityAlgorithm } from '@/constants/behaviorAbility'
import { buildBehaviorAbilityFlowContext } from '@/utils/behaviorAbilityFlow'
import { useEditorFlow } from '@/utils/editorFlow'
import { getApiErrorMessage } from '@/utils/apiError'
import { getAbilityEditorProduct } from '../product'

const BehaviorAbilityBasicInfo: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string }>()
  const history = useHistory()
  const location = useLocation()
  const product = getAbilityEditorProduct(location.pathname)
  const { store, flow, profiles } = product
  const [form] = Form.useForm()
  const [available, setAvailable] = useState<Set<string>>(new Set())
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const editorFlow = useEditorFlow(
    flow,
    store.modelCode || modelCode,
    buildBehaviorAbilityFlowContext(store)
  )

  useEffect(() => {
    const load = async () => {
      try {
        await store.init(modelCode)
        form.setFieldsValue({
          code: store.customModelCode,
          title: store.title,
          description: store.description,
          profile: store.profile?.algorithm || (profiles.length === 1 ? profiles[0].algorithm : undefined),
          category: store.category || undefined,
          tags: store.tags,
          questionnaireStrategy: store.questionnaireStrategy,
          bindQuestionnaireCode: store.bindQuestionnaireCode
        })
        const optionResponse = await assessmentModelApi.getAssessmentModelOptions(product.kind)
        const next = new Set<string>()
        if (!optionResponse[0]) {
          const algorithms = new Set(optionResponse[1]?.data?.algorithms?.map((item) => item.value) || [])
          profiles.forEach((profile) => {
            if (algorithms.has(profile.algorithm)) next.add(profile.algorithm)
          })
        }
        setAvailable(next)
        setOptionsLoaded(true)
      } catch (error) {
        message.error(getApiErrorMessage(error, `加载${product.title}失败`))
      }
    }
    load()
  }, [modelCode, form, product, profiles, store])

  const save = async () => {
    const values = await form.validateFields()
    store.customModelCode = values.code || ''
    store.title = values.title
    store.description = values.description || ''
    store.category = values.category || ''
    store.tags = values.tags || []
    store.questionnaireStrategy = values.questionnaireStrategy || 'create'
    store.bindQuestionnaireCode = values.bindQuestionnaireCode || ''
    if (!store.modelCode) store.setProfile(values.profile as BehaviorAbilityAlgorithm)
    return store.saveBasicInfo()
  }

  return (
    <BaseLayout
      listUrl={flow.listPath}
      submitFn={save}
      afterSubmit={(status, error) => {
        if (status === 'success') {
          message.success('基本信息已保存')
          history.push(flow.getPathForStep('edit-questions', store.modelCode))
        } else message.error(getApiErrorMessage(error, '保存失败'))
      }}
      footerButtons={store.canEdit ? ['backToList', 'break', 'saveToNext'] : ['backToList']}
      steps={flow.steps}
      currentStep={editorFlow.currentStepIndex}
      onStepChange={editorFlow.handleStepChange}
      themeClass="behavior-ability-page-theme"
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {store.isArchived ? <Alert type="warning" showIcon message="归档模型仅可查看" style={{ marginBottom: 16 }} /> : null}
        <Card title={`${product.title}基本信息`}>
          <Form form={form} layout="vertical">
            {!store.modelCode ? (
              <Form.Item
                name="code"
                label="模型编码"
                extra="创建后不可修改，建议使用稳定、可读的英文编码"
                rules={[{ required: true, whitespace: true, message: '请输入模型编码' }]}
              >
                <Input placeholder={product.kind === 'cognitive' ? '例如 SPM_REASONING_CN' : '例如 BRIEF2_PARENT_CN'} />
              </Form.Item>
            ) : (
              <Form.Item label="模型编码">
                <Input disabled value={store.modelCode} />
              </Form.Item>
            )}
            <Form.Item name="title" label="测评名称" rules={[{ required: true, message: '请输入测评名称' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label="测评说明">
              <Input.TextArea rows={3} />
            </Form.Item>
            {!store.modelCode ? (
              <Form.Item name="profile" label="测评类型" rules={[{ required: true, message: '请选择测评类型' }]}>
                <Radio.Group style={{ width: '100%' }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {profiles.map((profile) => (
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
                  value={`${store.profile?.label || ''}（${store.kind} / ${store.algorithm}）`}
                />
              </Form.Item>
            )}
            <Form.Item name="category" label="业务分类">
              <Input />
            </Form.Item>
            <Form.Item name="tags" label="标签">
              <Select mode="tags" />
            </Form.Item>
            {!store.modelCode ? (
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
                <Input disabled value={store.questionnaireCode || '—'} />
              </Form.Item>
            )}
            {store.canEdit ? (
              <Button
                type="primary"
                onClick={() =>
                  save()
                    .then(() => history.push(flow.getPathForStep('edit-questions', store.modelCode)))
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
