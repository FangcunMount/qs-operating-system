import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import { questionSheetStore } from '@/store'
import SettingContainer from '../components/SettingContainer'
import { IUploadQuestion } from '@/models/question'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import { Divider } from 'antd'

const SettingUpload: React.FC<SettingUploadProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    >
      <Divider />
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) => questionSheetStore.updateQuestionDispatch('validate', { key: k, value: v })}
      />
    </SettingContainer>
  )
}

interface SettingUploadProps {
  question: IUploadQuestion
}

SettingUpload.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkUpload = (item: IUploadQuestion, index: number): boolean => {
  console.log(item, index)
  return true
}

export default observer(SettingUpload)
