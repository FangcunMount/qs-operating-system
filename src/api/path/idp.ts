import { get, patch, post } from '../server'

export type WechatAppType = 'MiniProgram' | 'MP'
export type WechatAppStatus = 'Enabled' | 'Disabled' | 'Archived'

export interface IWechatApp {
  id: string
  app_id: string
  name: string
  type: WechatAppType
  status: WechatAppStatus
}

export interface IWechatAppListResponse {
  total: number
  items: IWechatApp[]
}

export interface IListWechatAppsRequest {
  type?: WechatAppType
  status?: WechatAppStatus
  [key: string]: unknown
}

export interface ICreateWechatAppRequest {
  app_id: string
  name: string
  type: WechatAppType
  app_secret?: string
  [key: string]: unknown
}

export interface IUpdateWechatAppRequest {
  name?: string
  type?: WechatAppType
  [key: string]: unknown
}

export interface IRotateAuthSecretRequest {
  app_id: string
  new_secret: string
  [key: string]: unknown
}

export interface IRotateMsgSecretRequest {
  app_id: string
  callback_token: string
  encoding_aes_key: string
  [key: string]: unknown
}

export interface IWechatAccessTokenResponse {
  access_token: string
  expires_in: number
}

type WrappedResponse<T> = {
  data?: T
}

function unwrapData<T>(response: WrappedResponse<T> | T | undefined): T | undefined {
  if (!response) {
    return undefined
  }
  if (typeof response === 'object' && response !== null && 'data' in response) {
    return (response as WrappedResponse<T>).data
  }
  return response as T
}

export const idpApi = {
  listWechatApps: async (params: IListWechatAppsRequest = {}): Promise<[any, IWechatAppListResponse | undefined]> => {
    const [error, response] = await get<IWechatAppListResponse>('/idp/wechat-apps', params)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatAppListResponse>(response)]
  },

  createWechatApp: async (data: ICreateWechatAppRequest): Promise<[any, IWechatApp | undefined]> => {
    const [error, response] = await post<IWechatApp>('/idp/wechat-apps', data)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatApp>(response)]
  },

  updateWechatApp: async (appID: string, data: IUpdateWechatAppRequest): Promise<[any, IWechatApp | undefined]> => {
    const [error, response] = await patch<IWechatApp>(`/idp/wechat-apps/${encodeURIComponent(appID)}`, data)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatApp>(response)]
  },

  enableWechatApp: async (appID: string): Promise<[any, IWechatApp | undefined]> => {
    const [error, response] = await post<IWechatApp>(`/idp/wechat-apps/${encodeURIComponent(appID)}/enable`, {})
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatApp>(response)]
  },

  disableWechatApp: async (appID: string): Promise<[any, IWechatApp | undefined]> => {
    const [error, response] = await post<IWechatApp>(`/idp/wechat-apps/${encodeURIComponent(appID)}/disable`, {})
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatApp>(response)]
  },

  rotateAuthSecret: async (data: IRotateAuthSecretRequest): Promise<[any, undefined]> => {
    const [error, response] = await post<undefined>('/idp/wechat-apps/rotate-auth-secret', data)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, undefined]
  },

  rotateMsgSecret: async (data: IRotateMsgSecretRequest): Promise<[any, undefined]> => {
    const [error, response] = await post<undefined>('/idp/wechat-apps/rotate-msg-secret', data)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, undefined]
  },

  getAccessToken: async (appID: string): Promise<[any, IWechatAccessTokenResponse | undefined]> => {
    const [error, response] = await get<IWechatAccessTokenResponse>(`/idp/wechat-apps/${encodeURIComponent(appID)}/access-token`)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatAccessTokenResponse>(response)]
  },

  refreshAccessToken: async (appID: string): Promise<[any, IWechatAccessTokenResponse | undefined]> => {
    const [error, response] = await post<IWechatAccessTokenResponse>('/idp/wechat-apps/refresh-access-token', {
      app_id: appID
    })
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IWechatAccessTokenResponse>(response)]
  }
}
