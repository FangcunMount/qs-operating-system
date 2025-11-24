import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import SettingContainer from '../components/SettingContainer'
import { IImageRadioQuestion } from '@/models/question'
import { Divider } from 'antd'
import { api } from '@/api'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import CalculationSetting from '../components/CalculationSetting'
import ImageOptionSetting from '../components/ImageOptionSetting'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const SettingImageRadio: React.FC<SettingImageRadioProps> = (props) => {
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
      <ImageOptionSetting
        options={props.question.options}
        deleteOption={(index) => store.updateQuestionDispatch('option', { type: 'delete', index: index })}
        addOption={async (item) => {
          const [, r] = await api.getCodeByType('option', store.id as string)
          item.code = r?.data.code as string
          store.updateQuestionDispatch('option', { type: 'add', value: item })
        }}
        changeOption={(i, k, v) => store.updateQuestionDispatch('option', { type: k, index: i, value: v })}
      ></ImageOptionSetting>

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

interface SettingImageRadioProps {
  question: IImageRadioQuestion
  store?: StoreType
}

SettingImageRadio.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
}

export const checkImageRadio = (item: IImageRadioQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingImageRadio)
