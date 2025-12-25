/* eslint-disable react/prop-types */
import React from 'react'
import { IAnswer } from '@/models/answerSheet'
import { getShowComponent } from '@/tools/question'

interface ShowAnswerItemProps {
  item: IAnswer
  index: number
}

const ShowAnswerItem: React.FC<ShowAnswerItemProps> = ({ item, index }) => {
  const handleClick = () => {
    // 答卷详情页面不需要点击交互
  }

  return (
    <div className="answer-item">
      {item.title && (
        <div className="question-title-wrapper">
          <span className="question-title">{item.title}</span>
          {item.tips && (
            <span className="question-tips" title={item.tips}>
              {item.tips}
            </span>
          )}
        </div>
      )}
      {React.createElement(getShowComponent(item), {
        item,
        title: item.title,
        index: index || 0,
        isSelect: false,
        onClick: handleClick
      })}
    </div>
  )
}

export default ShowAnswerItem
