import { get, post } from '../server'
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

// Mock 数据已移除，使用真实后端 API

// ==================== API 方法 ====================

/**
 * 获取管理员列表
 */
export const getAdminList = async (
  page = 1, 
  pageSize = 10, 
  keyword = ''
): Promise<[any, FcResponse<IAdminListResponse> | undefined]> => {
  return get<IAdminListResponse>('/api/admin/list', { page, pageSize, keyword })
}

/**
 * 创建管理员
 */
export const createAdmin = async (
  data: Omit<IAdmin, 'id' | 'createTime' | 'lastLoginTime'>
): Promise<[any, FcResponse<{ id: string }> | undefined]> => {
  return post<{ id: string }>('/api/admin/create', data)
}

/**
 * 更新管理员
 */
export const updateAdmin = async (id: string, data: Partial<IAdmin>): Promise<[any, FcResponse<null> | undefined]> => {
  return post<null>(`/api/admin/update/${id}`, data)
}

/**
 * 删除管理员
 */
export const deleteAdmin = async (id: string): Promise<[any, FcResponse<null> | undefined]> => {
  return post<null>(`/api/admin/delete/${id}`, {})
}

/**
 * 重置密码
 */
export const resetAdminPassword = async (id: string): Promise<[any, FcResponse<{ newPassword: string }> | undefined]> => {
  return post<{ newPassword: string }>(`/api/admin/reset-password/${id}`, {})
}

export const adminApi = {
  getAdminList,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  resetAdminPassword
}
