import React from 'react'
import PropTypes from 'prop-types'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import SettingContainer from '../components/SettingContainer'
import { IImageRadioQuestion } from '@/models/question'
import { Divider } from 'antd'
import { api } from '@/api'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import CalculationSetting from '../components/CalculationSetting'
import ImageOptionSetting from '../components/ImageOptionSetting'

const questionSheetStore = observable(store.questionSheetStore)
const SettingImageRadio: React.FC<SettingImageRadioProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    >
      <Divider />
      <ImageOptionSetting
        options={props.question.options}
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

interface SettingImageRadioProps {
  question: IImageRadioQuestion
}

SettingImageRadio.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkImageRadio = (item: IImageRadioQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingImageRadio)
