import { get } from '../server'
import { isMockEnabled, mockDelay } from '../mockConfig'
import { FcResponse } from '../../types/server'

// ==================== 类型定义 ====================
export interface IStatistics {
  totalQuestionSheets: number
  totalAnswerSheets: number
  totalUsers: number
  todayAnswers: number
}

// ==================== Mock 数据 ====================
const mockStatistics: IStatistics = {
  totalQuestionSheets: 128,
  totalAnswerSheets: 3456,
  totalUsers: 892,
  todayAnswers: 67
}

// ==================== API 方法 ====================

/**
 * 获取统计数据
 */
export const getStatistics = async (): Promise<[any, FcResponse<IStatistics> | undefined]> => {
  if (isMockEnabled('statistics')) {
    await mockDelay()
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: mockStatistics
    }]
  }
  
  return get<IStatistics>('/api/statistics/dashboard')
}

export const statisticsApi = {
  getStatistics
}
