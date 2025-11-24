import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'

import './routing.scss'
import '@/components/editorSteps/index.scss'
import { getShowControllerList } from '@/api/path/showController'
import ModifyShowController from '@/components/showController/ModifyShowController'
import ShowControllerCard from '@/components/showController/ShowControllerCard'

import { surveyStore } from '@/store'
import { IQuestionShowController } from '@/models/question'
import BaseLayout from '@/components/layout/BaseLayout'

const SurveyRouting: React.FC = () => {
  const { questionsheetid } = useParams<{ questionsheetid: string }>()

  const [showControllerList, setShowControllerList] = useState<{ code: string; show_controller: IQuestionShowController }[]>([])

  // modify dialog controller
  const [currentQuestionCode, setCurrentQuestionCode] = useState<string | null>(null)
  const [modifyShowControllerVisible, setModifyShowControllerVisible] = useState<boolean>(false)

  useEffect(() => {
    // 如果从创建页进入且 store 已有数据，则复用本地；否则进行一次初始化
    if (surveyStore.id && surveyStore.id === questionsheetid && surveyStore.questions.length > 0) {
      setShowControllerList(surveyStore.showControllers)
    } else {
      initQuestionSheet().then(() => {
        setShowControllerList(surveyStore.showControllers)
      })
    }
  }, [questionsheetid])

  const initQuestionSheet = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    try {
      await surveyStore.initEditor(questionsheetid)
      // 补充加载显隐规则（仅在刷新后需要）
      const [ce, cr] = await getShowControllerList(questionsheetid)
      if (!ce && cr) {
        surveyStore.setShowControllers(cr.data.list)
        setShowControllerList(cr.data.list)
      } else {
        setShowControllerList(surveyStore.showControllers)
      }
      message.destroy()
    } catch (error) {
      message.destroy()
      message.error('加载问卷失败')
    }
  }

  const handleSave = async () => {
    // 前端暂存，不触发接口
    surveyStore.setCurrentStep('publish')
  }

  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存到本地，发布时统一提交')
      surveyStore.nextStep()
    }
    if (status === 'fail') {
      message.error(`路由设置保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <BaseLayout
      submitFn={handleSave}
      afterSubmit={handleAfterSubmit}
      footerButtons={['saveToNext']}
      nextUrl={`/survey/publish/${questionsheetid}`}
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
          store={surveyStore}
          ok={() => {
            setShowControllerList([...surveyStore.showControllers])
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
