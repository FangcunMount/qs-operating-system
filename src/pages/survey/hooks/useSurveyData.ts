import { useState } from 'react'
import { message } from 'antd'
import { surveyStore } from '@/store'

/**
 * 问卷数据加载 Hook
 * 统一管理问卷数据的加载逻辑
 */
export const useSurveyData = (questionsheetid: string): {
  loading: boolean
  loadSurveyData: () => Promise<void>
  loadShowControllers: () => Promise<void>
  loadFullData: () => Promise<void>
} => {
  const [loading, setLoading] = useState(false)

  /**
   * 加载问卷基本信息和题目
   */
  const loadSurveyData = async () => {
    if (!questionsheetid) return

    setLoading(true)
    message.loading({ content: '加载中', duration: 0, key: 'fetch' })
    
    try {
      await surveyStore.initEditor(questionsheetid)
      message.destroy()
    } catch (error) {
      message.destroy()
      message.error('加载问卷失败')
      console.error('加载问卷失败:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 加载显隐规则
   */
  const loadShowControllers = async () => {
    // show_controller 已随问卷 DTO 在 initEditor 中加载。
  }

  /**
   * 加载完整数据（包括显隐规则）
   */
  const loadFullData = async () => {
    await loadSurveyData()
    await loadShowControllers()
  }

  return {
    loading,
    loadSurveyData,
    loadShowControllers,
    loadFullData
  }
}
