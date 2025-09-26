import React, { useEffect, useState } from 'react'
import { Radio, Space, Input } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IRadioQuestion } from '@/models/api/questionApi'
import { IAnswerRadioOption, IRadioAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowRadio: React.FC<ShowRadioProps> = ({ item, title, isSelect, onClick }) => {
  const [value, setValue] = useState<string | undefined>('')

  useEffect(() => {
    for (let i = 0; i < item.options.length; i++) {
      const option = item.options[i] as IAnswerRadioOption
      if (option.is_select && option.is_select === '1') {
        setValue(option.code)
        break
      }
    }
  }, [item])

  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <Radio.Group value={value}>
        <Space direction="vertical">
          {item.options.map((v) => {
            return (
              <Radio key={v.code} value={v.code}>
                <div className="s-row">
                  <span className="s-no-wrap" style={{ flexGrow: 1 }}>
                    {v.content}
                  </span>
                  {(v.allow_extend_text === '1' || (v.allow_extend_text as unknown as boolean) === true) && v.content ? (
                    <Input value={v.extend_content} style={{ width: '200px' }} className="s-ml-sm" size="small" />
                  ) : null}
                </div>
              </Radio>
            )
          })}
        </Space>
      </Radio.Group>
    </ShowContainer>
  )
}

type ShowRadioProps = IQuestionProps<IRadioQuestion, IRadioAnswer>
ShowRadio.propTypes = questionPropTypes

export default observer(ShowRadio)
