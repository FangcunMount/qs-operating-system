import { get, post } from '../server'
import { IQuestionSheet } from '@/models/questionSheet'
import { IQuestion } from '@/models/question'
import { ApiResponse } from '@/types/server'

// ============ Mock 数据配置 ============
const USE_MOCK = true // 设置为 true 使用 mock 数据，false 使用真实接口

// Mock 问卷数据
const mockSurveys: Record<string, IQuestionSheet> = {
  'survey-001': {
    id: 'survey-001',
    title: '用户满意度调查问卷',
    desc: '针对产品使用情况进行满意度调查',
    img_url: '',
    questions: []
  }
}

// Mock 问题列表
const mockQuestions: Record<string, IQuestion[]> = {
  'survey-001': []
}

// ============ API 函数 ============

/**
 * 创建问卷（添加基本信息）
 */
export function createSurvey(data: {
  title: string
  desc?: string
  img_url?: string
}): ApiResponse<{ questionsheetid: string }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newId = `survey-${Date.now()}`
        mockSurveys[newId] = {
          id: newId,
          title: data.title,
          desc: data.desc || '',
          img_url: data.img_url || '',
          questions: []
        }
        mockQuestions[newId] = []
        
        resolve([
          null,
          {
            errno: '0',
            errmsg: '创建成功',
            data: { questionsheetid: newId }
          }
        ])
      }, 500)
    })
  }

  return post<{ questionsheetid: string }>('/api/survey/create', data)
}

/**
 * 更新问卷基本信息
 */
export function updateSurvey(data: {
  questionsheetid: string
  title: string
  desc?: string
  img_url?: string
}): ApiResponse<{ questionsheetid: string }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mockSurveys[data.questionsheetid]) {
          mockSurveys[data.questionsheetid] = {
            ...mockSurveys[data.questionsheetid],
            title: data.title,
            desc: data.desc || '',
            img_url: data.img_url || ''
          }
          
          resolve([
            null,
            {
              errno: '0',
              errmsg: '更新成功',
              data: { questionsheetid: data.questionsheetid }
            }
          ])
        } else {
          resolve([
            { errno: '-1', errmsg: '问卷不存在' } as any,
            undefined
          ])
        }
      }, 500)
    })
  }

  return post<{ questionsheetid: string }>('/api/survey/update', data)
}

/**
 * 获取问卷信息
 */
export function getSurvey(
  questionsheetid: string
): ApiResponse<{ questionsheet: IQuestionSheet }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const survey = mockSurveys[questionsheetid]
        if (survey) {
          resolve([
            null,
            {
              errno: '0',
              errmsg: '获取成功',
              data: { questionsheet: survey }
            }
          ])
        } else {
          resolve([
            { errno: '-1', errmsg: '问卷不存在' } as any,
            undefined
          ])
        }
      }, 300)
    })
  }

  return get<{ questionsheet: IQuestionSheet }>('/api/questionsheet/one', { questionsheetid })
}

/**
 * 保存问卷题目
 */
export function saveSurveyQuestions(
  questionsheetid: string,
  questions: IQuestion[]
): ApiResponse<{ success: boolean }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mockSurveys[questionsheetid]) {
          mockQuestions[questionsheetid] = questions
          mockSurveys[questionsheetid].questions = questions
          
          resolve([
            null,
            {
              errno: '0',
              errmsg: '保存成功',
              data: { success: true }
            }
          ])
        } else {
          resolve([
            { errno: '-1', errmsg: '问卷不存在' } as any,
            undefined
          ])
        }
      }, 800)
    })
  }

  return post<{ success: boolean }>('/api/questionsheet/question/modify', {
    questionsheetid,
    questions
  })
}

/**
 * 获取问卷题目列表
 */
export function getSurveyQuestions(
  questionsheetid: string
): ApiResponse<{ list: IQuestion[] }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const questions = mockQuestions[questionsheetid] || []
        resolve([
          null,
          {
            errno: '0',
            errmsg: '获取成功',
            data: { list: questions }
          }
        ])
      }, 300)
    })
  }

  return get<{ list: IQuestion[] }>('/api/questionsheet/question/list', { questionsheetid })
}

/**
 * 发布问卷
 */
export function publishSurvey(
  questionsheetid: string
): ApiResponse<{ success: boolean }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mockSurveys[questionsheetid]) {
          // 可以在这里添加发布状态字段
          console.log(`问卷 ${questionsheetid} 已发布`)
          
          resolve([
            null,
            {
              errno: '0',
              errmsg: '发布成功',
              data: { success: true }
            }
          ])
        } else {
          resolve([
            { errno: '-1', errmsg: '问卷不存在' } as any,
            undefined
          ])
        }
      }, 500)
    })
  }

  return post<{ success: boolean }>('/api/survey/publish', { questionsheetid })
}

/**
 * 取消发布问卷
 */
export function unpublishSurvey(
  questionsheetid: string
): ApiResponse<{ success: boolean }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (mockSurveys[questionsheetid]) {
          console.log(`问卷 ${questionsheetid} 已取消发布`)
          
          resolve([
            null,
            {
              errno: '0',
              errmsg: '取消发布成功',
              data: { success: true }
            }
          ])
        } else {
          resolve([
            { errno: '-1', errmsg: '问卷不存在' } as any,
            undefined
          ])
        }
      }, 500)
    })
  }

  return post<{ success: boolean }>('/api/survey/unpublish', { questionsheetid })
}

/**
 * 保存问卷路由配置
 */
export function saveSurveyRouting(
  questionsheetid: string,
  routingConfig: IQuestion[]
): ApiResponse<{ success: boolean }> {
  if (USE_MOCK) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`问卷 ${questionsheetid} 路由配置已保存`, routingConfig)
        
        resolve([
          null,
          {
            errno: '0',
            errmsg: '保存成功',
            data: { success: true }
          }
        ])
      }, 500)
    })
  }

  return post<{ success: boolean }>('/api/survey/routing/save', {
    questionsheetid,
    routing: routingConfig
  })
}

export const surveyApi = {
  createSurvey,
  updateSurvey,
  getSurvey,
  saveSurveyQuestions,
  getSurveyQuestions,
  publishSurvey,
  unpublishSurvey,
  saveSurveyRouting
}
