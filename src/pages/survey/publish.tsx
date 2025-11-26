import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams } from 'react-router'
import { observer } from 'mobx-react-lite'

import './Publish.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SURVEY_STEPS, getSurveyStepIndex } from '@/utils/steps'
import { useHistory } from 'react-router-dom'
import { MobilePreview } from '@/components/preview'
import { PublishStatusCard, QuestionnaireInfoCard, ShareCard } from '@/components/questionnaire'

const Publish: React.FC = observer(() => {
  const history = useHistory()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  
  const [isPublished, setIsPublished] = useState(false)

  // 步骤跳转处理
  const handleStepChange = (stepIndex: number) => {
    const step = SURVEY_STEPS[stepIndex]
    if (!step || !surveyStore.id) return

    switch (step.key) {
    case 'create':
      history.push(`/survey/info/${surveyStore.id}`)
      break
    case 'edit-questions':
      history.push(`/survey/create/${surveyStore.id}/0`)
      break
    case 'set-routing':
      history.push(`/survey/routing/${surveyStore.id}`)
      break
    case 'publish':
      history.push(`/survey/publish/${surveyStore.id}`)
      break
    }
  }
  const [surveyUrl, setSurveyUrl] = useState('')
  const [shareCode, setShareCode] = useState('')

  useEffect(() => {
    // 设置当前步骤
    surveyStore.setCurrentStep('publish')
    initData()
  }, [questionsheetid])

  const initData = async () => {
    // 先尝试从 localStorage 恢复
    const restored = surveyStore.loadFromLocalStorage()
    
    if (restored && surveyStore.id === questionsheetid && surveyStore.questions.length > 0) {
      console.log('publish 页面从 localStorage 恢复数据成功')
      
      // 生成链接和分享码
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      setShareCode(questionsheetid)
      
      // 仍需从服务器获取发布状态
      try {
        const questionsheet = await surveyStore.fetchSurveyInfo(questionsheetid)
        if (questionsheet) {
          setIsPublished((questionsheet as any).published === true)
        }
      } catch (error) {
        console.error('获取发布状态失败:', error)
      }
      return
    }
    
    // 从服务器加载完整数据
    console.log('publish 页面从服务器加载数据')
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    
    try {
      const questionsheet = await surveyStore.fetchSurveyInfo(questionsheetid)
      
      // 检查发布状态
      if (questionsheet) {
        setIsPublished((questionsheet as any).published === true)
      }
      
      // 生成问卷链接
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      
      // 生成分享码
      setShareCode(questionsheetid)
      
      message.destroy()
      message.success({ content: '加载成功!', key: 'fetch', duration: 2 })
    } catch (error: any) {
      message.destroy()
      message.error(`加载失败: ${error?.errmsg || error.message || error}`)
    }
  }

  const handlePublish = async () => {
    try {
      message.loading({ content: '发布中...', duration: 0, key: 'publish' })
      await surveyStore.publish()
      setIsPublished(true)
      
      message.destroy()
      message.success('问卷发布成功！')
    } catch (error: any) {
      message.destroy()
      message.error(`发布失败: ${error?.errmsg || error.message || error}`)
    }
  }

  const handleUnpublish = async () => {
    try {
      message.loading({ content: '取消发布中...', duration: 0, key: 'unpublish' })
      
      await surveyStore.unpublish()
      setIsPublished(false)
      
      message.destroy()
      message.success('已取消发布')
    } catch (error: any) {
      message.destroy()
      message.error(`取消发布失败: ${error?.errmsg ?? error}`)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyUrl)
    message.success('链接已复制到剪贴板')
  }

  const handleCopyShareCode = () => {
    navigator.clipboard.writeText(shareCode)
    message.success('分享码已复制到剪贴板')
  }

  // 存草稿（状态栏内使用）
  const handleSaveDraftInline = async () => {
    try {
      message.loading({ content: '保存中...', duration: 0, key: 'saveDraft' })
      // 保存到 localStorage
      surveyStore.saveToLocalStorage()
      // 如果有 ID，也保存到服务器
      if (surveyStore.id) {
        await surveyStore.saveQuestionList({ persist: true })
      }
      message.destroy()
      message.success('草稿保存成功')
    } catch (error: any) {
      message.destroy()
      message.error(`保存失败: ${error?.errmsg ?? error}`)
    }
  }

  // 重新发布
  const handleRepublish = async () => {
    try {
      message.loading({ content: '重新发布中...', duration: 0, key: 'republish' })
      await surveyStore.publish()
      setIsPublished(true)
      message.destroy()
      message.success('问卷重新发布成功！')
    } catch (error: any) {
      message.destroy()
      message.error(`重新发布失败: ${error?.errmsg || error.message || error}`)
    }
  }

  return (
    <BaseLayout
      footerButtons={['break']}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(surveyStore.currentStep)}
      onStepChange={handleStepChange}
      themeClass="survey-page-theme"
    >
      <div className='survey-publish-container survey-page-theme'>
        {/* 主内容区 - 左右两栏布局 */}
        <div className='content-layout'>
          {/* 左侧栏 */}
          <div className='left-column'>
            {/* 发布状态栏 */}
            <PublishStatusCard
              isPublished={isPublished}
              title={surveyStore.title}
              questionCount={surveyStore.questions.length}
              showControllerCount={surveyStore.showControllers.length}
              type='survey'
              onSaveDraft={handleSaveDraftInline}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onRepublish={handleRepublish}
            />

            {/* 问卷信息 */}
            <QuestionnaireInfoCard
              questionsheetid={questionsheetid}
              questionCount={surveyStore.questions.length}
              showControllerCount={surveyStore.showControllers.length}
              isPublished={isPublished}
              desc={surveyStore.desc}
              type='survey'
            />

            {/* 分享设置 */}
            {isPublished && (
              <ShareCard
                surveyUrl={surveyUrl}
                shareCode={shareCode}
                type='survey'
                onCopyLink={handleCopyLink}
                onCopyShareCode={handleCopyShareCode}
              />
            )}
          </div>

          {/* 右侧栏 - 问卷预览 */}
          <div className='right-column'>
            <div className='preview-sticky'>
              <MobilePreview 
                questionnaire={{
                  title: surveyStore.title,
                  desc: surveyStore.desc,
                  questions: surveyStore.questions as any
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  )
})

export default Publish
