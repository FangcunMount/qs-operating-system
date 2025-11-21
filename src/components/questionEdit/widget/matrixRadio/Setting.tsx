import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import { questionSheetStore } from '@/store'
import SettingContainer from '../components/SettingContainer'
import { IMatrixRadioQuestion } from '@/models/question'

const SettingMatrixRadio: React.FC<SettingMatrixRadioProps> = (props) => {
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

interface SettingMatrixRadioProps {
  question: IMatrixRadioQuestion
}

SettingMatrixRadio.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkMatrixRadio = (item: IMatrixRadioQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingMatrixRadio)
