import React from 'react'
import PropTypes from 'prop-types'
import { ColumnHeightOutlined } from '@ant-design/icons'
import { DropTarget } from 'react-dnd'

const QuestionShowHeader: React.FC<QuestionShowHeaderProps> = ({ title, connectDropTarget, isOver, canDrop }) => {
  return (
    <div
      ref={connectDropTarget}
      style={{
        width: '100%',
        backgroundColor: '#E5F0FF',
        position: 'relative'
      }}
      className="s-row-center s-text-h3 s-px-lg"
    >
      {title}
      {(() => {
        if (isOver && canDrop) {
          return (
            <div style={{ position: 'absolute', top: '100%', width: '100%', height: '1px', backgroundColor: '#000', zIndex: 9999 }}>
              <ColumnHeightOutlined style={{ position: 'absolute', left: '20%', top: '-9px', fontSize: '20px' }} />
              <ColumnHeightOutlined style={{ position: 'absolute', right: '20%', top: '-9px', fontSize: '20px' }} />
            </div>
          )
        } else {
          return ''
        }
      })()}
    </div>
  )
}

interface QuestionShowHeaderProps {
  title: string
  isOver?: any
  canDrop?: any
  connectDropTarget?: any
}

QuestionShowHeader.propTypes = {
  title: PropTypes.any,
  isOver: PropTypes.any,
  canDrop: PropTypes.any,
  connectDropTarget: PropTypes.any
}

export default DropTarget(
  'createQuestion',
  {
    drop: () => ({ index: -1 })
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
  })
)(QuestionShowHeader)
