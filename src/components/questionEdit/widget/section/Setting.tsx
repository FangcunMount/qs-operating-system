import React from 'react'
import PropTypes from 'prop-types' 
import { observer } from 'mobx-react'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { IQuestion, ISectionQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import { message } from 'antd'



type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const TypeSection: React.FC<TypeSectionProps> = (props) => {
  const store = props.store ?? questionSheetStore

  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {store.updateQuestionDispatch(k, {value: v})}}
    ></SettingContainer>
  )
}

interface TypeSectionProps {
  question: IQuestion
  store?: StoreType
}

TypeSection.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
}


export const checkSection = (item: ISectionQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }
  return true
}

export default observer(TypeSection)
