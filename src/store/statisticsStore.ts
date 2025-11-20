import { makeAutoObservable, runInAction } from 'mobx'
import { message } from 'antd'
import { api } from '../api'

export interface IStatistics {
  totalQuestionSheets: number
  totalAnswerSheets: number
  totalUsers: number
  todayAnswers: number
}

class StatisticsStore {
  // 统计数据
  statistics: IStatistics = {
    totalQuestionSheets: 0,
    totalAnswerSheets: 0,
    totalUsers: 0,
    todayAnswers: 0
  }
  
  // 加载状态
  loading = false

  constructor() {
    makeAutoObservable(this)
  }

  // 获取统计数据
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

  // 重置状态
  reset() {
    this.statistics = {
      totalQuestionSheets: 0,
      totalAnswerSheets: 0,
      totalUsers: 0,
      todayAnswers: 0
    }
    this.loading = false
  }
}

export const statisticsStore = new StatisticsStore()
