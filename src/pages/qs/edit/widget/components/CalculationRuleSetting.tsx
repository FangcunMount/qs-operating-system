import React, { useState } from 'react'
import { Radio, Space } from 'antd'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react-lite'
import { ICheckBoxQuestion, IImageCheckBoxQuestion } from '@/models/question'
import { observable } from 'mobx'
import { store } from '@/store'

const questionSheetStore = observable(store.questionSheetStore)

const defaultRules = [
  { key: 'sum', label: '求和分' },
  { key: 'avg', label: '平均分' },
  { key: 'max', label: '最大分' }
]

const CalculationRuleSetting: React.FC<CalculationRuleSettingProps> = ({ question }) => {
  const [rules] = useState(defaultRules)
  return (
    <div>
      <div className="s-text-h5 s-mb-sm">计算规则：</div>
      <Radio.Group
        value={question.calc_rule.formula}
        onChange={(e) => questionSheetStore.updateQuestionDispatch('formula', { value: e.target.value })}
      >
        <Space direction="vertical">
          {rules.map((rule) => {
            return (
              <Radio key={rule.key} value={rule.key}>
                {rule.label}
              </Radio>
            )
          })}
        </Space>
      </Radio.Group>
    </div>
  )
}

interface CalculationRuleSettingProps {
  question: ICheckBoxQuestion | IImageCheckBoxQuestion
}

CalculationRuleSetting.propTypes = {
  question: PropTypes.any.isRequired
}

export default observer(CalculationRuleSetting)
