import React from 'react'
import { observer } from 'mobx-react'
import { Divider } from 'antd'
import PropTypes from 'prop-types'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import './show.scss'
import ShowQuestionItem, { SortableGifsContainer } from './widget/ShowQuestionItem'
import ShowQuestionShowHeader from './widget/ShowQuestionHeader'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const QuestionShow: React.FC<{ 
  showContainerRef: any
  store?: StoreType
}> = ({ showContainerRef, store = questionSheetStore }) => {
  const onSortEnd = (e: any) => {
    store.changeQuestionPosition(e.oldIndex, e.newIndex)
  }

  return (
    <div className="qs-edit-show">
      <div className="qs-edit-show-list s-mx-lg s-bg-white" ref={showContainerRef}>
        <ShowQuestionShowHeader title={store.title}></ShowQuestionShowHeader>
        <Divider className="s-ma-none"></Divider>
        <SortableGifsContainer axis="y" onSortEnd={onSortEnd}>
          {store.questions.map((v, i) => (
            <ShowQuestionItem key={v.code} item={v} index={i} currentIndex={i} store={store} />
          ))}
        </SortableGifsContainer>
      </div>
    </div>
  )
}

QuestionShow.propTypes = {
  showContainerRef: PropTypes.any,
  store: PropTypes.any
}

export default observer(QuestionShow)
