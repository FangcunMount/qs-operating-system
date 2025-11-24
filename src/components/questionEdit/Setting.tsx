import React from 'react'
import { Divider, message, Popconfirm, Tooltip } from 'antd'
import { observer } from 'mobx-react'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons'
import PropTypes from 'prop-types'

import './setting.scss'

import { questionSheetStore, surveyStore, scaleStore } from '@/store'
import { api } from '@/api'
import { deepCopy } from '@/utils'
import { getSettingComponent } from '@/tools/question'

type StoreType = typeof questionSheetStore | typeof surveyStore | typeof scaleStore

const QuestionSetting: React.FC<{ store?: StoreType }> = ({ store = questionSheetStore }) => {
  const delQuestion = async () => {
    // if question has answer, cannot be deleted
    const [e, r] = await api.getQueryAnsweredCnt(store.id as string, store.currentCode)
    if (!e && Number(r?.data.answered_cnt) <= 0) {
      store.deleteQuestion()
    } else {
      message.error(`该问题已有 ${r?.data.answered_cnt} 个答卷，不可删除！`)
    }
  }

  const copyQuestion = async () => {
    message.loading('复制中...', 0)

    try {
      // 备用， 以便于后续出现复制指定位置的需求
      // const i = -1
      // switch (e.key) {
      // case 'previous':
      //   i = questionSheetStore.currentIndex
      //   break
      // case 'next':
      //   i = questionSheetStore.currentIndex + 1
      //   break
      // case 'start':
      //   i = 0
      //   break
      // case 'end':
      //   i = questionSheetStore.questions.length
      //   break
      // default:
      //   break
      // }
      const q = deepCopy(store.currentQuestion)
      const [, r] = await api.getCodeByType('question', store.id as string)
      q.code = r?.data.code ?? q.code

      if (q.options) {
        for (let i = 0; i < q.options.length; i++) {
          const [, r] = await api.getCodeByType('option', store.id as string)
          q.options[i].code = r?.data.code
        }
      }

      store.addQuestionByPosition(q, store.currentIndex + 1)

      message.destroy()
      message.success('复制完成')
    } catch (error) {
      message.destroy()
      message.success('复制失败')
    }
  }

  return (
    <div className="qs-edit-setting">
      <div className="s-px-sm s-text-h6 s-row" style={{ width: '100%' }}>
        {store.currentCode ? (
          <Tooltip placement="top" title="复制题目">
            <CopyOutlined className="s-my-sm" style={{ fontSize: '18px', flexGrow: 0, cursor: 'pointer' }} onClick={copyQuestion} />
          </Tooltip>
        ) : null}
        <span className="s-row-center" style={{ flexGrow: 1 }}>
          编辑题目
        </span>
        {/* 删除按钮 */}
        {/* 如果当前没有选中，不显示删除按钮 */}
        {store.currentCode ? (
          <Popconfirm placement="top" title="确认要删除该问题吗？" onConfirm={delQuestion} okText="确定" cancelText="取消">
            <DeleteOutlined className="s-my-sm" style={{ fontSize: '18px', flexGrow: 0, cursor: 'pointer' }} />
          </Popconfirm>
        ) : null}
      </div>
      <Divider style={{ margin: '0px' }}></Divider>
      <div className="s-pa-md">
        {React.createElement(getSettingComponent(store.currentQuestion), { question: store.currentQuestion, store })}
      </div>
    </div>
  )
}

QuestionSetting.propTypes = {
  store: PropTypes.any
}

export default observer(QuestionSetting)
