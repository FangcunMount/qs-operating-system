import React, { useEffect } from 'react'
import { message } from 'antd'
import { useParams, useLocation } from 'react-router'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/components/editorSteps/index.scss'
import '@/styles/theme-scale.scss'
import { getShowControllerList } from '@/api/path/showController'
import { scaleStore } from '@/store'
import { bindQuestionnaireEditingPort, QuestionRoutingWorkspace } from '@/features/assessment-editor'
import BaseLayout from '@/components/layout/BaseLayout'
import { getScaleEditorPath, SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'
import { useHistory } from 'react-router-dom'

const scaleRoutingEditor = bindQuestionnaireEditingPort(scaleStore, () => scaleStore.id || '')

const QuestionRouting: React.FC = observer(() => {
  const history = useHistory()
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const scaleCode = new URLSearchParams(location.search).get('scaleCode') || undefined

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

    history.push(getScaleEditorPath(step.key || '', scaleStore.id, scaleStore.scaleCode || scaleCode))
  }

  // 从服务器加载量表和显隐规则
  const loadDataFromServer = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    try {
      await scaleStore.initEditor(questionsheetid, scaleCode)

      const [error, response] = await getShowControllerList(questionsheetid)
      if (!error && response) {
        scaleStore.setShowControllers(response.data.list)
      }

      message.destroy()
    } catch (error) {
      message.destroy()
      message.error('加载量表失败')
    }
  }

  // 初始化数据
  useEffect(() => {
    // 根据路由自动设置当前步骤
    scaleStore.setCurrentStep('set-routing')

    const initPageData = async () => {
      // 先尝试从 localStorage 恢复
      const restored = scaleStore.loadFromLocalStorage(questionsheetid)

      // 如果恢复成功且 ID 匹配且有题目数据，直接使用
      if (restored && scaleStore.id === questionsheetid && scaleStore.questions.length > 0) {
        console.log('routing 页面从 localStorage 恢复数据成功', {
          id: scaleStore.id,
          questionCount: scaleStore.questions.length,
          showControllerCount: scaleStore.showControllers.length
        })
        return
      }

      // 否则从服务器加载
      console.log('routing 页面从服务器加载数据')
      await loadDataFromServer()
    }

    initPageData()
  }, [questionsheetid, location.pathname])

  // 保存路由设置（通过批量更新接口提交，包含显隐规则）
  const handleSave = async () => {
    if (!scaleStore.id) {
      throw new Error('量表 ID 不能为空')
    }

    if (scaleStore.questions.length === 0) {
      throw new Error('请先添加问题')
    }

    try {
      // 显示加载提示
      message.loading({ content: '正在保存路由设置...', key: 'saveRouting', duration: 0 })

      // 调用批量更新接口，同时提交问题和显隐规则
      const { surveyApi } = await import('@/api/path/survey')
      const [error] = await surveyApi.saveSurveyQuestions(scaleStore.id, scaleStore.questions, scaleStore.showControllers)

      if (error) {
        throw error
      }

      // 关闭加载提示
      message.destroy('saveRouting')

      // 保存成功后更新步骤
      scaleStore.nextStep()
    } catch (error: any) {
      // 关闭加载提示
      message.destroy('saveRouting')

      // 抛出错误，让 BaseLayout 的 afterSubmit 处理
      throw error
    }
  }

  // 保存后的回调
  const handleAfterSubmit = (status: 'success' | 'fail', error: any) => {
    if (status === 'success') {
      message.success('路由设置已保存成功')
      scaleStore.nextStep()
    } else {
      message.error(`路由设置保存失败 -- ${error?.errmsg ?? error}`)
    }
  }

  return (
    <>
      <BaseLayout
        submitFn={handleSave}
        afterSubmit={handleAfterSubmit}
        footerButtons={['backToList', 'break', 'saveToNext']}
        nextUrl={getScaleEditorPath('edit-factors', questionsheetid, scaleStore.scaleCode || scaleCode)}
        steps={SCALE_STEPS}
        currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'set-routing')}
        onStepChange={handleStepChange}
        themeClass="scale-page-theme"
      >
        <QuestionRoutingWorkspace editor={scaleRoutingEditor} className="scale-page-theme" />
      </BaseLayout>
    </>
  )
})

export default QuestionRouting
