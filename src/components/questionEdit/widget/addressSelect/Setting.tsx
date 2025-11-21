import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import { questionSheetStore } from '@/store'
import SettingContainer from '../components/SettingContainer'
import { IAddressSelectQuestion } from '@/models/question'

const SettingAddressSelect: React.FC<SettingAddressSelectProps> = (props) => {
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

interface SettingAddressSelectProps {
  // TODO: 使用时， IQuestionBase 调整为对应题型的 interface
  question: IAddressSelectQuestion
}

SettingAddressSelect.propTypes = {
  question: PropTypes.any.isRequired
}

// TODO: 使用时， IQuestionBase 调整为对应题型的 interface
export const checkAddressSelect = (item: IAddressSelectQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingAddressSelect)
