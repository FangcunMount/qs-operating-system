import React from 'react'
import { observable } from 'mobx'
import { observer } from 'mobx-react'
import { Divider } from 'antd'
import PropTypes from 'prop-types'

import { store } from '@/store'
import './show.scss'
import ShowQuestionItem, { SortableGifsContainer } from './widget/ShowQuestionItem'
import ShowQuestionShowHeader from './widget/ShowQuestionHeader'

const questionSheetStore = observable(store.questionSheetStore)

const QuestionShow: React.FC<{ showContainerRef: any }> = ({ showContainerRef }) => {
  const onSortEnd = (e: any) => {
    questionSheetStore.changeQuestionPosition(e.oldIndex, e.newIndex)
  }

  return (
    <div className="qs-edit-show">
      <div className="qs-edit-show-list s-mx-lg s-bg-white" ref={showContainerRef}>
        <ShowQuestionShowHeader title={questionSheetStore.title}></ShowQuestionShowHeader>
        <Divider className="s-ma-none"></Divider>
        <SortableGifsContainer axis="y" onSortEnd={onSortEnd}>
          {questionSheetStore.questions.map((v, i) => (
            <ShowQuestionItem key={v.code} item={v} index={i} currentIndex={i} />
          ))}
        </SortableGifsContainer>
      </div>
    </div>
  )
}

QuestionShow.propTypes = {
  showContainerRef: PropTypes.any
}

export default observer(QuestionShow)
