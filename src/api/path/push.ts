import { get, post, isMockEnabled, mockDelay } from '../server'
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

// Mock 数据
const mockTasks = [
  {
    id: '1',
    name: '每周心理健康测评',
    contentType: 'scale',
    contentName: 'PHQ-9抑郁筛查量表',
    frequency: 'weekly',
    executeTime: '每周一 09:00',
    targetType: '年级',
    targetRange: '2023级、2024级',
    status: true,
    lastExecuteTime: '2024-03-18 09:00:00',
    nextExecuteTime: '2024-03-25 09:00:00',
    createdAt: '2024-01-10 15:30:00'
  },
  {
    id: '2',
    name: '月度压力评估',
    contentType: 'survey',
    contentName: '学业压力调查问卷',
    frequency: 'monthly',
    executeTime: '每月1号 10:00',
    targetType: '全部',
    targetRange: '全校学生',
    status: false,
    lastExecuteTime: '2024-03-01 10:00:00',
    nextExecuteTime: '2024-04-01 10:00:00',
    createdAt: '2024-01-05 10:00:00'
  },
  {
    id: '3',
    name: '每日情绪记录',
    contentType: 'survey',
    contentName: '情绪日记',
    frequency: 'daily',
    executeTime: '每天 20:00',
    targetType: '班级',
    targetRange: '心理委员班级',
    status: true,
    lastExecuteTime: '2024-03-23 20:00:00',
    nextExecuteTime: '2024-03-24 20:00:00',
    createdAt: '2024-02-15 11:00:00'
  }
]

const mockTaskDetail = {
  id: '1',
  name: '每周心理健康测评',
  contentType: 'scale',
  contentId: 'phq9',
  contentName: 'PHQ-9抑郁筛查量表',
  frequency: 'weekly',
  weekDays: [1], // 周一
  executeTime: '09:00',
  targetType: '年级',
  targetGrades: ['2023', '2024'],
  targetRange: '2023级、2024级',
  status: true,
  lastExecuteTime: '2024-03-18 09:00:00',
  nextExecuteTime: '2024-03-25 09:00:00',
  createdAt: '2024-01-10 15:30:00',
  executeHistory: [
    {
      executeTime: '2024-03-18 09:00:00',
      targetCount: 2400,
      completedCount: 1856,
      completionRate: 77.3
    },
    {
      executeTime: '2024-03-11 09:00:00',
      targetCount: 2400,
      completedCount: 1923,
      completionRate: 80.1
    },
    {
      executeTime: '2024-03-04 09:00:00',
      targetCount: 2400,
      completedCount: 1789,
      completionRate: 74.5
    }
  ]
}

export const getTaskList = async (params: { page?: number; pageSize?: number }): Promise<FcResponse<ListResponse<PushTask>>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        list: mockTasks,
        total: mockTasks.length,
        page: params.page || 1,
        pageSize: params.pageSize || 10
      }
    }
  }

  const [err, res] = await get<ListResponse<PushTask>>('/push/task/list', params)
  if (err || !res) {
    throw new Error('获取推送任务列表失败')
  }
  return res as FcResponse<ListResponse<PushTask>>
}

export const getTaskDetail = async (id: string): Promise<FcResponse<any>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: mockTaskDetail
    }
  }

  const [err, res] = await get<any>(`/push/task/${id}`, {})
  if (err || !res) {
    throw new Error('获取推送任务详情失败')
  }
  return res as FcResponse<any>
}

export const createTask = async (data: Partial<PushTask>): Promise<FcResponse<any>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        id: `mock_${Date.now()}`,
        ...data,
        status: false,
        createdAt: new Date().toISOString()
      }
    }
  }

  const [err, res] = await post<any>('/push/task', data)
  if (err || !res) {
    throw new Error('创建推送任务失败')
  }
  return res as FcResponse<any>
}

export const updateTask = async (id: string, data: Partial<PushTask>): Promise<FcResponse<any>> => {
  if (isMockEnabled()) {
    await mockDelay()
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        id,
        ...data
      }
    }
  }

  const [err, res] = await post<any>(`/push/task/${id}`, data)
  if (err || !res) {
    throw new Error('更新推送任务失败')
  }
  return res as FcResponse<any>
}

export const toggleTaskStatus = async (id: string, status: boolean): Promise<FcResponse<{ id: string; status: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    const task = mockTasks.find(t => t.id === id)
    if (task) {
      task.status = status
    }
    return {
      errno: '0',
      errmsg: 'success',
      data: { id, status }
    }
  }

  const [err, res] = await post<{ id: string; status: boolean }>(`/push/task/${id}/toggle`, { status })
  if (err || !res) {
    throw new Error('切换推送任务状态失败')
  }
  return res as FcResponse<{ id: string; status: boolean }>
}
