import { config } from '@/config/config'
import { get, post } from '../server'

export type JWKSKeyStatus = 'active' | 'grace' | 'retired'
export type JWKSAlgorithm = 'RS256' | 'RS384' | 'RS512'

export interface IJWKSPublicKey {
  [key: string]: unknown
}

export interface IJWKSPublicDocument {
  keys: IJWKSPublicKey[]
}

export interface IJWKSPublicSnapshot {
  keys: IJWKSPublicKey[]
  raw: string
  sourceURL: string
  fetchedAt: string
  headers: {
    etag?: string
    lastModified?: string
    cacheControl?: string
  }
}

export interface IJWKSKeyInfo {
  kid: string
  status: JWKSKeyStatus
  algorithm: string
  notBefore?: string
  notAfter?: string
  publicJwk?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface IListJWKSKeysRequest {
  status?: JWKSKeyStatus
  limit?: number
  offset?: number
  [key: string]: unknown
}

export interface ICreateJWKSKeyRequest {
  algorithm: JWKSAlgorithm
  notBefore?: string
  notAfter?: string
  [key: string]: unknown
}

export interface IListJWKSKeysResponse {
  keys: IJWKSKeyInfo[]
  total: number
  limit: number
  offset: number
}

export interface IPublishableJWKSKeysResponse {
  keys: IJWKSKeyInfo[]
}

export interface IJWKSCleanupResponse {
  deletedCount: number
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

function resolvePublicJWKSURL() {
  if (process.env.NODE_ENV === 'development') {
    return '/.well-known/jwks.json'
  }
  return `${process.env.REACT_APP_IAM_HOST || config.iamHost || ''}/.well-known/jwks.json`
}

async function fetchPublicJWKS(): Promise<IJWKSPublicSnapshot> {
  const sourceURL = resolvePublicJWKSURL()
  const response = await fetch(sourceURL, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`获取公开 JWKS 失败 (${response.status})`)
  }

  const payload = await response.json() as IJWKSPublicDocument
  return {
    keys: payload.keys || [],
    raw: JSON.stringify(payload, null, 2),
    sourceURL,
    fetchedAt: new Date().toISOString(),
    headers: {
      etag: response.headers.get('ETag') || undefined,
      lastModified: response.headers.get('Last-Modified') || undefined,
      cacheControl: response.headers.get('Cache-Control') || undefined
    }
  }
}

export const jwksApi = {
  getPublicJWKS: async (): Promise<[any, IJWKSPublicSnapshot | undefined]> => {
    try {
      const snapshot = await fetchPublicJWKS()
      return [null, snapshot]
    } catch (error) {
      return [error, undefined]
    }
  },

  listKeys: async (params: IListJWKSKeysRequest = {}): Promise<[any, IListJWKSKeysResponse | undefined]> => {
    const [error, response] = await get<IListJWKSKeysResponse>('/authn/admin/jwks/keys', params)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IListJWKSKeysResponse>(response)]
  },

  getKey: async (kid: string): Promise<[any, IJWKSKeyInfo | undefined]> => {
    const [error, response] = await get<IJWKSKeyInfo>(`/authn/admin/jwks/keys/${encodeURIComponent(kid)}`)
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IJWKSKeyInfo>(response)]
  },

  listPublishableKeys: async (): Promise<[any, IPublishableJWKSKeysResponse | undefined]> => {
    const [error, response] = await get<IPublishableJWKSKeysResponse>('/authn/admin/jwks/keys/publishable')
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IPublishableJWKSKeysResponse>(response)]
  },

  createKey: async (data: ICreateJWKSKeyRequest): Promise<[any, IJWKSKeyInfo | undefined]> => {
    const [error, response] = await post<IJWKSKeyInfo>('/authn/admin/jwks/keys', data)
    if (error) {
      return [error, undefined]
    }
    return [null, unwrapData<IJWKSKeyInfo>(response)]
  },

  enterGracePeriod: async (kid: string): Promise<[any, undefined]> => {
    const [error] = await post<undefined>(`/authn/admin/jwks/keys/${encodeURIComponent(kid)}/grace`, {})
    if (error) {
      return [error, undefined]
    }
    return [null, undefined]
  },

  retireKey: async (kid: string): Promise<[any, undefined]> => {
    const [error] = await post<undefined>(`/authn/admin/jwks/keys/${encodeURIComponent(kid)}/retire`, {})
    if (error) {
      return [error, undefined]
    }
    return [null, undefined]
  },

  cleanupExpiredKeys: async (): Promise<[any, IJWKSCleanupResponse | undefined]> => {
    const [error, response] = await post<IJWKSCleanupResponse>('/authn/admin/jwks/keys/cleanup', {})
    if (error || !response) {
      return [error, undefined]
    }
    return [null, unwrapData<IJWKSCleanupResponse>(response)]
  }
}
