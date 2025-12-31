import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams, useLocation } from 'react-router'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/styles/theme-survey.scss'
import { surveyStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SURVEY_STEPS, getSurveyStepIndex, getSurveyStepFromPath } from '@/utils/steps'
import { MobilePreview } from '@/components/preview'
import { PublishStatusCard, QuestionnaireInfoCard, ShareCard } from '@/components/questionnaire'
import { useSurveySteps, useSurveyPublish } from '../hooks'

const Publish: React.FC = observer(() => {
  const location = useLocation()
  const { questionsheetid } = useParams<{ questionsheetid: string }>()
  const { handleStepChange } = useSurveySteps()
  const { isPublished, surveyUrl, shareCode, togglePublish, refreshData } = useSurveyPublish(questionsheetid || '')
  const [questionnaireVersion, setQuestionnaireVersion] = useState<string>()

  useEffect(() => {
    // 根据路由自动设置当前步骤
    surveyStore.setCurrentStep('publish')
    
    // 获取问卷版本号
    if (questionsheetid) {
      surveyStore.fetchSurveyInfo(questionsheetid).then((questionnaire) => {
        if (questionnaire?.version) {
          setQuestionnaireVersion(questionnaire.version)
        }
      }).catch((err) => {
        console.error('获取问卷版本失败:', err)
      })
    }
  }, [location.pathname, questionsheetid])

  // 步骤跳转处理（使用统一的步骤导航）
  const onStepChange = (stepIndex: number) => {
    if (surveyStore.id) {
      handleStepChange(stepIndex, surveyStore.id)
    }
  }

  // 使用 hooks 处理发布/取消发布
  const handlePublish = async () => {
    await togglePublish(true)
  }

  const handleUnpublish = async () => {
    await togglePublish(false)
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
    const success = await togglePublish(true)
    if (success) {
      await refreshData()
    }
  }

  return (
    <BaseLayout
      footerButtons={['backToList', 'break']}
      steps={SURVEY_STEPS}
      currentStep={getSurveyStepIndex(getSurveyStepFromPath(location.pathname) || 'publish')}
      onStepChange={onStepChange}
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
            {isPublished && questionsheetid && (
              <ShareCard
                surveyUrl={surveyUrl}
                shareCode={shareCode}
                type='survey'
                code={questionsheetid}
                version={questionnaireVersion}
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

