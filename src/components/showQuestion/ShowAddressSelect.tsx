import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { IAddressSelectQuestion } from '@/models/question'
import { IAddressSelectAnswer } from '@/models/answerSheet'

const ShowAddressSelect: React.FC<ShowAddressSelectProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}></ShowContainer>
)

type ShowAddressSelectProps = IQuestionProps<IAddressSelectQuestion, IAddressSelectAnswer>
ShowAddressSelect.propTypes = questionPropTypes

export default observer(ShowAddressSelect)
