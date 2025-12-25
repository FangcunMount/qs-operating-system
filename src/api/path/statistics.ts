import { get } from '../qsServer'
import type { QSResponse } from '@/types/qs'

// ==================== 类型定义 ====================

// 每日统计数据（根据 API 文档 statistics.DailyCount）
export interface IDailyCount {
  date: string
  count: number
}

// 系统整体统计（根据 API 文档 statistics.SystemStatistics）
export interface ISystemStatistics {
  org_id: number
  questionnaire_count: number          // 问卷总数
  answer_sheet_count: number          // 答卷总数
  testee_count: number                // 受试者总数
  assessment_count: number            // 测评总数
  today_new_questionnaires?: number   // 今日新增问卷
  today_new_answer_sheets: number     // 今日新增答卷
  today_new_testees: number           // 今日新增受试者
  today_new_assessments: number       // 今日新增测评
  assessment_trend: IDailyCount[]     // 趋势数据（近30天）
  assessment_status_distribution: Record<string, number>  // 状态分布
}

// 问卷/量表统计（根据 API 文档 statistics.QuestionnaireStatistics）
export interface IQuestionnaireStatistics {
  org_id: number
  questionnaire_code: string
  total_submissions: number            // 总提交数
  total_completions: number            // 总完成数（已解读）
  completion_rate: number              // 完成率 = TotalCompletions / TotalSubmissions
  last_7_days_count: number            // 近7天提交数
  last_15_days_count: number           // 近15天提交数
  last_30_days_count: number           // 近30天提交数
  daily_trend: IDailyCount[]           // 趋势数据（近30天）
  origin_distribution: Record<string, number>  // 来源分布
}

// 计划统计（根据 API 文档 statistics.PlanStatistics）
export interface IPlanStatistics {
  org_id: number
  plan_id: number
  enrolled_testees: number             // 受试者统计
  active_testees: number                // 活跃受试者数（有完成任务的）
  total_tasks: number                   // 任务统计
  completed_tasks: number               // 已完成任务数
  pending_tasks: number                 // 待完成任务数
  expired_tasks: number                 // 已过期任务数
  completion_rate: number               // 完成率
}

// 受试者统计（根据 API 文档 statistics.TesteeStatistics）
export interface ITesteeStatistics {
  org_id: number
  testee_id: number
  total_assessments: number            // 测评统计
  completed_assessments: number         // 已完成测评数
  pending_assessments: number          // 待完成测评数
  first_assessment_date?: string       // 首次测评日期
  last_assessment_date?: string         // 时间维度
  risk_distribution: Record<string, number>  // 风险分布
}

// 向后兼容的旧接口（用于首页）
export interface IStatistics {
  totalQuestionSheets: number
  totalAnswerSheets: number
  totalUsers: number
  todayAnswers: number
}

// ==================== API 方法 ====================

/**
 * 获取系统整体统计
 */
export const getSystemStatistics = async (): Promise<[any, QSResponse<ISystemStatistics> | undefined]> => {
  return get<ISystemStatistics>('/statistics/system')
}

/**
 * 获取问卷/量表统计
 */
export const getQuestionnaireStatistics = async (
  code: string
): Promise<[any, QSResponse<IQuestionnaireStatistics> | undefined]> => {
  return get<IQuestionnaireStatistics>(`/statistics/questionnaires/${code}`)
}

/**
 * 获取计划统计
 */
export const getPlanStatistics = async (
  planId: number | string
): Promise<[any, QSResponse<IPlanStatistics> | undefined]> => {
  return get<IPlanStatistics>(`/statistics/plans/${planId}`)
}

/**
 * 获取受试者统计
 */
export const getTesteeStatistics = async (
  testeeId: number | string
): Promise<[any, QSResponse<ITesteeStatistics> | undefined]> => {
  return get<ITesteeStatistics>(`/statistics/testees/${testeeId}`)
}

/**
 * 获取统计数据（向后兼容，映射到系统统计）
 */
export const getStatistics = async (): Promise<[any, QSResponse<IStatistics> | undefined]> => {
  const [error, data] = await getSystemStatistics()
  if (error || !data?.data) {
    return [error, undefined]
  }
  
  // 转换为旧格式以保持向后兼容
  const systemStats = data.data
  const legacyStats: IStatistics = {
    totalQuestionSheets: systemStats.questionnaire_count,
    totalAnswerSheets: systemStats.answer_sheet_count,
    totalUsers: systemStats.testee_count,
    todayAnswers: systemStats.today_new_answer_sheets
  }
  
  return [null, { ...data, data: legacyStats }]
}

export const statisticsApi = {
  getStatistics,
  getSystemStatistics,
  getQuestionnaireStatistics,
  getPlanStatistics,
  getTesteeStatistics
}
