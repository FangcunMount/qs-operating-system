import React, { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { message, notification } from 'antd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { observer } from 'mobx-react-lite'

import './create.scss'
import '@/components/questionEdit/index.scss'
import '@/components/editorSteps/index.scss'
import EditorSteps from '@/components/editorSteps'
import { getShowControllerList } from '@/api/path/showController'
import { api } from '@/api'
import { scaleStore } from '@/store'
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

const ScaleCreate: React.FC = observer(() => {
  const showContainerRef = useRef<HTMLInputElement>(null)
  const { questionsheetid, answercnt } = useParams<{ questionsheetid: string; answercnt: string }>()

  useEffect(() => {
    scaleStore.initScale()  
    if (Number(answercnt) > 0) {
      notification['warning']({
        message: '警告：该量表已有用户测评！',
        description: '该量表已有用户测评，为避免用户测评出现问题，请小心编辑!',
        placement: 'topRight',
        duration: null
      })
    }
    (async () => {
      const [qe, qr] = await api.getQuestionSheet(questionsheetid)
      if (qe) return
      scaleStore.setScale(qr?.data.questionsheet)
      const [e, r] = await api.getQuestionList(questionsheetid)
      if (e) return
      scaleStore.setScaleQuestions(r?.data.list ?? [])
      if (questionsheetid && questionsheetid !== 'new') {
        const [ce, cr] = await getShowControllerList(questionsheetid)
        if (!ce && cr) {
          scaleStore.setShowControllers(cr.data.list)
        }
      }
      
      // 根据量表状态设置步骤
      if (scaleStore.questions.length > 0) {
        scaleStore.setCurrentStep('edit-questions')
      }
    })()
  }, [questionsheetid])

  const handleVerifyQuestionSheet = () => {
    return verifyQuestionSheet(scaleStore.questions)
  }

  const handleSaveQuestionSheet = async () => {
    const [e] = await api.modifyQuestionSHeetQuestion(scaleStore.id as string, scaleStore.questions)
    if (e) throw e
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('问题更新成功')
      // 保存成功后进入下一步
      scaleStore.nextStep()
    }
    if (status === 'fail') {
      message.error(`问题更新失败 -- ${error?.errmsg ?? error}`)
    }
  }

  /**
   * @description: 问题验证函数,验证问题是否合规
   * @param questions: 问题列表
   * @returns boolean 验证成功:true 验证失败:false
   */
  const verifyQuestionSheet = (questions: IQuestion[]): boolean => {
    for (let index = 0; index < questions.length; index++) {
      const element = questions[index]

      // 跳过已废弃的矩阵题型
      if (['MatrixCheckBox', 'MatrixRadio', 'ImageMatrixCheckBox', 'ImageMatrixRadio'].includes(element.type)) {
        console.warn(`题型 ${element.type} 已不再支持,跳过验证`)
        continue
      }

      if (!(checkMap as any)[element.type](element as any, index)) return false
    }
    return true
  }

  const showToBottom = () => {
    if (showContainerRef && showContainerRef.current) {
      showContainerRef.current.scroll(0, showContainerRef.current.scrollHeight)
    }
  }

  const getCurrentStepIndex = () => {
    const steps = ['create', 'edit-questions', 'set-routing', 'edit-factors', 'set-interpretation', 'publish']
    return steps.indexOf(scaleStore.currentStep)
  }

  return (
    <BaseLayout
      header={
        <div className='qs-editor-header'>
          <div className='qs-editor-header__title'>创建量表</div>
          <EditorSteps 
            current={getCurrentStepIndex()} 
            steps={[
              { title: '创建量表' },
              { title: '编辑问题' },
              { title: '设置路由' },
              { title: '编辑因子' },
              { title: '设置解读' },
              { title: '发布' }
            ]} 
          />
        </div>
      }
      beforeSubmit={handleVerifyQuestionSheet}
      submitFn={handleSaveQuestionSheet}
      afterSubmit={handleAfterSubmit}
      footerButtons={[]}
    >
      <div className='qs-question-edit-container'>
        <DndProvider backend={HTML5Backend}>
          <QuestionCreate showToBottom={showToBottom} store={scaleStore}></QuestionCreate>
          <QuestionShow showContainerRef={showContainerRef} store={scaleStore}></QuestionShow>
          <QuestionSetting store={scaleStore}></QuestionSetting>
        </DndProvider>
      </div>
    </BaseLayout>
  )
})

export default ScaleCreate
