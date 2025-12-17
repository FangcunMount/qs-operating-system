import React, { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { message, notification } from 'antd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { observer } from 'mobx-react-lite'

import './QuestionEdit.scss'
import '@/components/questionEdit/index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SURVEY_STEPS, getSurveyStepIndex } from '@/utils/steps'
import { useHistory } from 'react-router-dom'
import { surveyApi } from '@/api/path/survey'
import QuestionSetting from '@/components/questionEdit/Setting'
import QuestionShow from '@/components/questionEdit/Show'
import QuestionCreate from '@/components/questionEdit/Create'
import { IQuestion } from '@/models/question'

// 提交问题的验证函数列表
import { checkText } from '@/components/questionEdit/widget/text/Setting'
import { checkRadio } from '@/components/questionEdit/widget/radio/Setting'
import { checkSection } from '@/components/questionEdit/widget/section/Setting'
import { checkTextarea } from '@/components/questionEdit/widget/textarea/Setting'
import { checkNumber } from '@/components/questionEdit/widget/number/Setting'
import { checkDate } from '@/components/questionEdit/widget/date/Setting'
import { checkCheckBox } from '@/components/questionEdit/widget/checkBox/Setting'
import { checkScoreRadio } from '@/components/questionEdit/widget/score/Setting'
import { checkSelect } from '@/components/questionEdit/widget/select/Setting'

// 未开发题型
import { checkAddressSelect } from '@/components/questionEdit/widget/addressSelect/Setting'
import { checkCascaderSelect } from '@/components/questionEdit/widget/cascaderSelect/Setting'
import { checkImageCheckBox } from '@/components/questionEdit/widget/imageCheckBox/Setting'
import { checkImageRadio } from '@/components/questionEdit/widget/imageRadio/Setting'
import { checkUpload } from '@/components/questionEdit/widget/upload/Setting'

const checkMap = {
  Text: checkText,
  Radio: checkRadio,
  Section: checkSection,
  Textarea: checkTextarea,
  Number: checkNumber,
  Date: checkDate,
  CheckBox: checkCheckBox,
  ScoreRadio: checkScoreRadio,
  Select: checkSelect,
  AddressSelect: checkAddressSelect,
  CascaderSelect: checkCascaderSelect,
  ImageCheckBox: checkImageCheckBox,
  ImageRadio: checkImageRadio,
  Upload: checkUpload
}

const QuestionEdit: React.FC = observer(() => {
  const history = useHistory()
  const showContainerRef = useRef<HTMLInputElement>(null)
  const { questionsheetid, answercnt } = useParams<{ questionsheetid: string; answercnt: string }>()
  
  // 调试：检查当前路由和 store 状态
  console.log('QuestionEdit 组件渲染:', {
    questionsheetid,
    answercnt,
    surveyStoreId: surveyStore.id,
    surveyStoreQuestionsLength: surveyStore.questions.length,
    currentPath: window.location.pathname
  })

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SURVEY_STEPS[stepIndex]
    if (!step || !surveyStore.id) return

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

  useEffect(() => {
    // 设置当前步骤
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
    
    (async () => {
      try {
        if (needInit) {
          await surveyStore.initEditor(questionsheetid)
        }
      } catch (error) {
        console.error('加载问卷失败:', error)
      }
    })()
  }, [questionsheetid])

  const handleVerifyQuestionSheet = () => {
    return verifyQuestionSheet(surveyStore.questions)
  }

  const handleSaveQuestionSheet = async () => {
    if (!surveyStore.id) {
      throw new Error('问卷 ID 不能为空')
    }
    
    if (surveyStore.questions.length === 0) {
      message.warning('请至少添加一个问题')
      return
    }
    
    // 调用 API 批量保存问题（包含显隐规则）
    const [e, r] = await surveyApi.saveSurveyQuestions(
      surveyStore.id, 
      surveyStore.questions,
      surveyStore.showControllers
    )
    if (e) {
      throw e
    }
    
    // 保存成功后，如果 API 返回了更新后的问题列表，可以更新本地状态
    if (r?.data?.questions) {
      console.log('批量保存成功，返回的问题数量:', r.data.questions.length)
      // 注意：这里可以选择是否用返回的数据更新本地状态
      // 通常批量更新接口会返回更新后的完整问卷数据
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

  /**
   * @description: 问题验证函数，验证问题是否合规
   * @param questions: 问题列表
   * @returns boolean 验证成功：true 验证失败：false
   */
  const verifyQuestionSheet = (questions: IQuestion[]): boolean => {
    for (let index = 0; index < questions.length; index++) {
      const element = questions[index]

      // 跳过已删除的矩阵题型
      if (['MatrixCheckBox', 'MatrixRadio', 'ImageMatrixCheckBox', 'ImageMatrixRadio'].includes(element.type)) {
        console.warn(`题型 ${element.type} 已不再支持，跳过验证`)
        continue
      }

      const checker = (checkMap as any)[element.type]
      if (!checker || !checker(element as any, index)) return false
    }
    return true
  }

  const showToBottom = () => {
    if (showContainerRef && showContainerRef.current) {
      showContainerRef.current.scroll(0, showContainerRef.current.scrollHeight)
    }
  }

  return (
    <BaseLayout
      beforeSubmit={handleVerifyQuestionSheet}
      submitFn={handleSaveQuestionSheet}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break', 'saveToNext']}
      nextUrl={`/survey/routing/${questionsheetid}`}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(surveyStore.currentStep)}
      onStepChange={handleStepChange}
      themeClass="survey-page-theme"
    >
      <div className='qs-question-edit-container survey-page-theme'>
        <DndProvider backend={HTML5Backend}>
          <QuestionCreate showToBottom={showToBottom} store={surveyStore}></QuestionCreate>
          <QuestionShow key="survey-question-show" showContainerRef={showContainerRef} store={surveyStore}></QuestionShow>
          <QuestionSetting store={surveyStore}></QuestionSetting>
        </DndProvider>
      </div>
    </BaseLayout>
  )
})

export default QuestionEdit
