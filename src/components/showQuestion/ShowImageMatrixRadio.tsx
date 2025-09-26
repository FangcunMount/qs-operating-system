import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { IImageMatrixRadioQuestion } from '@/models/question'
import { IImageMatrixRadioAnswer } from '@/models/answerSheet'

const ShowImageMatrixRadio: React.FC<ShowImageMatrixRadioProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}></ShowContainer>
)

type ShowImageMatrixRadioProps = IQuestionProps<IImageMatrixRadioQuestion, IImageMatrixRadioAnswer>
ShowImageMatrixRadio.propTypes = questionPropTypes

export default observer(ShowImageMatrixRadio)
