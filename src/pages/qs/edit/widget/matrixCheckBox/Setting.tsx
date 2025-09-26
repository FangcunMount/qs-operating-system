import React from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import SettingContainer from '../components/SettingContainer'
import { IMatrixCheckBoxQuestion } from '@/models/question'

const questionSheetStore = observable(store.questionSheetStore)
const SettingMatrixCheckBox: React.FC<SettingMatrixCheckBoxProps> = (props) => {
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

interface SettingMatrixCheckBoxProps {
  question: IMatrixCheckBoxQuestion
}

SettingMatrixCheckBox.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkMatrixCheckBox = (item: IMatrixCheckBoxQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingMatrixCheckBox)
