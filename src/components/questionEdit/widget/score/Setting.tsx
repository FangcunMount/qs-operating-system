import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Divider, message } from 'antd'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { IScoreRadioQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import ScoreOptionSetting from '../components/ScoreOptionSetting'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import CalculationSetting from '../components/CalculationSetting'


type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const TypeScoreRadio: React.FC<TypeScoreRadioProps> = (props) => {
  const store = props.store ?? questionSheetStore

  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        store.updateQuestionDispatch(k, { value: v })
      }}
    >
      <Divider />
      <ScoreOptionSetting
        options={props.question.options}
        leftDesc={props.question.left_desc}
        rightDesc={props.question.right_desc}
        changeOptions={(options) => {
          store.updateQuestionDispatch('options', { options })
        }}
        changeLeftDesc={(desc) => {
          store.updateQuestionDispatch('left_desc', { desc })
        }}
        changeRightDesc={(desc) => {
          store.updateQuestionDispatch('right_desc', { desc })
        }}
      ></ScoreOptionSetting>
      <Divider />
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) => store.updateQuestionDispatch('validate', { key: k, value: v })}
      />
      <Divider />
      <CalculationSetting
        options={props.question.options}
        handleChangeRadio={(i, k, v) => {
          store.updateQuestionDispatch('option', { type: k, index: i, value: v })
        }}
      />
    </SettingContainer>
  )
}

interface TypeScoreRadioProps {
  question: IScoreRadioQuestion
  store?: StoreType
}

TypeScoreRadio.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
}

export const checkScoreRadio = (item: IScoreRadioQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }

  if (item.options && item.options.length < 1) {
    message.error(`第${index + 1}题，无选项`)
    return false
  } else {
    for (let i = 0; i < item.options.length; i++) {
      const element = item.options[i]
      if (!element.content) {
        message.error(`第${index + 1}题，第${i + 1}个选项没有内容`)
        return false
      }
    }
  }

  return true
}

export default observer(TypeScoreRadio)
