import React, { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { message, notification } from 'antd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { observer } from 'mobx-react-lite'

import './create.scss'
import '@/components/questionEdit/index.scss'
import '@/components/editorSteps/index.scss'
import { getShowControllerList } from '@/api/path/showController'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
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
import { checkImageMatrixCheckBox } from '@/components/questionEdit/widget/imageMatrixCheckBox/Setting'
import { checkImageMatrixRadio } from '@/components/questionEdit/widget/imageMatrixRadio/Setting'
import { checkImageRadio } from '@/components/questionEdit/widget/imageRadio/Setting'
import { checkMatrixCheckBox } from '@/components/questionEdit/widget/matrixCheckBox/Setting'
import { checkMatrixRadio } from '@/components/questionEdit/widget/matrixRadio/Setting'
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
  ImageMatrixCheckBox: checkImageMatrixCheckBox,
  ImageMatrixRadio: checkImageMatrixRadio,
  ImageRadio: checkImageRadio,
  MatrixCheckBox: checkMatrixCheckBox,
  MatrixRadio: checkMatrixRadio,
  Upload: checkUpload
}

const SurveyCreate: React.FC = observer(() => {
  const showContainerRef = useRef<HTMLInputElement>(null)
  const { questionsheetid, answercnt } = useParams<{ questionsheetid: string; answercnt: string }>()

  useEffect(() => {
    surveyStore.initSurvey()
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
        await surveyStore.initEditor(questionsheetid)
        // 初始化显隐规则（只在首次载入时获取）
        if (questionsheetid && questionsheetid !== 'new') {
          const [e, r] = await getShowControllerList(questionsheetid)
          if (!e && r) {
            surveyStore.setShowControllers(r.data.list)
          }
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
    // 仅本地暂存，不触发后端接口
    surveyStore.setCurrentStep('set-routing')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('已保存到本地，稍后统一提交')
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

      if (!checkMap[element.type](element as any, index)) return false
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
      footerButtons={['saveToNext']}
      nextUrl={`/survey/routing/${questionsheetid}`}
    >
      <div className='qs-question-edit-container'>
        <DndProvider backend={HTML5Backend}>
          <QuestionCreate showToBottom={showToBottom} store={surveyStore}></QuestionCreate>
          <QuestionShow showContainerRef={showContainerRef} store={surveyStore}></QuestionShow>
          <QuestionSetting store={surveyStore}></QuestionSetting>
        </DndProvider>
      </div>
    </BaseLayout>
  )
})

export default SurveyCreate
