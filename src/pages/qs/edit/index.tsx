import React, { useEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { observable } from 'mobx'
import { message, notification } from 'antd'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

import './index.scss'
import { api } from '@/api'
import { store } from '@/store/index'
import BaseLayout from '@/components/layout/BaseLayout'
import QuestionSetting from './Setting'
import QuestionShow from './Show'
import QuestionCreate from './Create'
import { IQuestion } from '@/models/question'

// 提交问题的验证函数列表
import { checkText } from './widget/text/Setting'
import { checkRadio } from './widget/radio/Setting'
import { checkSection } from './widget/section/Setting'
import { checkTextarea } from './widget/textarea/Setting'
import { checkNumber } from './widget/number/Setting'
import { checkDate } from './widget/date/Setting'
import { checkCheckBox } from './widget/checkBox/Setting'
import { checkScoreRadio } from './widget/score/Setting'
import { checkSelect } from './widget/select/Setting'

// 未开发题型
import { checkAddressSelect } from './widget/addressSelect/Setting'
import { checkCascaderSelect } from './widget/cascaderSelect/Setting'
import { checkImageCheckBox } from './widget/imageCheckBox/Setting'
import { checkImageMatrixCheckBox } from './widget/imageMatrixCheckBox/Setting'
import { checkImageMatrixRadio } from './widget/imageMatrixRadio/Setting'
import { checkImageRadio } from './widget/imageRadio/Setting'
import { checkMatrixCheckBox } from './widget/matrixCheckBox/Setting'
import { checkMatrixRadio } from './widget/matrixRadio/Setting'
import { checkUpload } from './widget/upload/Setting'

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

const questionSheetStore = observable(store.questionSheetStore)

const QsEdit: React.FC = () => {
  const showContainerRef = useRef<HTMLInputElement>(null)
  const { questionsheetid, answercnt } = useParams<{ questionsheetid: string; answercnt: string }>()

  useEffect(() => {
    questionSheetStore.initQuestionSheet()
    if (Number(answercnt) > 0) {
      notification['warning']({
        message: '警告：该问卷已有用户填写！',
        description: '该问卷已有用户填写，为避免用户答卷出现问题，请小心编辑!',
        placement: 'topRight',
        duration: null
      })
    }
    (async () => {
      const [qe, qr] = await api.getQuestionSheet(questionsheetid)
      if (qe) return
      questionSheetStore.setQuestionSheet(qr?.data.questionsheet)
      const [e, r] = await api.getQuestionList(questionsheetid)
      if (e) return
      questionSheetStore.setQuestionSheetQuestions(r?.data.list ?? [])
    })()
  }, [questionsheetid])

  const handleVerifyQuestionSheet = () => {
    return verifyQuestionSheet(questionSheetStore.questions)
  }

  const handleSaveQuestionSheet = async () => {
    const [e] = await api.modifyQuestionSHeetQuestion(questionSheetStore.id as string, questionSheetStore.questions)
    if (e) throw e
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') message.success('问题更新成功')
    if (status === 'fail') message.error(`问题更新失败 -- ${error?.errmsg ?? error}`)
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
      header="录入问题"
      beforeSubmit={handleVerifyQuestionSheet}
      submitFn={handleSaveQuestionSheet}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break', 'breakToQsList', 'saveToQsList', 'saveToNext']}
      nextUrl={`/qs/showController/${questionsheetid}`}
    >
      <div className="qs-edit--container">
        <DndProvider backend={HTML5Backend}>
          <QuestionCreate showToBottom={showToBottom}></QuestionCreate>
          <QuestionShow showContainerRef={showContainerRef}></QuestionShow>
          <QuestionSetting></QuestionSetting>
        </DndProvider>
      </div>
    </BaseLayout>
  )
}

export default QsEdit
