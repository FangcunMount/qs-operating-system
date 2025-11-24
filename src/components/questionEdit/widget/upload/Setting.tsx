import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import SettingContainer from '../components/SettingContainer'
import { IUploadQuestion } from '@/models/question'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import { Divider } from 'antd'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const SettingUpload: React.FC<SettingUploadProps> = (props) => {
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
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) => store.updateQuestionDispatch('validate', { key: k, value: v })}
      />
    </SettingContainer>
  )
}

interface SettingUploadProps {
  question: IUploadQuestion
  store?: StoreType
}

SettingUpload.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
}

export const checkUpload = (item: IUploadQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingUpload)
