import React from 'react'
import { observer } from 'mobx-react'
import { Checkbox, Space, Input } from 'antd'

import ShowContainer from './ShowContainer'
import { ICheckBoxQuestion } from '@/models/question'
import { IAnswerCheckBoxOption, ICheckBoxAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowCheckBox: React.FC<ShowCheckBoxProps> = ({ title, item, isSelect, onClick }) => {
  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <Space direction="vertical">
        {item.options.map((v) => {
          return (
            <Checkbox key={v.code} value={v.code} checked={(v as IAnswerCheckBoxOption)?.is_select === '1'}>
              {v.content}
              {v.allow_extend_text === '1' && v.content ? (
                <Input value={v.extend_content} style={{ width: '200px' }} className="s-ml-sm" size="small" />
              ) : null}
            </Checkbox>
          )
        })}
      </Space>
    </ShowContainer>
  )
}

type ShowCheckBoxProps = IQuestionProps<ICheckBoxQuestion, ICheckBoxAnswer>
ShowCheckBox.propTypes = questionPropTypes

export default observer(ShowCheckBox)
