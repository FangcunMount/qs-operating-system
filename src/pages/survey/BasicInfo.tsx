import React, { useEffect } from 'react'
import { useParams, useHistory } from 'react-router'
import { Form, Input, Card, message } from 'antd'
import { observer } from 'mobx-react-lite'

import './BasicInfo.scss'
import '@/components/editorSteps/index.scss'
import { surveyStore } from '@/store'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'


const { TextArea } = Input

const BasicInfo: React.FC = observer(() => {
  const history = useHistory()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()

  // useEffect() 用于初始化问卷信息，区分编辑模式和创建模式
  useEffect(() => {
    const isEditMode = questionsheetid && questionsheetid !== 'new'
    
    if (isEditMode) {
      initEditMode(questionsheetid)
    } else {
      initCreateMode()
    }

  }, [questionsheetid])

  // 从 store 同步数据到表单
  const syncFormFromStore = () => {
    form.setFieldsValue({
      title: surveyStore.title,
      desc: surveyStore.desc,
      img_url: surveyStore.img_url
    })
  }

  // 加载已有问卷信息
  const loadExistingSurvey = async (id: string) => {
    const [e, r] = await api.getQuestionSheet(id)
    if (e) return
    surveyStore.setSurvey(r?.data.questionsheet)
    syncFormFromStore()
  }

  // 初始化编辑模式
  const initEditMode = (id: string) => {
    // 如果 store 中已有该问卷的数据，直接使用
    if (surveyStore.id === id && surveyStore.title) {
      syncFormFromStore()
    } else {
      // 从服务器加载问卷信息
      loadExistingSurvey(id)
    }
  }

  // 初始化新建模式
  const initCreateMode = () => {
    // 尝试从 localStorage 恢复数据
    const restored = surveyStore.loadFromLocalStorage()
    
    if (restored && surveyStore.title) {
      // 成功恢复数据
      message.success('已恢复上次编辑的内容')
      syncFormFromStore()
    } else if (!surveyStore.title) {
      // 首次创建，初始化空白问卷
      surveyStore.initSurvey()
    } else {
      // 从下一步返回，复用 store 中的数据
      syncFormFromStore()
    }
  }

  
  // 保存问卷基本信息
  const handleSave = async () => {
    const values = await form.validateFields()
    
    // 更新 store 中的数据
    surveyStore.title = values.title
    surveyStore.desc = values.desc
    surveyStore.img_url = values.img_url
    
    // 保存基本信息
    await surveyStore.saveBasicInfo()
  }

  // 保存后跳转到编辑问题页面
  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('问卷信息保存成功')
      surveyStore.nextStep()
      
      // 跳转到编辑问题页面
      if (surveyStore.id) {
        history.push(`/survey/create/${surveyStore.id}/0`)
      }
    }
    if (status === 'fail') {
      message.error(`问卷信息保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break', 'saveToNext']}
    >
      <div className='survey-info-container'>
        <Card title='问卷基本信息' bordered={false}>
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
              label='问卷标题'
              name='title'
              rules={[{ required: true, message: '请输入问卷标题' }]}
            >
              <Input placeholder='请输入问卷标题' maxLength={100} />
            </Form.Item>

            <Form.Item
              label='问卷描述'
              name='desc'
            >
              <TextArea
                placeholder='请输入问卷描述'
                rows={4}
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item
              label='问卷封面'
              name='img_url'
            >
              <Input placeholder="请输入图片URL" />
            </Form.Item>
          </Form>
        </Card>
      </div>
    </BaseLayout>
  )
})

export default BasicInfo
