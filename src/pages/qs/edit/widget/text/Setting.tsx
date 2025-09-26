import React from 'react'
import PropTypes from 'prop-types'
import { Divider, Input } from 'antd'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import { ITextQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import { message } from 'antd'

const questionSheetStore = observable(store.questionSheetStore)

const TypeText: React.FC<TypeTextProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    >
      <div className="s-mt-md">
        <div>默认展示文案：</div>
        <div>
          <Input
            value={props.question.placeholder}
            onChange={(e) => questionSheetStore.updateQuestionDispatch('placeholder', { value: e.target.value })}
          ></Input>
        </div>
      </div>
      <Divider />
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) => questionSheetStore.updateQuestionDispatch('validate', { key: k, value: v })}
      />
    </SettingContainer>
  )
}

interface TypeTextProps {
  question: ITextQuestion
}

TypeText.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkText = (item: ITextQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }
  return true
}

export default observer(TypeText)
