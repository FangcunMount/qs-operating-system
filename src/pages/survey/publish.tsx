import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams, useLocation } from 'react-router'
import { observer } from 'mobx-react-lite'

import './Publish.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SURVEY_STEPS, getSurveyStepIndex, getSurveyStepFromPath } from '@/utils/steps'
import { useHistory } from 'react-router-dom'
import { MobilePreview } from '@/components/preview'
import { PublishStatusCard, QuestionnaireInfoCard, ShareCard } from '@/components/questionnaire'

const Publish: React.FC = observer(() => {
  const history = useHistory()
  const location = useLocation()
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
    // 根据路由自动设置当前步骤
    surveyStore.setCurrentStep('publish')
    initData()
  }, [questionsheetid, location.pathname])

  const initData = async () => {
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    
    try {
      // 从服务器加载问卷信息（包括发布状态）
      const questionnaire = await surveyStore.fetchSurveyInfo(questionsheetid)
      
      if (!questionnaire) {
        message.destroy()
        message.error('问卷不存在')
        return
      }
      
      // 根据 API 返回的 status 字段判断是否已发布
      // status 可能的值：'draft'（草稿）、'published'（已发布）、'archived'（已归档）
      const published = questionnaire.status === 'published'
      setIsPublished(published)
      
      // 如果问卷有问题数据，加载到 store
      if (questionnaire.questions && questionnaire.questions.length > 0) {
        // 问题数据已经在 initEditor 中加载过了，这里不需要重复加载
        // 但如果直接从发布页面进入，需要加载问题数据
        if (surveyStore.questions.length === 0) {
          await surveyStore.initEditor(questionsheetid)
        }
      }
      
      // 生成问卷链接和分享码
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
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
      
      // 发布成功后，重新获取问卷信息以更新状态
      const questionnaire = await surveyStore.fetchSurveyInfo(questionsheetid)
      if (questionnaire) {
        const published = questionnaire.status === 'published'
        setIsPublished(published)
      } else {
        setIsPublished(true)
      }
      
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
      
      // 取消发布成功后，重新获取问卷信息以更新状态
      const questionnaire = await surveyStore.fetchSurveyInfo(questionsheetid)
      if (questionnaire) {
        const published = questionnaire.status === 'published'
        setIsPublished(published)
      } else {
        setIsPublished(false)
      }
      
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
      
      if (!surveyStore.id) {
        message.destroy()
        message.error('问卷 ID 不能为空')
        return
      }
      
      // 1. 保存基本信息
      await surveyStore.saveBasicInfo()
      
      // 2. 保存问题列表（包含显隐规则）
      if (surveyStore.questions.length > 0) {
        await surveyStore.saveQuestionList({ persist: true })
      }
      
      // 3. 调用保存草稿 API
      const { surveyApi } = await import('@/api/path/survey')
      const [error] = await surveyApi.saveDraft(surveyStore.id)
      if (error) {
        throw error
      }
      
      // 4. 保存到 localStorage（作为备份）
      surveyStore.saveToLocalStorage()
      
      message.destroy()
      message.success('草稿保存成功')
    } catch (error: any) {
      message.destroy()
      message.error(`保存失败: ${error?.errmsg ?? error.message ?? error}`)
    }
  }

  // 重新发布
  const handleRepublish = async () => {
    try {
      message.loading({ content: '重新发布中...', duration: 0, key: 'republish' })
      await surveyStore.publish()
      
      // 重新发布成功后，重新获取问卷信息以更新状态
      const questionnaire = await surveyStore.fetchSurveyInfo(questionsheetid)
      if (questionnaire) {
        const published = questionnaire.status === 'published'
        setIsPublished(published)
      } else {
        setIsPublished(true)
      }
      
      message.destroy()
      message.success('问卷重新发布成功！')
    } catch (error: any) {
      message.destroy()
      message.error(`重新发布失败: ${error?.errmsg || error.message || error}`)
    }
  }

  return (
    <BaseLayout
      footerButtons={['backToList', 'break']}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(getSurveyStepFromPath(location.pathname) || 'publish')}
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
