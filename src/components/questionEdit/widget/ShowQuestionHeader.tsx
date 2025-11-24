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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        padding: '32px 40px',
        color: '#fff'
      }}
      className="s-row-center"
    >
      <div style={{ 
        fontSize: '24px', 
        fontWeight: 600, 
        textAlign: 'center',
        lineHeight: '1.4',
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}>
        {title}
      </div>
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
