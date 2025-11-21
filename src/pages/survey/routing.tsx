import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'

import './routing.scss'
import { getShowControllerList } from '@/api/path/showController'

import ModifyShowController from '@/components/showController/ModifyShowController'
import ShowControllerCard from '@/components/showController/ShowControllerCard'

import { surveyStore } from '@/store'
import { api } from '@/api'
import { IQuestionShowController } from '@/models/question'
import BaseLayout from '@/components/layout/BaseLayout'

const SurveyRouting: React.FC = () => {
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
    surveyStore.setSurvey(qr?.data.questionsheet)
    const [e, r] = await api.getQuestionList(questionsheetid)
    if (e) return
    surveyStore.setSurveyQuestions(r?.data.list ?? [])
    message.destroy()
  }

  const handleSave = async () => {
    message.loading({ content: '保存中', duration: 0, key: 'save' })
    // TODO: 实现路由保存 API
    // const [e] = await api.modifyQuestionShowController(questionsheetid, showControllerList)
    // if (e) throw e
    message.destroy()
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置保存成功')
      surveyStore.nextStep()
    }
    if (status === 'fail') {
      message.error(`路由设置保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <BaseLayout
      header='设置题目路由'
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['break', 'breakToQsList', 'saveToQsList', 'saveToNext']}
      nextUrl={'/survey/list'}
    >
      <>
        <div className='qs-router-container'>
          <div className='qs-router-list'>
            {showControllerList.map((v) => (
              <ShowControllerCard
                key={v.code}
                code={v.code}
                showController={v.show_controller}
                store={surveyStore}
                onEdit={(code) => {
                  setCurrentQuestionCode(code)
                  setModifyShowControllerVisible(true)
                }}
              />
            ))}
          </div>
        </div>

        <ModifyShowController
          isModalVisible={modifyShowControllerVisible}
          questionCode={currentQuestionCode}
          questionsheetid={questionsheetid}
          store={surveyStore}
          ok={() => {
            initShowController()
            setModifyShowControllerVisible(false)
          }}
          close={() => {
            setModifyShowControllerVisible(false)
          }}
        />
      </>
    </BaseLayout>
  )
}

export default SurveyRouting
