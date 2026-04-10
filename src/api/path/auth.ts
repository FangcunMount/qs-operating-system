import { ApiResponse } from '@/types/server'
import { get, post } from '../server'

export interface ILoginRequest {
  method: 'password' | 'phone_otp' | 'wechat' | 'wecom'
  tenant_id?: string
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
  return post<T>('/authn/login', {
    method: 'password',
    tenant_id: '1',
    credentials: { username: username, password }
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
