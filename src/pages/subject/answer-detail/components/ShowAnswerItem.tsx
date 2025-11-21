/* eslint-disable react/prop-types */
import React from 'react'
import { IAnswer } from '@/models/answerSheet'
import { getShowComponent } from '@/tools/question'

interface ShowAnswerItemProps {
  item: IAnswer
  index: number
}

const ShowAnswerItem: React.FC<ShowAnswerItemProps> = ({ item }) => {
  const handleClick = () => {
    // 答卷详情页面不需要点击交互
  }

  return (
    <div className="answer-item">
      {React.createElement(getShowComponent(item), {
        item,
        title: item.title,
        index: 0,
        isSelect: false,
        onClick: handleClick
      })}
    </div>
  )
}

export default ShowAnswerItem
