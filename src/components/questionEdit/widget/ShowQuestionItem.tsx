import React from 'react'
import PropTypes from 'prop-types'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import { DropTarget } from 'react-dnd'
import { ColumnHeightOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react'

import { IQuestion } from '@/models/question'
import { getShowComponent } from '@/tools/question'
import { questionSheetStore, surveyStore, scaleStore } from '@/store'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const dropIconStyle: React.CSSProperties = {
  position: 'absolute',
  top: '-9px',
  fontSize: '20px'
}
const dropLineStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  width: '100%',
  height: '1px',
  backgroundColor: '#000',
  zIndex: 9999
}

const ShowQuestionItem: React.FC<ShowQuestionItemProps> = ({
  item,
  currentIndex,
  connectDropTarget,
  canDrop,
  isOver,
  store = questionSheetStore
}) => {
  const selectQuestion = (code: string) => {
    store.setCurrentCode(code)
  }

  return (
    <div style={{ position: 'relative' }} ref={connectDropTarget}>
      {isOver && canDrop ? (
        <div style={dropLineStyle}>
          <ColumnHeightOutlined style={{ ...dropIconStyle, left: '20%' }} />
          <ColumnHeightOutlined style={{ ...dropIconStyle, right: '20%' }} />
        </div>
      ) : null}

      {React.createElement(getShowComponent(item), {
        item,
        title: `${currentIndex + 1}. ${item.title}`,
        isSelect: store.currentCode === item.code,
        onClick: () => {
          selectQuestion(item.code)
        }
      })}
    </div>
  )
}

interface ShowQuestionItemProps {
  item: IQuestion
  currentIndex: number
  index: number
  connectDropTarget: any
  isOver: any
  canDrop: any
  store?: StoreType
}

ShowQuestionItem.propTypes = {
  connectDropTarget: PropTypes.any,
  isOver: PropTypes.any,
  canDrop: PropTypes.any,
  item: PropTypes.any,
  currentIndex: PropTypes.any,
  index: PropTypes.any,
  store: PropTypes.any
}

export const SortableGifsContainer = SortableContainer(({ children }: any) => <div className="gifs">{children}</div>)

export default DropTarget(
  'createQuestion',
  {
    drop: (props: ShowQuestionItemProps) => {
      return { index: props.index }
    }
  },
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop()
  })
)(SortableElement(observer(ShowQuestionItem)))
