import React from 'react'
import { DatePicker } from 'antd'
import { observer } from 'mobx-react'
import moment from 'moment'

import ShowContainer from './ShowContainer'
import { IDateQuestion } from '@/models/question'
import { IDateAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowDate: React.FC<ShowDateProps> = ({ title, item, isSelect, onClick }) => {
  const getMomentValue = (v: IDateAnswer) => {
    return v.value ? moment(v.value, v.format) : null
  }

  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <DatePicker style={{ width: '200px' }} format={item.format} value={getMomentValue(item as IDateAnswer)} />
    </ShowContainer>
  )
}

type ShowDateProps = IQuestionProps<IDateQuestion, IDateAnswer>
ShowDate.propTypes = questionPropTypes

export default observer(ShowDate)
