import React, { useEffect } from 'react'
import { useParams, useLocation } from 'react-router'
import { message } from 'antd'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-scale.scss'
import { scaleStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { getScaleEditorPath, SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'
import { useHistory } from 'react-router-dom'
import { surveyApi } from '@/api/path/survey'
import {
  createScaleQuestionnairePort,
  LEGACY_REMOVED_QUESTION_TYPES,
  QuestionEditorWorkspace,
  validateQuestionList
} from '@/features/assessment-editor'

const scaleQuestionEditor = createScaleQuestionnairePort(scaleStore)

const QuestionEdit: React.FC = observer(() => {
  const history = useHistory()
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string; answercnt: string }>()

  // 从 URL query 参数获取 scaleCode
  const searchParams = new URLSearchParams(location.search)
  const scaleCode = searchParams.get('scaleCode') || undefined

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

    history.push(getScaleEditorPath(step.key || '', scaleStore.id, scaleCode))
  }

  useEffect(() => {
    // 根据路由自动设置当前步骤
    scaleStore.setCurrentStep('edit-questions')
    ;(async () => {
      try {
        // 强制重新加载数据，确保总是从服务器获取最新数据
        console.log('开始调用 initEditor，questionsheetid:', questionsheetid, 'scaleCode:', scaleCode)
        await scaleStore.initEditor(questionsheetid, scaleCode)
        console.log('initEditor 完成，问题数量:', scaleStore.questions.length, '量表编码:', scaleStore.scaleCode)
      } catch (error) {
        console.error('加载量表失败:', error)
        message.error('加载量表数据失败，请刷新页面重试')
      }
    })()
  }, [questionsheetid, scaleCode, location.pathname])

  const handleVerifyQuestionSheet = () =>
    validateQuestionList(scaleStore.questions, {
      skippedTypes: LEGACY_REMOVED_QUESTION_TYPES,
      onSkipped: (question) => console.warn(`题型 ${question.type} 已不再支持，跳过验证`)
    })

  const handleSaveQuestionSheet = async () => {
    if (!scaleStore.id) {
      throw new Error('量表 ID 不能为空')
    }

    if (scaleStore.questions.length === 0) {
      message.warning('请至少添加一个问题')
      return
    }

    // 调用 API 批量保存问题（包含显隐规则）
    const [e, r] = await surveyApi.saveSurveyQuestions(scaleStore.id, scaleStore.questions, scaleStore.showControllers)
    if (e) {
      throw e
    }

    // 保存成功后，如果 API 返回了更新后的问题列表，可以更新本地状态
    if (r?.data?.questions) {
      console.log('批量保存成功，返回的问题数量:', r.data.questions.length)
    }

    // 保存成功后更新步骤
    scaleStore.setCurrentStep('set-routing')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('问题保存成功')
      scaleStore.nextStep()
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
      nextUrl={getScaleEditorPath('set-routing', questionsheetid, scaleCode)}
      steps={SCALE_STEPS}
      currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'edit-questions')}
      onStepChange={handleStepChange}
      themeClass="scale-page-theme"
    >
      <QuestionEditorWorkspace editor={scaleQuestionEditor} className="scale-page-theme" showKey="scale-question-show" />
    </BaseLayout>
  )
})

export default QuestionEdit
