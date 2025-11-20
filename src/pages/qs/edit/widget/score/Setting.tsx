import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Divider, message } from 'antd'

import { questionSheetStore } from '@/store'
import { IScoreRadioQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import ScoreOptionSetting from '../components/ScoreOptionSetting'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import CalculationSetting from '../components/CalculationSetting'


const TypeScoreRadio: React.FC<TypeScoreRadioProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    >
      <Divider />
      <ScoreOptionSetting
        options={props.question.options}
        leftDesc={props.question.left_desc}
        rightDesc={props.question.right_desc}
        changeOptions={(options) => {
          questionSheetStore.updateQuestionDispatch('options', { options })
        }}
        changeLeftDesc={(desc) => {
          questionSheetStore.updateQuestionDispatch('left_desc', { desc })
        }}
        changeRightDesc={(desc) => {
          questionSheetStore.updateQuestionDispatch('right_desc', { desc })
        }}
      ></ScoreOptionSetting>
      <Divider />
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) => questionSheetStore.updateQuestionDispatch('validate', { key: k, value: v })}
      />
      <Divider />
      <CalculationSetting
        options={props.question.options}
        handleChangeRadio={(i, k, v) => {
          questionSheetStore.updateQuestionDispatch('option', { type: k, index: i, value: v })
        }}
      />
    </SettingContainer>
  )
}

interface TypeScoreRadioProps {
  question: IScoreRadioQuestion
}

TypeScoreRadio.propTypes = {
  question: PropTypes.any.isRequired
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
