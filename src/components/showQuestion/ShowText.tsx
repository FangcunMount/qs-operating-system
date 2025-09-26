import React from 'react'
import { Input } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { ITextQuestion } from '@/models/question'
import { ITextAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowText: React.FC<ShowTextProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
    <Input value={(item as ITextAnswer).value} style={{ width: '200px' }} placeholder={item.placeholder} />
  </ShowContainer>
)

type ShowTextProps = IQuestionProps<ITextQuestion, ITextAnswer>
ShowText.propTypes = questionPropTypes

export default observer(ShowText)
