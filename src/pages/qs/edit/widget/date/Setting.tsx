import React from 'react'
import PropTypes from 'prop-types'
import { Divider, Radio, Space } from 'antd'
import { observable } from 'mobx'
import { observer } from 'mobx-react'

import { store } from '@/store/index'
import { IDateQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import { message } from 'antd'

const questionSheetStore = observable(store.questionSheetStore)

const SettingDate: React.FC<SettingDateProps> = (props) => {
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
      <Divider />
      <div className="s-mt-md">
        <div className="s-text-h5 s-mb-sm">填写格式：</div>
        <div className="s-ml-lg">
          <Radio.Group
            onChange={(e) => {
              questionSheetStore.updateQuestionDispatch('format', { value: e.target.value })
            }}
            value={props.question.format}
          >
            <Space direction="vertical">
              <Radio value="yyyy-MM-DD">年-月-日</Radio>
              <Radio value="MM-DD">月-日</Radio>
            </Space>
          </Radio.Group>
        </div>
      </div>
    </SettingContainer>
  )
}

interface SettingDateProps {
  question: IDateQuestion
}

SettingDate.propTypes = {
  question: PropTypes.any.isRequired
}

export const checkDate = (item: IDateQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }
  if (!item.format) {
    message.error(`第${index + 1}题，填写格式未选择`)
  }
  return true
}

export default observer(SettingDate)
