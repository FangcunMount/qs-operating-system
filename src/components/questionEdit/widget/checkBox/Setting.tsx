import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Divider, message } from 'antd'

import { api } from '@/api'
import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { ICheckBoxQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import OptionSetting from '../components/OptionSetting'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import CalculationSetting from '../components/CalculationSetting'
import CalculationRuleSetting from '../components/CalculationRuleSetting'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore


const SettingCheckBox: React.FC<SettingCheckBoxProps> = ({ question, store = questionSheetStore }) => {
  return (
    <SettingContainer
      title={question.title}
      tips={question.tips}
      handleChange={(k, v) => {
        store.updateQuestionDispatch(k, { value: v })
      }}
    >
      <Divider></Divider>
      <OptionSetting
        options={question.options}
        deleteOption={(index) => {
          store.updateQuestionDispatch('option', { type: 'delete', index })
        }}
        addOption={async (item) => {
          const [, r] = await api.getCodeByType('option', store.id as string)
          item.code = r?.data.code as string
          store.updateQuestionDispatch('option', { type: 'add', value: item })
        }}
        changeOption={(i, k, v) => store.updateQuestionDispatch('option', { type: k, index: i, value: v })}
      ></OptionSetting>
      <Divider />
      <ValidateRulesSetting
        validateRules={question.validate_rules}
        changeValidate={(k, v) => store.updateQuestionDispatch('validate', { key: k, value: v })}
      />
      <Divider />
      <CalculationSetting
        options={question.options}
        handleChangeRadio={(i, k, v) => {
          store.updateQuestionDispatch('option', { type: k, index: i, value: v })
        }}
      />
      <Divider />
      <CalculationRuleSetting question={question}></CalculationRuleSetting>
    </SettingContainer>
  )
}

interface SettingCheckBoxProps {
  question: ICheckBoxQuestion
  store?: StoreType
}

SettingCheckBox.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
}


export const checkCheckBox = (item: ICheckBoxQuestion, index: number): boolean => {
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

export default observer(SettingCheckBox)
