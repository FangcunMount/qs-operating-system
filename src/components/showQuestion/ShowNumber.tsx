import React from 'react'
import { Input } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { INumberQuestion } from '@/models/question'
import { INumberAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowNumber: React.FC<ShowNumberProps> = ({ title, item, isSelect, onClick }) => {
  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <Input value={(item as INumberAnswer).value} style={{ width: '200px' }} placeholder={item.placeholder} />
    </ShowContainer>
  )
}

type ShowNumberProps = IQuestionProps<INumberQuestion, INumberAnswer>
ShowNumber.propTypes = questionPropTypes

export default observer(ShowNumber)
