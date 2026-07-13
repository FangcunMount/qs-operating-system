import React, { useEffect } from 'react'
import { message } from 'antd'
import { useParams, useLocation } from 'react-router'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import { bindQuestionnaireEditingPort, QuestionRoutingWorkspace } from '@/features/assessment-editor'
import BaseLayout from '@/components/layout/BaseLayout'
import { SURVEY_STEPS, getSurveyStepIndex, getSurveyStepFromPath } from '@/utils/steps'
import { useSurveySteps, useSurveyData } from '../hooks'

const surveyRoutingEditor = bindQuestionnaireEditingPort(surveyStore, () => surveyStore.id || '')

const QuestionRouting: React.FC = observer(() => {
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const { handleStepChange } = useSurveySteps()
  const { loadFullData } = useSurveyData(questionsheetid || '')

  // 步骤跳转处理（使用统一的步骤导航）
  const onStepChange = (stepIndex: number) => {
    if (surveyStore.id) {
      handleStepChange(stepIndex, surveyStore.id)
    }
  }

  // 使用 hooks 加载数据
  const loadDataFromServer = async () => {
    await loadFullData()
  }

  // 初始化数据
  useEffect(() => {
    // 根据路由自动设置当前步骤
    surveyStore.setCurrentStep('set-routing')

    const initPageData = async () => {
      // 先尝试从 localStorage 恢复
      const restored = surveyStore.loadFromLocalStorage()

      // 如果恢复成功且 ID 匹配且有题目数据，直接使用
      if (restored && surveyStore.id === questionsheetid && surveyStore.questions.length > 0) {
        console.log('routing 页面从 localStorage 恢复数据成功', {
          id: surveyStore.id,
          questionCount: surveyStore.questions.length,
          showControllerCount: surveyStore.showControllers.length
        })
        return
      }

      // 否则从服务器加载
      console.log('routing 页面从服务器加载数据')
      await loadDataFromServer()
    }

    initPageData()
  }, [questionsheetid, location.pathname])

  // 保存路由设置（通过批量更新接口提交，包含显隐规则）
  const handleSave = async () => {
    if (!surveyStore.id) {
      throw new Error('问卷 ID 不能为空')
    }

    if (surveyStore.questions.length === 0) {
      throw new Error('请先添加问题')
    }

    try {
      // 显示加载提示
      message.loading({ content: '正在保存路由设置...', key: 'saveRouting', duration: 0 })

      // 调用批量更新接口，同时提交问题和显隐规则
      const { surveyApi } = await import('@/api/path/survey')
      const [error] = await surveyApi.saveSurveyQuestions(surveyStore.id, surveyStore.questions, surveyStore.showControllers)

      if (error) {
        throw error
      }

      // 关闭加载提示
      message.destroy('saveRouting')

      // 保存成功后更新步骤
      surveyStore.setCurrentStep('publish')
    } catch (error: any) {
      // 关闭加载提示
      message.destroy('saveRouting')

      // 抛出错误，让 BaseLayout 的 afterSubmit 处理
      throw error
    }
  }

  // 保存后的回调
  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存成功')
      surveyStore.nextStep()
    } else {
      message.error(`路由设置保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <>
      <BaseLayout
        submitFn={handleSave}
        afterSubmit={handleAfterSubmit}
        footerButtons={['backToList', 'break', 'saveToNext']}
        nextUrl={`/survey/publish/${questionsheetid}`}
        steps={SURVEY_STEPS}
        currentStep={getSurveyStepIndex(getSurveyStepFromPath(location.pathname) || 'set-routing')}
        onStepChange={onStepChange}
        themeClass="survey-page-theme"
      >
        <QuestionRoutingWorkspace editor={surveyRoutingEditor} className="survey-page-theme" />
      </BaseLayout>
    </>
  )
})

export default QuestionRouting
