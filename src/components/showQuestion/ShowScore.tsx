import React, { useEffect, useState } from 'react'
import { Rate } from 'antd'
import { observer } from 'mobx-react'

import ShowContainer from './ShowContainer'
import { IScoreRadioQuestion } from '@/models/question'
import { IAnswerScoreRadioOption, IScoreRadioAnswer } from '@/models/answerSheet'
import { IQuestionProps, questionPropTypes } from './type'

const ShowScoreRadio: React.FC<ShowScoreRadioProps> = ({ item, title, isSelect, onClick }) => {
  const [value, setValue] = useState<number | undefined>(void 0)

  useEffect(() => {
    const selectOption = item.options.filter((v) => (v as IAnswerScoreRadioOption).is_select === '1')[0]
    if (selectOption) {
      const startScore = Math.min(...item.options.map((v) => Number(v.content)))
      setValue(Number(selectOption.content) - startScore + 1)
    } else {
      setValue(void 0)
    }
  }, [item])

  return (
    <ShowContainer title={title} tips={item.tips} isSelectedQuestion={isSelect} onClick={onClick}>
      <div className="s-row" style={{ alignItems: 'center' }}>
        <span className="s-mr-sm s-mt-xs">{item.left_desc}</span>
        <Rate value={value} count={item.options.length} />
        <span className="s-ml-sm s-mt-xs">{item.right_desc}</span>
      </div>
    </ShowContainer>
  )
}

type ShowScoreRadioProps = IQuestionProps<IScoreRadioQuestion, IScoreRadioAnswer>
ShowScoreRadio.propTypes = questionPropTypes

export default observer(ShowScoreRadio)
