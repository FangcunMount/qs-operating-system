import React, { useEffect, useState } from 'react'
import { Radio, Space, Input } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IAnswerImageRadioOption, IImageRadioAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'
import { IImageRadioQuestion } from '@/models/question'

const ShowImageRadio: React.FC<ShowImageRadioProps> = ({ item, title, isSelect, onClick }) => {
  const [value, setValue] = useState<string | undefined>('')

  useEffect(() => {
    for (let i = 0; i < item.options.length; i++) {
      const option = item.options[i] as IAnswerImageRadioOption
      if (option.is_select && option.is_select === '1') {
        setValue(option.code)
        break
      }
    }
  }, [item])

  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <Radio.Group value={value} style={{ width: '100%' }}>
        <Space direction="vertical">
          {item.options.map((v) => {
            return (
              <Radio key={v.code} value={v.code}>
                <div className="s-col">
                  <span className="s-no-wrap">
                    <img style={{ width: '50px' }} src={v.img_url} alt="未上传" />
                  </span>

                  <span className="s-no-wrap" style={{ flexGrow: 1 }}>
                    <span>{v.content}</span>
                  </span>

                  {v.allow_extend_text === '1' || (v.allow_extend_text as unknown as boolean) === true ? (
                    <span className="s-pt-xs">
                      <Input value={v.extend_content} style={{ width: '100px' }} size="small" />
                    </span>
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

type ShowImageRadioProps = IQuestionProps<IImageRadioQuestion, IImageRadioAnswer>
ShowImageRadio.propTypes = questionPropTypes

export default observer(ShowImageRadio)
