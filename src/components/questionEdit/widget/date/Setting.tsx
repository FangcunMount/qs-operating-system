import React from 'react'
import PropTypes from 'prop-types'
import { Divider, Radio, Space, message } from 'antd'
import { observer } from 'mobx-react'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { IDateQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import ValidateRulesSetting from '../components/ValidateRulesSetting'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore


const SettingDate: React.FC<SettingDateProps> = (props) => {
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
      <Divider />
      <div className="s-mt-md">
        <div className="s-text-h5 s-mb-sm">填写格式：</div>
        <div className="s-ml-lg">
          <Radio.Group
            onChange={(e) => {
              store.updateQuestionDispatch('format', { value: e.target.value })
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
  store?: StoreType
}

SettingDate.propTypes = {
  question: PropTypes.any.isRequired,
  store: PropTypes.any
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
