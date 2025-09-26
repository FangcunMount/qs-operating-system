import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IQuestionProps, questionPropTypes } from './type'
import { ICascaderSelectQuestion } from '@/models/question'
import { ICascaderSelectAnswer } from '@/models/answerSheet'

const ShowCascaderSelect: React.FC<ShowCascaderSelectProps> = ({ title, item, isSelect, onClick }) => (
  <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}></ShowContainer>
)

type ShowCascaderSelectProps = IQuestionProps<ICascaderSelectQuestion, ICascaderSelectAnswer>
ShowCascaderSelect.propTypes = questionPropTypes

export default observer(ShowCascaderSelect)
