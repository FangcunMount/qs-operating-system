import React from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import SettingContainer from '../components/SettingContainer'
import { ICascaderSelectQuestion } from '@/models/question'

const questionSheetStore = observable(store.questionSheetStore)
const SettingCascaderSelect: React.FC<SettingCascaderSelectProps> = (props) => {
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

interface SettingCascaderSelectProps {
  question: ICascaderSelectQuestion
}

SettingCascaderSelect.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkCascaderSelect = (item: ICascaderSelectQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingCascaderSelect)
