import React from 'react'
import { useParams, useLocation } from 'react-router'
import { Form, message } from 'antd'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'
import { BasicInfoFormCard, useBasicInfoForm } from '@/components/questionnaire'
import { SURVEY_STEPS, getSurveyStepIndex, getSurveyStepFromPath } from '@/utils/steps'
import { useSurveySteps } from '../hooks'

const BasicInfo: React.FC = observer(() => {
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()
  const { handleStepChange, navigateToStep } = useSurveySteps()

  // 根据路由自动设置当前步骤
  React.useEffect(() => {
    surveyStore.setCurrentStep('create')
  }, [location.pathname])

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
        navigateToStep('edit-questions', surveyStore.id)
      }
    }
    if (status === 'fail') {
      message.error(`问卷信息保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  // 步骤跳转处理（使用统一的步骤导航）
  const onStepChange = (stepIndex: number) => {
    if (surveyStore.id) {
      handleStepChange(stepIndex, surveyStore.id)
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(getSurveyStepFromPath(location.pathname) || 'create')}
      onStepChange={onStepChange}
      themeClass="survey-page-theme"
    >
      <div className='survey-info-container survey-page-theme'>
        <BasicInfoFormCard form={form} type='survey' />
      </div>
    </BaseLayout>
  )
})

export default BasicInfo

