import React from 'react'
import PropTypes from 'prop-types'
import { observer } from 'mobx-react'

import './showContainer.scss'

const ShowContainer: React.FC<ShowContainerProps> = ({ title, tips, children, isSelectedQuestion, onClick }) => {
  const getCurrentClass = () => {
    let tmpClass = 's-pa-md show-container '
    tmpClass += isSelectedQuestion ? 'show-container-selected' : ''
    return tmpClass
  }

  return (
    <div style={{ width: '100%' }}>
      <div className={getCurrentClass()} style={{ borderBottom: '1px solid #eee' }} onClick={onClick}>
        <div className="s-text-h4">
          <span>{title}</span>
        </div>
        <div className="s-text-grey-8 s-mt-sm s-ml-md">{tips}</div>
        <div className="s-mt-sm s-ml-md">{children}</div>
      </div>
    </div>
  )
}

interface ShowContainerProps {
  title: string
  tips: string
  children?: PropTypes.ReactNodeLike
  isSelectedQuestion: boolean
  onClick: () => void
}

ShowContainer.propTypes = {
  title: PropTypes.string.isRequired,
  tips: PropTypes.string.isRequired,
  children: PropTypes.node,
  isSelectedQuestion: PropTypes.any,
  onClick: PropTypes.any
}

export default observer(ShowContainer)
