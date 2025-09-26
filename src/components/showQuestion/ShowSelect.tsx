import React, { useEffect, useState } from 'react'
import { Select } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { ISelectQuestion } from '@/models/question'
import { IAnswerSelectOption, ISelectAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const { Option } = Select

const ShowSelect: React.FC<ShowSelectProps> = ({ item, title, isSelect, onClick }) => {
  const [value, setValue] = useState<string | undefined>('')

  useEffect(() => {
    for (let i = 0; i < item.options.length; i++) {
      const option = item.options[i] as IAnswerSelectOption
      if (option.is_select && option.is_select === '1') {
        setValue(option.code)
        break
      }
    }
  }, [item])

  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <Select value={value} style={{ width: 200 }}>
        {item.options.map((v) => {
          return (
            <Option key={v.code} value={v.code as string}>
              <div className="s-row">
                <span className="s-no-wrap" style={{ flexGrow: 1 }}>
                  {v.content}
                </span>
              </div>
            </Option>
          )
        })}
      </Select>
    </ShowContainer>
  )
}

type ShowSelectProps = IQuestionProps<ISelectQuestion, ISelectAnswer>
ShowSelect.propTypes = questionPropTypes

export default observer(ShowSelect)
