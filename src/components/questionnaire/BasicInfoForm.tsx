import React, { useEffect } from 'react'
import { Form, Input, Card, message } from 'antd'
import { FormInstance } from 'antd/lib/form'

const { TextArea } = Input

export interface QuestionnaireBasicInfoProps {
  questionsheetid: string
  store: any
  api: any
  form: FormInstance
  onSaveSuccess: () => void
  type: 'survey' | 'scale'
}

export interface UseBasicInfoFormParams {
  questionsheetid: string
  store: any
  api: any
  form: FormInstance
  type: 'survey' | 'scale'
}

/**
 * 通用的基本信息表单 Hook
 * 适用于 survey 和 scale 两种问卷类型
 */
export const useBasicInfoForm = ({
  questionsheetid,
  store,
  api,
  form,
  type
}: UseBasicInfoFormParams): {
  handleSave: () => Promise<void>
  syncFormFromStore: () => void
} => {
  // 从 store 同步数据到表单
  const syncFormFromStore = () => {
    form.setFieldsValue({
      title: store.title,
      desc: store.desc,
      img_url: store.img_url
    })
  }

  // 加载已有问卷信息
  const loadExisting = async (id: string) => {
    const [e, r] = await api.getQuestionSheet(id)
    if (e) return
    if (type === 'survey') {
      store.setSurvey(r?.data.questionsheet)
    } else {
      store.setScale(r?.data.questionsheet)
    }
    syncFormFromStore()
  }

  // 初始化编辑模式
  const initEditMode = (id: string) => {
    // 如果 store 中已有该问卷的数据，直接使用
    if (store.id === id && store.title) {
      syncFormFromStore()
    } else {
      // 从服务器加载问卷信息
      loadExisting(id)
    }
  }

  // 初始化新建模式
  const initCreateMode = () => {
    // 尝试从 localStorage 恢复数据
    const restored = store.loadFromLocalStorage()
    
    if (restored && store.title) {
      // 成功恢复数据
      message.success('已恢复上次编辑的内容')
      syncFormFromStore()
    } else if (!store.title) {
      // 首次创建，初始化空白问卷
      if (type === 'survey') {
        store.initSurvey()
      } else {
        store.initScale()
      }
    } else {
      // 从下一步返回，复用 store 中的数据
      syncFormFromStore()
    }
  }

  // 初始化
  useEffect(() => {
    const isEditMode = questionsheetid && questionsheetid !== 'new'
    
    if (isEditMode) {
      initEditMode(questionsheetid)
    } else {
      initCreateMode()
    }
  }, [questionsheetid])

  // 保存问卷基本信息
  const handleSave = async () => {
    const values = await form.validateFields()
    
    // 更新 store 中的数据
    store.title = values.title
    store.desc = values.desc
    store.img_url = values.img_url
    
    // 保存基本信息
    await store.saveBasicInfo()
  }

  return {
    handleSave,
    syncFormFromStore
  }
}

/**
 * 通用的基本信息表单组件
 */
export const BasicInfoFormCard: React.FC<{
  form: FormInstance
  type: 'survey' | 'scale'
}> = ({ form, type }) => {
  const typeText = type === 'survey' ? '问卷' : '量表'
  const themeClass = type === 'survey' ? 'survey-theme' : 'scale-theme'

  return (
    <Card title={`${typeText}基本信息`} bordered={false} className={themeClass}>
      <Form
        form={form}
        layout='vertical'
        initialValues={{
          title: '',
          desc: '',
          img_url: ''
        }}
      >
        <Form.Item
          label={`${typeText}标题`}
          name='title'
          rules={[{ required: true, message: `请输入${typeText}标题` }]}
        >
          <Input placeholder={`请输入${typeText}标题`} maxLength={100} />
        </Form.Item>

        <Form.Item
          label={`${typeText}描述`}
          name='desc'
        >
          <TextArea
            placeholder={`请输入${typeText}描述`}
            rows={4}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Form.Item
          label={`${typeText}封面`}
          name='img_url'
        >
          <Input placeholder="请输入图片URL" />
        </Form.Item>
      </Form>
    </Card>
  )
}

export default BasicInfoFormCard
