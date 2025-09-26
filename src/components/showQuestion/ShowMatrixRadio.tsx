import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { IMatrixRadioQuestion } from '@/models/question'
import { IMatrixRadioAnswer } from '@/models/answerSheet'

const ShowMatrixRadio: React.FC<ShowMatrixRadioProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}></ShowContainer>
)

type ShowMatrixRadioProps = IQuestionProps<IMatrixRadioQuestion, IMatrixRadioAnswer>
ShowMatrixRadio.propTypes = questionPropTypes

export default observer(ShowMatrixRadio)
