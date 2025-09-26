import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'
import { PlusOutlined } from '@ant-design/icons'

import './index.scss'
import { getShowControllerList } from '@/api/path/showController'

import ModifyShowController from './weight/ModifyShowController'
import ShowControllerCard from './weight/ShowControllerCard'

import { observable } from 'mobx'
import { store } from '@/store'
import { api } from '@/api'
import { IQuestionShowController } from '@/models/question'
import BaseLayout from '@/components/layout/BaseLayout'

const questionSheetStore = observable(store.questionSheetStore)

const QsRouter: React.FC = () => {
  // 获取url参数
  const { questionsheetid } = useParams<{ questionsheetid: string }>()

  const [showControllerList, setShowControllerList] = useState<{ code: string; show_controller: IQuestionShowController }[]>([])

  // modify dialog controller
  const [currentQuestionCode, setCurrentQuestionCode] = useState<string | null>(null)
  const [modifyShowControllerVisible, setModifyShowControllerVisible] = useState<boolean>(false)

  useEffect(() => {
    initQuestionSheet().then(() => {
      initShowController()
    })
  }, [])

  const initShowController = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })

    const [e, r] = await getShowControllerList(questionsheetid)
    if (!e && r) {
      setShowControllerList(r.data.list)
    }

    message.destroy()
    message.success({ content: '加载成功!', key: 'fetch', duration: 2 })
  }

  const initQuestionSheet = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    const [qe, qr] = await api.getQuestionSheet(questionsheetid)
    if (qe) return
    questionSheetStore.setQuestionSheet(qr?.data.questionsheet)
    const [e, r] = await api.getQuestionList(questionsheetid)
    if (e) return
    questionSheetStore.setQuestionSheetQuestions(r?.data.list ?? [])
  }

  return (
    <BaseLayout
      header="录入题目显隐规则"
      footerButtons={['break', 'breakToQsList', 'saveToQsList', 'saveToNext']}
      nextUrl={`/qs/factor/${questionsheetid}`}
    >
      <div className="qs-controller--content">
        <ModifyShowController
          close={() => {
            setModifyShowControllerVisible(false)
          }}
          ok={() => {
            initShowController()
            setModifyShowControllerVisible(false)
          }}
          questionsheetid={questionsheetid}
          questionCode={currentQuestionCode}
          isModalVisible={modifyShowControllerVisible}
        ></ModifyShowController>
        <div className="qs-controller--content__list">
          {showControllerList.map((v) => {
            return (
              <ShowControllerCard
                key={v.code}
                code={v.code}
                showController={v.show_controller}
                onEdit={(code) => {
                  setCurrentQuestionCode(code)
                  setModifyShowControllerVisible(true)
                }}
              />
            )
          })}
          <div
            className="qs-controller--content__add s-mt-xl s-ml-xl"
            onClick={() => {
              setCurrentQuestionCode(null)
              setModifyShowControllerVisible(true)
            }}
          >
            <PlusOutlined />
            <span>添加题目关联规则</span>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
}

export default QsRouter
