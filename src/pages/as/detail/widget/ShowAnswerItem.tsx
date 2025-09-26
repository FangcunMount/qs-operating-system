import React from 'react'
import PropTypes from 'prop-types'

import { IAnswer } from '@/models/answerSheet'
import { getShowComponent } from '@/tools/question'

const ShowAnswerItem: React.FC<ShowAnswerItemProps> = ({ item, onClick, currentCode }) => {
  return (
    <div>
      {React.createElement(getShowComponent(item), {
        item,
        title: item.title,
        index: 0,
        isSelect: currentCode === item.question_code,
        onClick
      })}
    </div>
  )
}

interface ShowAnswerItemProps {
  item: IAnswer
  index: number
  currentCode: string | null
  onClick: () => void
}

ShowAnswerItem.propTypes = {
  item: PropTypes.any,
  index: PropTypes.any,
  currentCode: PropTypes.any,
  onClick: PropTypes.any
}

export default ShowAnswerItem
