import { get, post, isMockEnabled, mockDelay } from '../server'
import type { FcResponse, ListResponse } from '../../types/server'

// 类型定义
export interface ScreeningProject {
  id: string
  name: string
  surveyCount: number
  scaleCount: number
  targetType: string
  targetRange: string
  totalCount: number
  completedCount: number
  completionRate: number
  status: string
  startTime: string
  endTime: string
  createdAt: string
}

// Mock 数据
const mockProjects = [
  {
    id: '1',
    name: '2024春季新生心理健康筛查',
    surveyCount: 3,
    scaleCount: 2,
    targetType: '年级',
    targetRange: '2024级全体新生',
    totalCount: 1200,
    completedCount: 856,
    completionRate: 71.3,
    status: 'ongoing',
    startTime: '2024-03-01 00:00:00',
    endTime: '2024-03-31 23:59:59',
    createdAt: '2024-02-20 10:00:00'
  },
  {
    id: '2',
    name: '秋季心理危机排查',
    surveyCount: 2,
    scaleCount: 3,
    targetType: '全部',
    targetRange: '全校学生',
    totalCount: 5000,
    completedCount: 5000,
    completionRate: 100,
    status: 'completed',
    startTime: '2023-09-01 00:00:00',
    endTime: '2023-09-30 23:59:59',
    createdAt: '2023-08-25 14:00:00'
  }
]

const mockProjectDetail = {
  id: '1',
  name: '2024春季新生心理健康筛查',
  surveyCount: 3,
  scaleCount: 2,
  targetType: '年级',
  targetRange: '2024级全体新生',
  totalCount: 1200,
  completedCount: 856,
  completionRate: 71.3,
  status: 'ongoing',
  startTime: '2024-03-01 00:00:00',
  endTime: '2024-03-31 23:59:59',
  createdAt: '2024-02-20 10:00:00',
  surveys: [
    { id: 's1', name: '基本信息调查表', type: 'survey' },
    { id: 's2', name: '生活习惯调查', type: 'survey' },
    { id: 's3', name: '学习适应性调查', type: 'survey' }
  ],
  scales: [
    { id: 'sc1', name: 'SCL-90症状自评量表', type: 'scale' },
    { id: 'sc2', name: 'SDS抑郁自评量表', type: 'scale' }
  ],
  stats: {
    totalCount: 1200,
    completedCount: 856,
    completionRate: 71.3,
    highRiskCount: 23,
    mediumRiskCount: 67,
    normalCount: 766
  }
}

export const getProjectList = async (params: { page?: number; pageSize?: number }): Promise<FcResponse<ListResponse<ScreeningProject>>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        list: mockProjects,
        total: mockProjects.length,
        page: params.page || 1,
        pageSize: params.pageSize || 10
      }
    }
  }

  const [err, res] = await get<ListResponse<ScreeningProject>>('/screening/project/list', params)
  if (err || !res) {
    throw new Error('获取筛查项目列表失败')
  }
  return res as FcResponse<ListResponse<ScreeningProject>>
}

export const getProjectDetail = async (id: string): Promise<FcResponse<any>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: mockProjectDetail
    }
  }

  const [err, res] = await get<any>(`/screening/project/${id}`, {})
  if (err || !res) {
    throw new Error('获取筛查项目详情失败')
  }
  return res as FcResponse<any>
}

export const createProject = async (data: Partial<ScreeningProject>): Promise<FcResponse<any>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        id: `mock_${Date.now()}`,
        ...data
      }
    }
  }

  const [err, res] = await post<any>('/screening/project', data)
  if (err || !res) {
    throw new Error('创建筛查项目失败')
  }
  return res as FcResponse<any>
}
