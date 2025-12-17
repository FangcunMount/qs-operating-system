import { get, post, patch } from '../server'
import { FcResponse } from '../../types/server'
import { login as authLogin, ITokenPair } from './auth'

// ==================== 类型定义 ====================
export interface IContact {
  type: 'phone' | 'email'
  value: string
}

export interface IUserProfile {
  id: string
  status: string
  nickname: string
  contacts: IContact[]
}

export interface IUserUpdateRequest {
  nickname?: string
  contacts?: IContact[]
  [key: string]: any  // 索引签名，兼容 post 方法的 IAnyObj 类型
}

// ==================== API 方法 ====================

/**
 * 获取用户信息
 */
export const getUserProfile = async (): Promise<[any, FcResponse<IUserProfile> | undefined]> => {
  // 使用相对路径，让 setupProxy.js 代理转发
  return get<IUserProfile>('/identity/me')
}

/**
 * 更新用户信息
 */
export const updateUserProfile = async (data: IUserUpdateRequest): Promise<[any, FcResponse<IUserProfile> | undefined]> => {
  // 使用相对路径，让 setupProxy.js 代理转发
  // PATCH 请求更新用户信息（符合 RESTful 规范）
  return patch<IUserProfile>('/identity/me', data)
}

/**
 * 修改密码
 */
export const changePassword = async (oldPassword: string, newPassword: string): Promise<[any, FcResponse<null> | undefined]> => {
  return post<null>('/api/user/password', { oldPassword, newPassword })
}

/**
 * 上传头像
 */
export const uploadAvatar = async (file: File): Promise<[any, FcResponse<{ url: string }> | undefined]> => {
  const formData = new FormData()
  formData.append('file', file)
  return post<{ url: string }>('/api/user/avatar', formData as any)
}

/**
 * 登录
 */
export const login = async (username: string, password: string): Promise<[any, FcResponse<ITokenPair> | undefined]> => {
  return authLogin(username, password)
}

export const userApi = {
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadAvatar,
  login
}
