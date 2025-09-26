import React from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import SettingContainer from '../components/SettingContainer'
import { IImageCheckBoxQuestion } from '@/models/question'
import ImageOptionSetting from '../components/ImageOptionSetting'
import { api } from '@/api'
import { Divider } from 'antd'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import CalculationSetting from '../components/CalculationSetting'
import CalculationRuleSetting from '../components/CalculationRuleSetting'

const questionSheetStore = observable(store.questionSheetStore)
const SettingImageCheckBox: React.FC<SettingImageCheckBoxProps> = ({ question }) => {
  return (
    <SettingContainer
      title={question.title}
      tips={question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    >
      <ImageOptionSetting
        options={question.options}
        deleteOption={(index) => questionSheetStore.updateQuestionDispatch('option', { type: 'delete', index: index })}
        addOption={async (item) => {
          const [, r] = await api.getCodeByType('option', questionSheetStore.id as string)
          item.code = r?.data.code as string
          questionSheetStore.updateQuestionDispatch('option', { type: 'add', value: item })
        }}
        changeOption={(i, k, v) => questionSheetStore.updateQuestionDispatch('option', { type: k, index: i, value: v })}
      ></ImageOptionSetting>
      <Divider />
      <ValidateRulesSetting
        validateRules={question.validate_rules}
        changeValidate={(k, v) => questionSheetStore.updateQuestionDispatch('validate', { key: k, value: v })}
      />
      <Divider />
      <CalculationSetting
        options={question.options}
        handleChangeRadio={(i, k, v) => {
          questionSheetStore.updateQuestionDispatch('option', { type: k, index: i, value: v })
        }}
      />
      <Divider />
      <CalculationRuleSetting question={question}></CalculationRuleSetting>
    </SettingContainer>
  )
}

interface SettingImageCheckBoxProps {
  question: IImageCheckBoxQuestion
}

SettingImageCheckBox.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkImageCheckBox = (item: IImageCheckBoxQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingImageCheckBox)
