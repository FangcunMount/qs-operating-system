import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { IMatrixCheckBoxQuestion } from '@/models/question'
import { IMatrixCheckBoxAnswer } from '@/models/answerSheet'

const ShowMatrixCheckBox: React.FC<ShowMatrixCheckBoxProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}></ShowContainer>
)

type ShowMatrixCheckBoxProps = IQuestionProps<IMatrixCheckBoxQuestion, IMatrixCheckBoxAnswer>
ShowMatrixCheckBox.propTypes = questionPropTypes

export default observer(ShowMatrixCheckBox)
