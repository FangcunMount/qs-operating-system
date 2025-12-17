import { get } from '../server'
import { FcResponse } from '../../types/server'

// ==================== 类型定义 ====================
export interface IStatistics {
  totalQuestionSheets: number
  totalAnswerSheets: number
  totalUsers: number
  todayAnswers: number
}

// Mock 数据已移除，使用真实后端 API

// ==================== API 方法 ====================

/**
 * 获取统计数据
 */
export const getStatistics = async (): Promise<[any, FcResponse<IStatistics> | undefined]> => {
  return get<IStatistics>('/api/statistics/dashboard')
}

export const statisticsApi = {
  getStatistics
}
