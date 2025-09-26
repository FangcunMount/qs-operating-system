import React from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import SettingContainer from '../components/SettingContainer'
import { IImageMatrixCheckBoxQuestion } from '@/models/question'

const questionSheetStore = observable(store.questionSheetStore)
const SettingImageMatrixCheckBox: React.FC<SettingImageMatrixCheckBoxProps> = (props) => {
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

interface SettingImageMatrixCheckBoxProps {
  question: IImageMatrixCheckBoxQuestion
}

SettingImageMatrixCheckBox.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkImageMatrixCheckBox = (item: IImageMatrixCheckBoxQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingImageMatrixCheckBox)
