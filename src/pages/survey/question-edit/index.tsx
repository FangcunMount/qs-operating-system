import React, { useEffect } from 'react'
import { useParams, useLocation } from 'react-router'
import { message, notification } from 'antd'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SURVEY_STEPS, getSurveyStepIndex, getSurveyStepFromPath } from '@/utils/steps'
import { surveyApi } from '@/api/path/survey'
import {
  createSurveyQuestionnairePort,
  LEGACY_REMOVED_QUESTION_TYPES,
  QuestionEditorWorkspace,
  validateQuestionList
} from '@/features/assessment-editor'
import { useSurveySteps } from '../hooks'

const surveyQuestionEditor = createSurveyQuestionnairePort(surveyStore)

const QuestionEdit: React.FC = observer(() => {
  const location = useLocation()
  const { questionsheetid, answercnt } = useParams<{ questionsheetid: string; answercnt: string }>()
  const { handleStepChange } = useSurveySteps()

  // 调试：检查当前路由和 store 状态
  console.log('QuestionEdit 组件渲染:', {
    questionsheetid,
    answercnt,
    surveyStoreId: surveyStore.id,
    surveyStoreQuestionsLength: surveyStore.questions.length,
    currentPath: window.location.pathname
  })

  // 步骤跳转处理（使用统一的步骤导航）
  const onStepChange = (stepIndex: number) => {
    if (surveyStore.id) {
      handleStepChange(stepIndex, surveyStore.id)
    }
  }

  useEffect(() => {
    // 根据路由自动设置当前步骤
    surveyStore.setCurrentStep('edit-questions')

    // 只在 store 中没有数据或 ID 不匹配时才重新初始化
    const needInit = !surveyStore.id || surveyStore.id !== questionsheetid

    if (Number(answercnt) > 0) {
      notification['warning']({
        message: '警告：该问卷已有用户填写！',
        description: '该问卷已有用户填写，为避免用户答卷出现问题，请小心编辑!',
        placement: 'topRight',
        duration: null
      })
    }

    ;(async () => {
      try {
        if (needInit) {
          await surveyStore.initEditor(questionsheetid)
        }
      } catch (error) {
        console.error('加载问卷失败:', error)
      }
    })()
  }, [questionsheetid, location.pathname])

  const handleVerifyQuestionSheet = () =>
    validateQuestionList(surveyStore.questions, {
      skippedTypes: LEGACY_REMOVED_QUESTION_TYPES,
      onSkipped: (question) => console.warn(`题型 ${question.type} 已不再支持，跳过验证`)
    })

  const handleSaveQuestionSheet = async () => {
    if (!surveyStore.id) {
      throw new Error('问卷 ID 不能为空')
    }

    if (surveyStore.questions.length === 0) {
      message.warning('请至少添加一个问题')
      return
    }

    // 调用 API 批量保存问题（包含显隐规则）
    const [e, r] = await surveyApi.saveSurveyQuestions(surveyStore.id, surveyStore.questions, surveyStore.showControllers)
    if (e) {
      throw e
    }

    // 保存成功后，如果 API 返回了更新后的问题列表，可以更新本地状态
    if (r?.data?.questions) {
      console.log('批量保存成功，返回的问题数量:', r.data.questions.length)
    }

    // 保存成功后更新步骤
    surveyStore.setCurrentStep('set-routing')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('问题保存成功')
      surveyStore.nextStep()
    }
    if (status === 'fail') {
      message.error(`问题更新失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <BaseLayout
      beforeSubmit={handleVerifyQuestionSheet}
      submitFn={handleSaveQuestionSheet}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      nextUrl={`/survey/routing/${questionsheetid}`}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(getSurveyStepFromPath(location.pathname) || 'edit-questions')}
      onStepChange={onStepChange}
      themeClass="survey-page-theme"
    >
      <QuestionEditorWorkspace editor={surveyQuestionEditor} className="survey-page-theme" showKey="survey-question-show" />
    </BaseLayout>
  )
})

export default QuestionEdit
