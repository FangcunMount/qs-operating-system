import React from 'react'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { ISectionQuestion } from '@/models/question'
import { ISectionAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowSection: React.FC<ShowSectionProps> = ({ title, item, isSelect, onClick }) => {
  return <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick} />
}

type ShowSectionProps = IQuestionProps<ISectionQuestion, ISectionAnswer>
ShowSection.propTypes = questionPropTypes

export default observer(ShowSection)
