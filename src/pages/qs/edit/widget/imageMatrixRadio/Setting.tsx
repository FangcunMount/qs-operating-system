import React from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import SettingContainer from '../components/SettingContainer'
import { IImageMatrixRadioQuestion } from '@/models/question'

const questionSheetStore = observable(store.questionSheetStore)
const SettingImageMatrixRadio: React.FC<SettingImageMatrixRadioProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    ></SettingContainer>
  )
}

interface SettingImageMatrixRadioProps {
  // TODO: 使用时， IQuestionBase 调整为对应题型的 interface
  question: IImageMatrixRadioQuestion
}

SettingImageMatrixRadio.propTypes = {
  question: PropTypes.any.isRequired
}

// TODO: 使用时， IQuestionBase 调整为对应题型的 interface
export const checkImageMatrixRadio = (item: IImageMatrixRadioQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingImageMatrixRadio)
