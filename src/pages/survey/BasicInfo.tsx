import React from 'react'
import { useParams, useHistory } from 'react-router'
import { Form, message } from 'antd'
import { observer } from 'mobx-react-lite'

import './BasicInfo.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'
import { BasicInfoFormCard, useBasicInfoForm } from '@/components/questionnaire'
import { SURVEY_STEPS, getSurveyStepIndex } from '@/utils/steps'

const BasicInfo: React.FC = observer(() => {
  const history = useHistory()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()

  // 设置当前步骤
  React.useEffect(() => {
    surveyStore.setCurrentStep('create')
  }, [])

  // 使用通用的基本信息表单 Hook
  const { handleSave } = useBasicInfoForm({
    questionsheetid,
    store: surveyStore,
    api,
    form,
    type: 'survey'
  })

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

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SURVEY_STEPS[stepIndex]
    if (!step || !surveyStore.id) return

    // 根据步骤跳转到对应页面
    switch (step.key) {
    case 'create':
      history.push(`/survey/info/${surveyStore.id}`)
      break
    case 'edit-questions':
      history.push(`/survey/create/${surveyStore.id}/0`)
      break
    case 'set-routing':
      history.push(`/survey/routing/${surveyStore.id}`)
      break
    case 'publish':
      history.push(`/survey/publish/${surveyStore.id}`)
      break
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break', 'saveToNext']}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(surveyStore.currentStep)}
      onStepChange={handleStepChange}
      themeClass="survey-page-theme"
    >
      <div className='survey-info-container survey-page-theme'>
        <BasicInfoFormCard form={form} type='survey' />
      </div>
    </BaseLayout>
  )
})

export default BasicInfo
