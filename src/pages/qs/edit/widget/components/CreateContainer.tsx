import React from 'react'
import PropTypes from 'prop-types'
import { Button } from 'antd'

import { IQuestion } from '@/models/question'
import { ConnectDragSource, DragSource } from 'react-dnd'

const CreateContainer: React.FC<CreateContainerProps> = (props) => {
  return (
    <Button
      ref={props.connectDragSource}
      className={props.class}
      style={{ opacity: props.isDragging ? 0.4 : 1 }}
      icon={props.icon}
      disabled={props.disabled}
      onClick={() => {
        props.onClick(props.question)
      }}
    >
      {props.typeStr}
    </Button>
  )
}

interface CreateContainerProps {
  question: IQuestion
  connectDragSource: ConnectDragSource
  isDragging: boolean
  class: string
  typeStr: string
  icon: PropTypes.ReactNodeLike
  disabled?: boolean
  onClick: (v: IQuestion, i?: number) => void
}

CreateContainer.propTypes = {
  question: PropTypes.any.isRequired,
  connectDragSource: PropTypes.any,
  isDragging: PropTypes.any,
  class: PropTypes.any,
  typeStr: PropTypes.any.isRequired,
  icon: PropTypes.any.isRequired,
  disabled: PropTypes.any,
  onClick: PropTypes.func.isRequired
}

export default DragSource(
  'createQuestion',
  {
    beginDrag: () => {
      return { name: 'Textarea' }
    },
    endDrag(props: CreateContainerProps, monitor) {
      const dropResult = monitor.getDropResult()
      dropResult && props.onClick(props.question, dropResult.index)
    }
  },
  (connect, monitor) => {
    return {
      connectDragSource: connect.dragSource(),
      isDragging: monitor.isDragging()
    }
  }
)(CreateContainer)
