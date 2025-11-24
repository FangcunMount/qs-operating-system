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
        {store.questions.length === 0 ? (
          <div className="qs-edit-empty-state">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="50" fill="#f0f7ff" />
              <path d="M40 50h40M40 60h30M40 70h35" stroke="#1677ff" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <h3 style={{ marginTop: '24px', marginBottom: '8px', fontSize: '16px', fontWeight: 600, color: '#1f2329' }}>
              还没有添加问题
            </h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#646a73' }}>
              从左侧选择题型开始创建您的问卷
            </p>
          </div>
        ) : (
          <SortableGifsContainer axis="y" onSortEnd={onSortEnd}>
            {store.questions.map((v, i) => (
              <ShowQuestionItem key={v.code} item={v} index={i} currentIndex={i} store={store} />
            ))}
          </SortableGifsContainer>
        )}
      </div>
    </div>
  )
}

QuestionShow.propTypes = {
  showContainerRef: PropTypes.any,
  store: PropTypes.any
}

export default observer(QuestionShow)
