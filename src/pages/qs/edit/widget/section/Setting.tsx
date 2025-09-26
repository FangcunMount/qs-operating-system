import React from 'react'
import { observable } from 'mobx'
import PropTypes from 'prop-types' 
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import { IQuestion, ISectionQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import { message } from 'antd'


const questionSheetStore = observable(store.questionSheetStore)

const TypeSection: React.FC<TypeSectionProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {questionSheetStore.updateQuestionDispatch(k, {value: v})}}
    ></SettingContainer>
  )
}

interface TypeSectionProps {
  question: IQuestion
}

TypeSection.propTypes = {
  question: PropTypes.any.isRequired
}


export const checkSection = (item: ISectionQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }
  return true
}

export default observer(TypeSection)
