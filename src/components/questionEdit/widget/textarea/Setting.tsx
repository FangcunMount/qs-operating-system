import React from 'react'
import PropTypes from 'prop-types'
import { Divider, Input, message } from 'antd'
import { observer } from 'mobx-react'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { ITextareaQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import ValidateRulesSetting from '../components/ValidateRulesSetting'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore


const TypeTextarea: React.FC<TypeTextareaProps> = (props) => {
  const store = props.store ?? questionSheetStore

  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        store.updateQuestionDispatch(k, { value: v })
      }}
    >
      <div className="s-mt-md">
        <div>默认展示文案：</div>
        <div>
          <Input
            value={props.question.placeholder}
            onChange={(e) => store.updateQuestionDispatch('placeholder', { value: e.target.value })}
          ></Input>
        </div>
      </div>
      <Divider />
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) => store.updateQuestionDispatch('validate', { key: k, value: v })}
      />
    </SettingContainer>
  )
}

interface TypeTextareaProps {
  question: ITextareaQuestion
  store?: StoreType
}

TypeTextarea.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
}

export const checkTextarea = (item: ITextareaQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }
  return true
}

export default observer(TypeTextarea)
