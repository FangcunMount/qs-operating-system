import { ApiResponse } from '@/types/server'
import { post } from '../server'

export interface ILoginRequest {
  auth_method: 'password' | 'phone_otp' | 'wechat' | 'wecom'
  method_payload: {
    username?: string
    password?: string
    phone?: string
    otp_code?: string
    app_id?: string
    code?: string
    corp_id?: string
    auth_code?: string
    tenant_id?: number
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
    auth_method: 'password',
    method_payload: {
      username,
      password,
      tenant_id: 1
    }
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

export function getToken<T = ITokenPair>(
  code: string,
  appId: string
): ApiResponse<T> {
  return post<T>('/authn/login', {
    auth_method: 'wechat',
    method_payload: {
      app_id: appId,
      code
    }
  })
}

export const authApi = {
  login,
  refreshToken,
  logout,
  getToken
}
