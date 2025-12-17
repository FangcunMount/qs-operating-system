import { ApiResponse } from '@/types/server'
import { get, post } from '../server'

export interface ILoginRequest {
  method: 'password' | 'phone_otp' | 'wechat' | 'wecom'
  credentials: {
    username?: string
    password?: string
    phone?: string
    code?: string
  }
  device_id?: string
}

export interface ITokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export function login<T = ITokenPair>(
  username: string,
  password: string
): ApiResponse<T> {
  // 自动在用户名前添加 +86（如果还没有的话）
  const formattedUsername = username.startsWith('+86') ? username : `+86${username}`
  
  return post<T>('/authn/login', {
    method: 'password',
    credentials: { username: formattedUsername, password }
  })
}

export function refreshToken<T = ITokenPair>(
  refreshToken: string
): ApiResponse<T> {
  return post<T>('/authn/refresh_token', {
    refresh_token: refreshToken
  })
}

export function logout<T = { message: string }>(
  accessToken?: string,
  refreshToken?: string
): ApiResponse<T> {
  return post<T>('/authn/logout', {
    access_token: accessToken,
    refresh_token: refreshToken
  })
}

export function getToken<T = { token: string }>(
  code: string
): ApiResponse<T> {
  return get<T>('/authn/login', { code })
}

export const authApi = {
  login,
  refreshToken,
  logout,
  getToken
}
