import { get, post } from '../server'
import { isMockEnabled, mockDelay } from '../mockConfig'
import { FcResponse } from '../../types/server'

// ==================== 类型定义 ====================
export interface IAdmin {
  id: string
  username: string
  nickname: string
  email: string
  phone: string
  role: string
  status: 'active' | 'disabled'
  createTime: string
  lastLoginTime: string
}

export interface IAdminListResponse {
  list: IAdmin[]
  total: number
}

// ==================== Mock 数据 ====================
const mockAdminList: IAdmin[] = [
  {
    id: '1',
    username: 'admin',
    nickname: '超级管理员',
    email: 'admin@example.com',
    phone: '13800138000',
    role: 'super_admin',
    status: 'active',
    createTime: '2024-01-01 10:00:00',
    lastLoginTime: '2024-11-20 14:30:00'
  },
  {
    id: '2',
    username: 'manager',
    nickname: '管理员',
    email: 'manager@example.com',
    phone: '13800138001',
    role: 'admin',
    status: 'active',
    createTime: '2024-01-05 14:20:00',
    lastLoginTime: '2024-11-19 16:45:00'
  },
  {
    id: '3',
    username: 'editor',
    nickname: '编辑员',
    email: 'editor@example.com',
    phone: '13800138002',
    role: 'editor',
    status: 'active',
    createTime: '2024-02-01 10:00:00',
    lastLoginTime: '2024-11-18 09:15:00'
  },
  {
    id: '4',
    username: 'viewer',
    nickname: '查看员',
    email: 'viewer@example.com',
    phone: '13800138003',
    role: 'viewer',
    status: 'disabled',
    createTime: '2024-03-01 10:00:00',
    lastLoginTime: '2024-11-10 11:20:00'
  }
]

// ==================== API 方法 ====================

/**
 * 获取管理员列表
 */
export const getAdminList = async (
  page = 1, 
  pageSize = 10, 
  keyword = ''
): Promise<[any, FcResponse<IAdminListResponse> | undefined]> => {
  if (isMockEnabled('admin')) {
    await mockDelay()
    
    let filteredList = mockAdminList
    if (keyword) {
      filteredList = mockAdminList.filter(admin => 
        admin.username.includes(keyword) || 
        admin.nickname.includes(keyword) ||
        admin.email.includes(keyword)
      )
    }
    
    const start = (page - 1) * pageSize
    const end = start + pageSize
    
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: {
        list: filteredList.slice(start, end),
        total: filteredList.length
      }
    }]
  }
  
  return get<IAdminListResponse>('/api/admin/list', { page, pageSize, keyword })
}

/**
 * 创建管理员
 */
export const createAdmin = async (
  data: Omit<IAdmin, 'id' | 'createTime' | 'lastLoginTime'>
): Promise<[any, FcResponse<{ id: string }> | undefined]> => {
  if (isMockEnabled('admin')) {
    await mockDelay()
    console.log('Mock: 创建管理员', data)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: { id: 'new-' + Date.now() }
    }]
  }
  
  return post<{ id: string }>('/api/admin/create', data)
}

/**
 * 更新管理员
 */
export const updateAdmin = async (id: string, data: Partial<IAdmin>): Promise<[any, FcResponse<null> | undefined]> => {
  if (isMockEnabled('admin')) {
    await mockDelay()
    console.log('Mock: 更新管理员', id, data)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: null
    }]
  }
  
  return post<null>(`/api/admin/update/${id}`, data)
}

/**
 * 删除管理员
 */
export const deleteAdmin = async (id: string): Promise<[any, FcResponse<null> | undefined]> => {
  if (isMockEnabled('admin')) {
    await mockDelay()
    console.log('Mock: 删除管理员', id)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: null
    }]
  }
  
  return post<null>(`/api/admin/delete/${id}`, {})
}

/**
 * 重置密码
 */
export const resetAdminPassword = async (id: string): Promise<[any, FcResponse<{ newPassword: string }> | undefined]> => {
  if (isMockEnabled('admin')) {
    await mockDelay()
    console.log('Mock: 重置密码', id)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: { newPassword: '123456' }
    }]
  }
  
  return post<{ newPassword: string }>(`/api/admin/reset-password/${id}`, {})
}

export const adminApi = {
  getAdminList,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword
}
