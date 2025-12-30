import React from 'react'
import { useParams, useHistory, useLocation } from 'react-router'
import { Form, message } from 'antd'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-scale.scss'
import { scaleStore } from '@/store'
import { api } from '@/api'
import BaseLayout from '@/components/layout/BaseLayout'
import { BasicInfoFormCard, useBasicInfoForm } from '@/components/questionnaire'
import { SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'

const BasicInfo: React.FC = observer(() => {
  const history = useHistory()
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const [form] = Form.useForm()

  // 根据路由自动设置当前步骤
  React.useEffect(() => {
    scaleStore.setCurrentStep('create')
  }, [location.pathname])

  // 使用通用的基本信息表单 Hook
  // useBasicInfoForm 内部会处理数据加载，包括量表分类信息
  const { handleSave } = useBasicInfoForm({
    questionsheetid,
    store: scaleStore,
    api,
    form,
    type: 'scale'
  })

  // 保存后跳转到编辑问题页面
  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('量表信息保存成功')
      scaleStore.nextStep()
      
      // 跳转到编辑问题页面
      if (scaleStore.id) {
        history.push(`/scale/create/${scaleStore.id}/0`)
      }
    }
    if (status === 'fail') {
      message.error(`量表信息保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

    // 根据步骤跳转到对应页面
    switch (step.key) {
    case 'create':
      history.push(`/scale/info/${scaleStore.id}`)
      break
    case 'edit-questions':
      history.push(`/scale/create/${scaleStore.id}/0`)
      break
    case 'set-routing':
      history.push(`/scale/routing/${scaleStore.id}`)
      break
    case 'edit-factors':
      history.push(`/scale/factor/${scaleStore.id}`)
      break
    case 'set-interpretation':
      history.push(`/scale/analysis/${scaleStore.id}`)
      break
    case 'publish':
      history.push(`/scale/publish/${scaleStore.id}`)
      break
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      steps={SCALE_STEPS}
      currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'create')}
      onStepChange={handleStepChange}
      themeClass="scale-page-theme"
    >
      <div className='scale-info-container scale-page-theme'>
        <BasicInfoFormCard form={form} type='scale' />
      </div>
    </BaseLayout>
  )
})

export default BasicInfo

