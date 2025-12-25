import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api, ISystemStatistics, IQuestionnaireStatistics, IPlanStatistics, ITesteeStatistics } from '../api'

// 向后兼容的旧接口（用于首页）
export interface IStatistics {
  totalQuestionSheets: number
  totalAnswerSheets: number
  totalUsers: number
  todayAnswers: number
}

class StatisticsStore {
  // 统计数据（向后兼容）
  statistics: IStatistics = {
    totalQuestionSheets: 0,
    totalAnswerSheets: 0,
    totalUsers: 0,
    todayAnswers: 0
  }
  
  // 系统统计（新接口）
  systemStatistics: ISystemStatistics | null = null
  
  // 问卷统计缓存
  questionnaireStatisticsCache: Map<string, IQuestionnaireStatistics> = new Map()
  
  // 计划统计缓存
  planStatisticsCache: Map<string, IPlanStatistics> = new Map()
  
  // 受试者统计缓存
  testeeStatisticsCache: Map<string, ITesteeStatistics> = new Map()
  
  // 加载状态
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  // 获取统计数据（向后兼容，使用系统统计）
  async fetchStatistics() {
    this.loading = true
    try {
      const [error, data] = await api.getStatistics()
      
      if (error || !data) {
        throw new Error('获取统计数据失败')
      }

      runInAction(() => {
        this.statistics = data.data
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取统计数据失败')
    }
  }

  // 获取系统整体统计
  async fetchSystemStatistics() {
    this.loading = true
    try {
      const [error, data] = await api.getSystemStatistics()
      
      if (error || !data?.data) {
        throw new Error('获取系统统计失败')
      }

      runInAction(() => {
        this.systemStatistics = data.data
        // 同时更新向后兼容的统计数据
        this.statistics = {
          totalQuestionSheets: data.data.questionnaire_count,
          totalAnswerSheets: data.data.answer_sheet_count,
          totalUsers: data.data.testee_count,
          todayAnswers: data.data.today_new_answer_sheets
        }
        this.loading = false
      })
    } catch (error) {
      runInAction(() => {
        this.loading = false
      })
      message.error('获取系统统计失败')
    }
  }

  // 获取问卷统计
  async fetchQuestionnaireStatistics(code: string, useCache = true) {
    if (useCache && this.questionnaireStatisticsCache.has(code)) {
      const cached = this.questionnaireStatisticsCache.get(code)
      if (cached) {
        return cached
      }
    }

    try {
      const [error, data] = await api.getQuestionnaireStatistics(code)
      
      if (error || !data?.data) {
        throw new Error('获取问卷统计失败')
      }

      runInAction(() => {
        this.questionnaireStatisticsCache.set(code, data.data)
      })
      
      return data.data
    } catch (error) {
      message.error('获取问卷统计失败')
      throw error
    }
  }

  // 获取计划统计
  async fetchPlanStatistics(planId: number | string, useCache = true) {
    const key = String(planId)
    if (useCache && this.planStatisticsCache.has(key)) {
      const cached = this.planStatisticsCache.get(key)
      if (cached) {
        return cached
      }
    }

    try {
      const [error, data] = await api.getPlanStatistics(planId)
      
      if (error || !data?.data) {
        throw new Error('获取计划统计失败')
      }

      runInAction(() => {
        this.planStatisticsCache.set(key, data.data)
      })
      
      return data.data
    } catch (error) {
      message.error('获取计划统计失败')
      throw error
    }
  }

  // 获取受试者统计
  async fetchTesteeStatistics(testeeId: number | string, useCache = true) {
    const key = String(testeeId)
    if (useCache && this.testeeStatisticsCache.has(key)) {
      const cached = this.testeeStatisticsCache.get(key)
      if (cached) {
        return cached
      }
    }

    try {
      const [error, data] = await api.getTesteeStatistics(testeeId)
      
      if (error || !data?.data) {
        throw new Error('获取受试者统计失败')
      }

      runInAction(() => {
        this.testeeStatisticsCache.set(key, data.data)
      })
      
      return data.data
    } catch (error) {
      message.error('获取受试者统计失败')
      throw error
    }
  }

  // 清除缓存
  clearCache() {
    this.questionnaireStatisticsCache.clear()
    this.planStatisticsCache.clear()
    this.testeeStatisticsCache.clear()
  }

  // 重置状态
  reset() {
    this.statistics = {
      totalQuestionSheets: 0,
      totalAnswerSheets: 0,
      totalUsers: 0,
      todayAnswers: 0
    }
    this.systemStatistics = null
    this.clearCache()
    this.loading = false
  }
}

export const statisticsStore = new StatisticsStore()
