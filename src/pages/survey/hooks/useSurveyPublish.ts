import { useState, useEffect } from 'react'
import { message } from 'antd'
import { surveyStore } from '@/store'

/**
 * 问卷发布相关 Hook
 */
export const useSurveyPublish = (questionsheetid: string): {
  isPublished: boolean
  surveyUrl: string
  shareCode: string
  loading: boolean
  togglePublish: (publish: boolean) => Promise<boolean>
  refreshData: () => Promise<void>
} => {
  const [isPublished, setIsPublished] = useState(false)
  const [surveyUrl, setSurveyUrl] = useState('')
  const [shareCode, setShareCode] = useState('')
  const [loading, setLoading] = useState(false)

  /**
   * 初始化发布数据
   */
  const initPublishData = async () => {
    if (!questionsheetid) return

    setLoading(true)
    message.loading({ content: '加载中', duration: 0, key: 'publish' })

    try {
      // 加载问卷数据
      await surveyStore.initEditor(questionsheetid)

      // 获取问卷信息以判断发布状态
      const questionnaire = await surveyStore.fetchSurveyInfo(questionsheetid)
      
      if (!questionnaire) {
        message.destroy()
        message.error('获取问卷信息失败')
        return
      }

      // 根据 status 字段判断是否已发布（1=已发布）
      const published = questionnaire.status === 1
      setIsPublished(published)
      
      // 生成问卷链接和分享码
      const baseUrl = window.location.origin
      const url = `${baseUrl}/answer/${questionsheetid}`
      setSurveyUrl(url)
      setShareCode(questionsheetid)

      message.destroy()
    } catch (error) {
      message.destroy()
      message.error('加载发布信息失败')
      console.error('加载发布信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 发布/取消发布问卷
   */
  const togglePublish = async (publish: boolean) => {
    if (!questionsheetid) return false

    setLoading(true)
    const action = publish ? '发布' : '取消发布'

    try {
      message.loading({ content: `${action}中...`, duration: 0, key: 'publish' })

      if (publish) {
        await surveyStore.publish()
      } else {
        await surveyStore.unpublish()
      }

      message.destroy()
      message.success(`${action}成功`)
      
      // 重新获取问卷信息以更新状态
      const questionnaire = await surveyStore.fetchSurveyInfo(questionsheetid)
      if (questionnaire) {
        const published = questionnaire.status === 1 // 1=已发布
        setIsPublished(published)
      } else {
        setIsPublished(publish)
      }

      // 如果发布成功，更新分享信息
      if (publish) {
        const baseUrl = window.location.origin
        const url = `${baseUrl}/answer/${questionsheetid}`
        setSurveyUrl(url)
        setShareCode(questionsheetid)
      }

      return true
    } catch (error: any) {
      message.destroy()
      message.error(`${action}失败: ${error?.errmsg || error.message || error}`)
      console.error(`${action}失败:`, error)
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    initPublishData()
  }, [questionsheetid])

  return {
    isPublished,
    surveyUrl,
    shareCode,
    loading,
    togglePublish,
    refreshData: initPublishData
  }
}

