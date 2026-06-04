import { ApiResponse } from '@/types/server'
import { post } from '../server'

export interface ILoginRequest {
  auth_method: 'password' | 'phone_otp' | 'wechat' | 'wechat_scan' | 'wecom'
  method_payload: {
    username?: string
    password?: string
    phone?: string
    otp_code?: string
    app_id?: string
    code?: string
    state?: string
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

/** 微信开放平台扫码登录（OAuth code + state） */
export function loginWithWechatScan<T = ITokenPair>(
  code: string,
  state: string,
  appId: string
): ApiResponse<T> {
  return post<T>('/authn/login', {
    auth_method: 'wechat_scan',
    method_payload: {
      app_id: appId,
      code,
      state
    }
  })
}

/** IAM 规范：E.164；输入可为国内 11 位或已带 +86 */
export function normalizePhoneForIam(phone: string): string {
  const trimmed = phone.trim().replace(/\s/g, '')
  if (trimmed.startsWith('+')) {
    return trimmed
  }
  if (/^86\d{11}$/.test(trimmed)) {
    return `+${trimmed}`
  }
  return `+86${trimmed}`
}

export function sendLoginPhoneOtp<T = { message: string }>(
  phone: string
): ApiResponse<T> {
  return post<T>('/authn/challenges/phone-otp', {
    phone: normalizePhoneForIam(phone)
  })
}

export function loginWithPhoneOtp<T = ITokenPair>(
  phone: string,
  otpCode: string
): ApiResponse<T> {
  return post<T>('/authn/login', {
    auth_method: 'phone_otp',
    method_payload: {
      phone: normalizePhoneForIam(phone),
      otp_code: otpCode
    }
  })
}

export const authApi = {
  login,
  refreshToken,
  logout,
  getToken,
  loginWithWechatScan,
  sendLoginPhoneOtp,
  loginWithPhoneOtp
}
