import React, { useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router'
import { message } from 'antd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/questionEdit/index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-scale.scss'
import { scaleStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'
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
  const location = useLocation()
  const showContainerRef = useRef<HTMLInputElement>(null)
  const { questionsheetid } = useParams<{ questionsheetid: string; answercnt: string }>()
  
  // 从 URL query 参数获取 scaleCode
  const searchParams = new URLSearchParams(location.search)
  const scaleCode = searchParams.get('scaleCode') || undefined

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

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

  useEffect(() => {
    // 根据路由自动设置当前步骤
    scaleStore.setCurrentStep('edit-questions');
    
    (async () => {
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

  const handleVerifyQuestionSheet = () => {
    return verifyQuestionSheet(scaleStore.questions)
  }

  const handleSaveQuestionSheet = async () => {
    if (!scaleStore.id) {
      throw new Error('量表 ID 不能为空')
    }
    
    if (scaleStore.questions.length === 0) {
      message.warning('请至少添加一个问题')
      return
    }
    
    // 调用 API 批量保存问题（包含显隐规则）
    const [e, r] = await surveyApi.saveSurveyQuestions(
      scaleStore.id, 
      scaleStore.questions,
      scaleStore.showControllers
    )
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
      footerButtons={['backToList', 'break', 'saveToNext']}
      nextUrl={`/scale/routing/${questionsheetid}`}
      steps={SCALE_STEPS}
      currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'edit-questions')}
      onStepChange={handleStepChange}
      themeClass="scale-page-theme"
    >
      <div className='qs-question-edit-container scale-page-theme'>
        <DndProvider backend={HTML5Backend}>
          <QuestionCreate showToBottom={showToBottom} store={scaleStore}></QuestionCreate>
          <QuestionShow key="scale-question-show" showContainerRef={showContainerRef} store={scaleStore}></QuestionShow>
          <QuestionSetting store={scaleStore}></QuestionSetting>
        </DndProvider>
      </div>
    </BaseLayout>
  )
})

export default QuestionEdit

