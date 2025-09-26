import React from 'react'
import { Input } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { ITextareaQuestion } from '@/models/question'
import { ITextareaAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const { TextArea } = Input

const ShowTextarea: React.FC<ShowTextareaProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
    <TextArea value={(item as ITextareaAnswer).value} style={{ width: '200px' }} placeholder={item.placeholder} size="small" rows={3} />
  </ShowContainer>
)

type ShowTextareaProps = IQuestionProps<ITextareaQuestion, ITextareaAnswer>
ShowTextarea.propTypes = questionPropTypes

export default observer(ShowTextarea)
