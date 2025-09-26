import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { IImageMatrixCheckBoxQuestion } from '@/models/question'
import { IImageMatrixCheckBoxAnswer } from '@/models/answerSheet'

const ShowImageMatrixCheckBox: React.FC<ShowImageMatrixCheckBoxProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}></ShowContainer>
)

type ShowImageMatrixCheckBoxProps = IQuestionProps<IImageMatrixCheckBoxQuestion, IImageMatrixCheckBoxAnswer>
ShowImageMatrixCheckBox.propTypes = questionPropTypes

export default observer(ShowImageMatrixCheckBox)
