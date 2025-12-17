import { get, post } from '../server'
import type { FcResponse, ListResponse } from '../../types/server'

// 类型定义
export interface PushTask {
  id: string
  name: string
  contentType: string
  contentName: string
  frequency: string
  executeTime: string
  targetType: string
  targetRange: string
  status: boolean
  lastExecuteTime?: string
  nextExecuteTime?: string
  createdAt: string
}

// Mock 数据已移除，使用真实后端 API

export const getTaskList = async (params: { page?: number; pageSize?: number }): Promise<FcResponse<ListResponse<PushTask>>> => {
  const [err, res] = await get<ListResponse<PushTask>>('/push/task/list', params)
  if (err || !res) {
    throw new Error('获取推送任务列表失败')
  }
  return res as FcResponse<ListResponse<PushTask>>
}

export const getTaskDetail = async (id: string): Promise<FcResponse<any>> => {
  const [err, res] = await get<any>(`/push/task/${id}`, {})
  if (err || !res) {
    throw new Error('获取推送任务详情失败')
  }
  return res as FcResponse<any>
}

export const createTask = async (data: Partial<PushTask>): Promise<FcResponse<any>> => {
  const [err, res] = await post<any>('/push/task', data)
  if (err || !res) {
    throw new Error('创建推送任务失败')
  }
  return res as FcResponse<any>
}

export const updateTask = async (id: string, data: Partial<PushTask>): Promise<FcResponse<any>> => {
  const [err, res] = await post<any>(`/push/task/${id}`, data)
  if (err || !res) {
    throw new Error('更新推送任务失败')
  }
  return res as FcResponse<any>
}

export const toggleTaskStatus = async (id: string, status: boolean): Promise<FcResponse<{ id: string; status: boolean }>> => {
  const [err, res] = await post<{ id: string; status: boolean }>(`/push/task/${id}/toggle`, { status })
  if (err || !res) {
    throw new Error('切换推送任务状态失败')
  }
  return res as FcResponse<{ id: string; status: boolean }>
}
