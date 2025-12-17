import { get, post } from '../server'
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

// Mock 数据已移除，调用真实后端 API

export const getProjectList = async (params: { page?: number; pageSize?: number }): Promise<FcResponse<ListResponse<ScreeningProject>>> => {
  const [err, res] = await get<ListResponse<ScreeningProject>>('/screening/project/list', params)
  if (err || !res) {
    throw new Error('获取筛查项目列表失败')
  }
  return res as FcResponse<ListResponse<ScreeningProject>>
}

export const getProjectDetail = async (id: string): Promise<FcResponse<any>> => {
  const [err, res] = await get<any>(`/screening/project/${id}`, {})
  if (err || !res) {
    throw new Error('获取筛查项目详情失败')
  }
  return res as FcResponse<any>
}

export const createProject = async (data: Partial<ScreeningProject>): Promise<FcResponse<any>> => {
  const [err, res] = await post<any>('/screening/project', data)
  if (err || !res) {
    throw new Error('创建筛查项目失败')
  }
  return res as FcResponse<any>
}
