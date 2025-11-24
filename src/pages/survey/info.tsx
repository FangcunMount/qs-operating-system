import React, { useEffect } from 'react'
import { useParams, useHistory } from 'react-router'
import { Form, Input, Card, message } from 'antd'
import { observer } from 'mobx-react-lite'

import './info.scss'
import '@/components/editorSteps/index.scss'
import { surveyStore } from '@/store'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'


const { TextArea } = Input

const SurveyInfo: React.FC = observer(() => {
  const history = useHistory()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()

  useEffect(() => {
    if (questionsheetid && questionsheetid !== 'new') {
      // 加载现有问卷信息
      (async () => {
        const [e, r] = await api.getQuestionSheet(questionsheetid)
        if (e) return
        surveyStore.setSurvey(r?.data.questionsheet)
        form.setFieldsValue({
          title: surveyStore.title,
          desc: surveyStore.desc,
          img_url: surveyStore.img_url
        })
      })()
    } else {
      // 新建问卷
      surveyStore.initSurvey()
    }
  }, [questionsheetid])

  const handleSave = async () => {
    const values = await form.validateFields()
    
    // 更新 store 中的数据
    surveyStore.title = values.title
    surveyStore.desc = values.desc
    surveyStore.img_url = values.img_url
    
    // 保存基本信息
    await surveyStore.saveBasicInfo()
  }

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
      footerButtons={['break', 'breakToQsList', 'saveToNext']}
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

export default SurveyInfo
