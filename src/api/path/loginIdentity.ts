import { ApiResponse } from '@/types/server'
import { normalizePhoneForIam } from './auth'
import { del, get, post } from '../server'

export interface ILoginIdentity {
  id: string
  provider: string
  realm?: string
  identifier?: string
  global_identifier?: string
  created_at?: string
}

export interface ILoginIdentityListResponse {
  items: ILoginIdentity[]
}

export interface IWechatOpenAuthorizeResponse {
  authorize_url: string
  state: string
  app_id: string
  expires_at?: string
  nonce?: string
}

export interface ILinkLoginIdentityResponse {
  login_identity?: ILoginIdentity
  reused?: boolean
}

export function wechatOpenAuthorizeLogin(): ApiResponse<IWechatOpenAuthorizeResponse> {
  return post<IWechatOpenAuthorizeResponse>('/authn/wechat-open/authorize', {})
}

export function wechatOpenAuthorizeLink(): ApiResponse<IWechatOpenAuthorizeResponse> {
  return post<IWechatOpenAuthorizeResponse>('/authn/login-identities/wechat-open/authorize', {})
}

export function listLoginIdentities(): ApiResponse<ILoginIdentityListResponse> {
  return get<ILoginIdentityListResponse>('/authn/login-identities')
}

export function linkWechatOpen(
  code: string,
  state: string
): ApiResponse<ILinkLoginIdentityResponse> {
  return post<ILinkLoginIdentityResponse>('/authn/login-identities/wechat-open', { code, state })
}

export function deleteLoginIdentity(id: string): ApiResponse<{ message?: string }> {
  return del<{ message?: string }>(`/authn/login-identities/${encodeURIComponent(id)}`)
}

/** 向已登录用户发送手机号绑定验证码 */
export function sendLinkPhoneChallenge<T = { message: string }>(
  phone: string
): ApiResponse<T> {
  return post<T>('/authn/login-identities/phone/challenge', {
    phone: normalizePhoneForIam(phone)
  })
}

/** 绑定手机号登录身份（需先完成 challenge） */
export function linkPhone(
  phone: string,
  otpCode: string
): ApiResponse<ILinkLoginIdentityResponse> {
  return post<ILinkLoginIdentityResponse>('/authn/login-identities/phone', {
    phone: normalizePhoneForIam(phone),
    otp_code: otpCode
  })
}

export const loginIdentityApi = {
  wechatOpenAuthorizeLogin,
  wechatOpenAuthorizeLink,
  listLoginIdentities,
  linkWechatOpen,
  deleteLoginIdentity,
  sendLinkPhoneChallenge,
  linkPhone
}
