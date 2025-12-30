import React, { useEffect, useState } from 'react'
import { message } from 'antd'
import { useParams, useLocation } from 'react-router'
import { observer } from 'mobx-react-lite'

import './index.scss'
import '@/styles/theme-scale.scss'
import { scaleStore } from '@/store'
import BaseLayout from '@/components/layout/BaseLayout'
import { SCALE_STEPS, getScaleStepIndex, getScaleStepFromPath } from '@/utils/steps'
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
    const step = SCALE_STEPS[stepIndex]
    if (!step || !scaleStore.id) return

    switch (step.key) {
    case 'create':
      history.push(`/scale/info/${scaleStore.id}`)
      break
    case 'edit-questions':
      history.push(`/scale/create/${scaleStore.id}/0`)
      break
    case 'set-routing':
      history.push(`/scale/routing/${scaleStore.id}`)
      break
    case 'edit-factors':
      history.push(`/scale/factor/${scaleStore.id}`)
      break
    case 'set-interpretation':
      history.push(`/scale/analysis/${scaleStore.id}`)
      break
    case 'publish':
      history.push(`/scale/publish/${scaleStore.id}`)
      break
    }
  }
  const [surveyUrl, setSurveyUrl] = useState('')
  const [shareCode, setShareCode] = useState('')

  useEffect(() => {
    // 根据路由自动设置当前步骤
    scaleStore.setCurrentStep('publish')
    initData()
  }, [questionsheetid, location.pathname])

  const initData = async () => {
    // 先尝试从 localStorage 恢复
    const restored = scaleStore.loadFromLocalStorage()
    
    if (restored && scaleStore.id === questionsheetid && scaleStore.questions.length > 0) {
      console.log('publish 页面从 localStorage 恢复数据成功')
      
      // 生成链接和分享码
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      setShareCode(questionsheetid)
      
      // 仍需从服务器获取发布状态
      try {
        const questionsheet = await scaleStore.fetchScaleInfo(questionsheetid)
        if (questionsheet) {
          // status: 0=草稿, 1=已发布, 2=已归档
          setIsPublished(questionsheet.status === 1)
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
      const questionsheet = await scaleStore.fetchScaleInfo(questionsheetid)
      
      // 检查发布状态（status: 0=草稿, 1=已发布, 2=已归档）
      if (questionsheet) {
        setIsPublished(questionsheet.status === 1)
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
      await scaleStore.publish()
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
      
      await scaleStore.unpublish()
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
      scaleStore.saveToLocalStorage()
      // 如果有 ID，也保存到服务器
      if (scaleStore.id) {
        await scaleStore.saveQuestionList({ persist: true })
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
      await scaleStore.publish()
      setIsPublished(true)
      message.destroy()
      message.success('量表重新发布成功！')
    } catch (error: any) {
      message.destroy()
      message.error(`重新发布失败: ${error?.errmsg || error.message || error}`)
    }
  }

  return (
    <BaseLayout
      footerButtons={['backToList', 'break']}
      steps={SCALE_STEPS}
      currentStep={getScaleStepIndex(getScaleStepFromPath(location.pathname) || 'publish')}
      onStepChange={handleStepChange}
      themeClass="scale-page-theme"
    >
      <div className='scale-publish-container scale-page-theme'>
        {/* 主内容区 - 左右两栏布局 */}
        <div className='content-layout'>
          {/* 左侧栏 */}
          <div className='left-column'>
            {/* 发布状态栏 */}
            <PublishStatusCard
              isPublished={isPublished}
              title={scaleStore.title}
              questionCount={scaleStore.questions.length}
              showControllerCount={scaleStore.showControllers.length}
              type='scale'
              onSaveDraft={handleSaveDraftInline}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onRepublish={handleRepublish}
            />

            {/* 问卷信息和量表信息 */}
            <QuestionnaireInfoCard
              questionsheetid={questionsheetid}
              questionCount={scaleStore.questions.length}
              showControllerCount={scaleStore.showControllers.length}
              isPublished={isPublished}
              desc={scaleStore.desc}
              type='scale'
              factorCount={scaleStore.factors.length}
              hasTotalScore={scaleStore.factors.some(f => f.is_total_score === '1')}
              factorRulesCount={scaleStore.factor_rules.length}
              macroInterpretationCount={0}
              factors={scaleStore.factors}
            />

            {/* 分享设置 */}
            {isPublished && (
              <ShareCard
                surveyUrl={surveyUrl}
                shareCode={shareCode}
                type='scale'
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
                  title: scaleStore.title,
                  desc: scaleStore.desc,
                  questions: scaleStore.questions as any
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

