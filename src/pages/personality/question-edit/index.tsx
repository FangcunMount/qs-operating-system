import React, { useEffect, useRef } from 'react'
import { message } from 'antd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { observer } from 'mobx-react-lite'
import { useParams } from 'react-router'
import BaseLayout from '@/components/layout/BaseLayout'
import QuestionCreate from '@/components/questionEdit/Create'
import QuestionSetting from '@/components/questionEdit/Setting'
import QuestionShow from '@/components/questionEdit/Show'
import { IQuestion } from '@/models/question'
import { personalityModelStore } from '@/store'
import { PERSONALITY_STEPS, personalityEditorFlowConfig, useEditorFlow } from '@/utils/editorFlow'
import { checkText } from '@/components/questionEdit/widget/text/Setting'
import { checkRadio } from '@/components/questionEdit/widget/radio/Setting'
import { checkSection } from '@/components/questionEdit/widget/section/Setting'
import { checkTextarea } from '@/components/questionEdit/widget/textarea/Setting'
import { checkNumber } from '@/components/questionEdit/widget/number/Setting'
import { checkDate } from '@/components/questionEdit/widget/date/Setting'
import { checkCheckBox } from '@/components/questionEdit/widget/checkBox/Setting'
import { checkScoreRadio } from '@/components/questionEdit/widget/score/Setting'
import { checkSelect } from '@/components/questionEdit/widget/select/Setting'
import { checkAddressSelect } from '@/components/questionEdit/widget/addressSelect/Setting'
import { checkCascaderSelect } from '@/components/questionEdit/widget/cascaderSelect/Setting'
import { checkImageCheckBox } from '@/components/questionEdit/widget/imageCheckBox/Setting'
import { checkImageRadio } from '@/components/questionEdit/widget/imageRadio/Setting'
import { checkUpload } from '@/components/questionEdit/widget/upload/Setting'
import '@/components/questionEdit/index.scss'
import '../index.scss'

const checkMap = {
  Text: checkText,
  Radio: checkRadio,
  Section: checkSection,
  Textarea: checkTextarea,
  Number: checkNumber,
  Date: checkDate,
  CheckBox: checkCheckBox,
  Checkbox: checkCheckBox,
  ScoreRadio: checkScoreRadio,
  Select: checkSelect,
  AddressSelect: checkAddressSelect,
  CascaderSelect: checkCascaderSelect,
  ImageCheckBox: checkImageCheckBox,
  ImageRadio: checkImageRadio,
  Upload: checkUpload
}

const PersonalityQuestionEdit: React.FC = observer(() => {
  const { modelCode } = useParams<{ modelCode: string; answercnt: string }>()
  const showContainerRef = useRef<HTMLInputElement>(null)
  const { currentStepIndex, handleStepChange } = useEditorFlow(personalityEditorFlowConfig, personalityModelStore.modelCode || modelCode)

  useEffect(() => {
    personalityModelStore.setCurrentStep('edit-questions')
    personalityModelStore.initEditor(modelCode).catch(() => {
      message.error('加载人格测评题目失败')
    })
  }, [modelCode])

  const verifyQuestionSheet = (questions: IQuestion[]): boolean => {
    for (let index = 0; index < questions.length; index++) {
      const question = questions[index]
      const checker = (checkMap as any)[question.type]
      if (checker && !checker(question as any, index)) return false
    }
    return true
  }

  const handleSave = async () => {
    if (personalityModelStore.questions.length === 0) {
      message.warning('请至少添加一个问题')
      return
    }
    await personalityModelStore.saveQuestionList({ persist: true })
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('问题保存成功')
      personalityModelStore.nextStep()
    } else {
      message.error(`问题更新失败 -- ${error?.errmsg || error?.message || error}`)
    }
  }

  const showToBottom = () => {
    if (showContainerRef.current) {
      showContainerRef.current.scroll(0, showContainerRef.current.scrollHeight)
    }
  }

  return (
    <BaseLayout
      beforeSubmit={() => verifyQuestionSheet(personalityModelStore.questions)}
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['backToList', 'break', 'saveToNext']}
      nextUrl={`/personality/routing/${modelCode}`}
      steps={PERSONALITY_STEPS}
      currentStep={currentStepIndex}
      onStepChange={handleStepChange}
      themeClass="personality-page-theme"
    >
      <div className="personality-question-edit personality-page-theme">
        <DndProvider backend={HTML5Backend}>
          <QuestionCreate showToBottom={showToBottom} store={personalityModelStore} />
          <QuestionShow showContainerRef={showContainerRef} store={personalityModelStore} />
          <QuestionSetting store={personalityModelStore} />
        </DndProvider>
      </div>
    </BaseLayout>
  )
})

export default PersonalityQuestionEdit
