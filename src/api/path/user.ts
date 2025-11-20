import { get, post } from '../server'
import { isMockEnabled, mockDelay } from '../mockConfig'
import { FcResponse } from '../../types/server'

// ==================== 类型定义 ====================
export interface IUserProfile {
  id: string
  username: string
  nickname: string
  email: string
  phone: string
  avatar: string
  department: string
  position: string
  role: string
  createTime: string
  lastLoginTime: string
}

// ==================== Mock 数据 ====================
const mockUserProfile: IUserProfile = {
  id: '1',
  username: 'admin',
  nickname: '管理员',
  email: 'admin@example.com',
  phone: '13800138000',
  avatar: '',
  department: '技术部',
  position: '系统管理员',
  role: 'super_admin',
  createTime: '2024-01-01 10:00:00',
  lastLoginTime: '2024-11-20 09:30:00'
}

// ==================== API 方法 ====================

/**
 * 获取用户信息
 */
export const getUserProfile = async (): Promise<[any, FcResponse<IUserProfile> | undefined]> => {
  if (isMockEnabled('user')) {
    await mockDelay()
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: mockUserProfile
    }]
  }
  
  return get<IUserProfile>('/api/user/profile')
}

/**
 * 更新用户信息
 */
export const updateUserProfile = async (data: Partial<IUserProfile>): Promise<[any, FcResponse<null> | undefined]> => {
  if (isMockEnabled('user')) {
    await mockDelay()
    console.log('Mock: 更新用户信息', data)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: null
    }]
  }
  
  return post<null>('/api/user/profile', data)
}

/**
 * 修改密码
 */
export const changePassword = async (oldPassword: string, newPassword: string): Promise<[any, FcResponse<null> | undefined]> => {
  if (isMockEnabled('user')) {
    await mockDelay()
    console.log('Mock: 修改密码', { oldPassword, newPassword })
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: null
    }]
  }
  
  return post<null>('/api/user/password', { oldPassword, newPassword })
}

/**
 * 上传头像
 */
export const uploadAvatar = async (file: File): Promise<[any, FcResponse<{ url: string }> | undefined]> => {
  if (isMockEnabled('user')) {
    await mockDelay()
    const mockUrl = URL.createObjectURL(file)
    console.log('Mock: 上传头像', file.name)
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: { url: mockUrl }
    }]
  }
  
  const formData = new FormData()
  formData.append('file', file)
  return post<{ url: string }>('/api/user/avatar', formData as any)
}

/**
 * 登录
 */
export const login = async (username: string, password: string): Promise<[any, FcResponse<{ token: string }> | undefined]> => {
  if (isMockEnabled('user')) {
    await mockDelay()
    console.log('Mock: 登录', { username, password })
    return [null, {
      errno: '0',
      errmsg: 'success',
      data: { token: 'mock-token-' + Date.now() }
    }]
  }
  
  return post<{ token: string }>('/api/user/login', { username, password })
}

export const userApi = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadAvatar,
  login
}
