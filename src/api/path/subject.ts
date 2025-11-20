import { get, post, isMockEnabled, mockDelay } from '../server'
import type { FcResponse, ListResponse } from '../../types/server'

// 类型定义
interface Subject {
  id: string
  name: string
  phone: string
  idCard?: string
  schoolId: string
  schoolName: string
  gradeId: string
  gradeName: string
  classId: string
  className: string
  answerCount: number
  scaleReportCount: number
  createdAt: string
}

// Mock 数据
const mockSubjects: Subject[] = [
  {
    id: '1',
    name: '张三',
    phone: '13800138001',
    idCard: '110101199001011234',
    schoolId: 'school1',
    schoolName: '示例小学',
    gradeId: 'grade1',
    gradeName: '一年级',
    classId: 'class1',
    className: '1班',
    answerCount: 5,
    scaleReportCount: 3,
    createdAt: '2024-01-01 10:00:00'
  },
  {
    id: '2',
    name: '李四',
    phone: '13800138002',
    schoolId: 'school1',
    schoolName: '示例小学',
    gradeId: 'grade1',
    gradeName: '一年级',
    classId: 'class2',
    className: '2班',
    answerCount: 3,
    scaleReportCount: 2,
    createdAt: '2024-01-02 10:00:00'
  }
]

export const getSubjectList = async (params: { page?: number; pageSize?: number; keyword?: string }): Promise<FcResponse<ListResponse<Subject>>> => {
  const { page = 1, pageSize = 10, keyword = '' } = params
  
  if (isMockEnabled()) {
    await mockDelay()
    
    let filteredList = mockSubjects
    if (keyword) {
      filteredList = mockSubjects.filter(s => 
        s.name.includes(keyword) || s.phone.includes(keyword)
      )
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return {
      errno: '0',
      errmsg: 'success',
      data: {
        list: filteredList.slice(start, end),
        total: filteredList.length,
        page,
        pageSize
      }
    }
  }
  
  const [err, res] = await get<ListResponse<Subject>>('/subject/list', { page, pageSize, keyword })
  if (err || !res) {
    throw new Error('获取受试者列表失败')
  }
  return res as FcResponse<ListResponse<Subject>>
}

export const getSubjectDetail = async (id: string): Promise<FcResponse<Subject | null>> => {
  if (isMockEnabled()) {
    await mockDelay()
    const subject = mockSubjects.find(s => s.id === id)
    return {
      errno: '0',
      errmsg: 'success',
      data: subject || null
    }
  }
  
  const [err, res] = await get<Subject | null>(`/subject/${id}`, {})
  if (err || !res) {
    throw new Error('获取受试者详情失败')
  }
  return res as FcResponse<Subject | null>
}

export const createSubject = async (subject: Partial<Subject>): Promise<FcResponse<{ success: boolean; id: string }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 创建受试者', subject)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true, id: Date.now().toString() }
    }
  }
  
  const [err, res] = await post<{ success: boolean; id: string }>('/subject', subject)
  if (err || !res) {
    throw new Error('创建受试者失败')
  }
  return res as FcResponse<{ success: boolean; id: string }>
}

export const updateSubject = async (id: string, subject: Partial<Subject>): Promise<FcResponse<{ success: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 更新受试者', id, subject)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true }
    }
  }
  
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}`, subject)
  if (err || !res) {
    throw new Error('更新受试者失败')
  }
  return res as FcResponse<{ success: boolean }>
}

export const deleteSubject = async (id: string): Promise<FcResponse<{ success: boolean }>> => {
  if (isMockEnabled()) {
    await mockDelay()
    console.log('Mock: 删除受试者', id)
    return {
      errno: '0',
      errmsg: 'success',
      data: { success: true }
    }
  }
  
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}/delete`, {})
  if (err || !res) {
    throw new Error('删除受试者失败')
  }
  return res as FcResponse<{ success: boolean }>
}
