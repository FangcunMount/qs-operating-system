import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'

import '../survey/QuestionRouting.scss'
import { getShowControllerList } from '@/api/path/showController'

import ModifyShowController from '@/components/showController/ModifyShowController'
import ShowControllerCard from '@/components/showController/ShowControllerCard'

import { scaleStore } from '@/store'
import { api } from '@/api'
import { IQuestionShowController } from '@/models/question'
import BaseLayout from '@/components/layout/BaseLayout'

const ScaleRouting: React.FC = () => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()

  const [showControllerList, setShowControllerList] = useState<{ code: string; show_controller: IQuestionShowController }[]>([])

  // modify dialog controller
  const [currentQuestionCode, setCurrentQuestionCode] = useState<string | null>(null)
  const [modifyShowControllerVisible, setModifyShowControllerVisible] = useState<boolean>(false)

  useEffect(() => {
    // 有缓存直接用，否则初始化一次
    if (scaleStore.id && scaleStore.id === questionsheetid && scaleStore.questions.length > 0) {
      setShowControllerList(scaleStore.showControllers)
    } else {
      initQuestionSheet().then(() => {
        setShowControllerList(scaleStore.showControllers)
      })
    }
  }, [questionsheetid])

  const initShowController = async () => {
    try {
      message.loading({ content: '加载中', duration: 0, key: 'fetch' })
      const [e, r] = await getShowControllerList(questionsheetid)
      if (!e && r) {
        setShowControllerList(r.data.list)
        scaleStore.setShowControllers(r.data.list)
      }
      message.success({ content: '加载成功!', key: 'fetch', duration: 2 })
    } catch (error) {
      setShowControllerList(scaleStore.showControllers)
    } finally {
      message.destroy('fetch')
    }
  }

  const initQuestionSheet = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    const [qe, qr] = await api.getQuestionSheet(questionsheetid)
    if (qe) return
    scaleStore.setScale(qr?.data.questionsheet)
    const [e, r] = await api.getQuestionList(questionsheetid)
    if (e) return
    scaleStore.setScaleQuestions(r?.data.list ?? [])
    if (questionsheetid && questionsheetid !== 'new') {
      const [ce, cr] = await getShowControllerList(questionsheetid)
      if (!ce && cr) {
        scaleStore.setShowControllers(cr.data.list)
      }
    }
    message.destroy()
  }

  const handleSave = async () => {
    // 前端暂存，不触发接口
    scaleStore.setCurrentStep('edit-factors')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存到本地，发布时统一提交')
      scaleStore.nextStep()
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
      footerButtons={['saveToNext']}
      nextUrl={`/qs/factor/${questionsheetid}`}
    >
      <>
        <div className='qs-router-container'>
          <div className='qs-router-list'>
            {showControllerList.map((v) => (
              <ShowControllerCard
                key={v.code}
                code={v.code}
                showController={v.show_controller}
                store={scaleStore}
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
          store={scaleStore}
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

export default ScaleRouting
