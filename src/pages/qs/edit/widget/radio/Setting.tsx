import React from 'react'
import { observable } from 'mobx'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'
import { Divider, message } from 'antd'

import { store } from '@/store'
import { IRadioQuestion } from '@/models/question'
import SettingContainer from '../components/SettingContainer'
import CalculationSetting from '../components/CalculationSetting'
import OptionSetting from '../components/OptionSetting'
import ValidateRulesSetting from '../components/ValidateRulesSetting'
import { api } from '@/api'

const questionSheetStore = observable(store.questionSheetStore)

const TypeRadio: React.FC<TypeRadioProps> = (props) => {
  return (
    <SettingContainer
      title={props.question.title}
      tips={props.question.tips}
      handleChange={(k, v) => {
        questionSheetStore.updateQuestionDispatch(k, { value: v })
      }}
    >
      <Divider />
      <OptionSetting
        options={props.question.options}
        deleteOption={(index) =>
          questionSheetStore.updateQuestionDispatch('option', { type: 'delete', index: index })
        }
        addOption={async (item) => {
          const [, r] = await api.getCodeByType('option', questionSheetStore.id as string)
          item.code = r?.data.code as string
          questionSheetStore.updateQuestionDispatch('option', { type: 'add', value: item })
        }
          
        }
        changeOption={(i, k, v) =>
          questionSheetStore.updateQuestionDispatch('option', { type: k, index: i, value: v })
        }
      />
      <Divider />
      <ValidateRulesSetting
        validateRules={props.question.validate_rules}
        changeValidate={(k, v) =>
          questionSheetStore.updateQuestionDispatch('validate', { key: k, value: v })
        }
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

export interface TypeRadioProps {
  question: IRadioQuestion
}

TypeRadio.propTypes = {
  question: PropTypes.any.isRequired
}


export const checkRadio = (item: IRadioQuestion, index: number): boolean => {
  if (!item.title) {
    message.error(`第${index + 1}题，题目名称未填写`)
    return false
  }

  if (item.options && item.options.length < 1) {
    message.error(`第${index + 1}题，无选项`)
    return false
  } else {
    for (let i = 0; i < item.options.length; i++) {
      const element = item.options[i]
      if (!element.content) {
        message.error(`第${index + 1}题，第${i + 1}个选项没有内容`)
        return false
      }
    }
  }

  return true
}

export default observer(TypeRadio)
