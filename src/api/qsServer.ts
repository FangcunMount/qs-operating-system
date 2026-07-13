import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { config } from '../config/config'
import type { QSResponse } from '@/types/qs'
import { handle401Error } from './tokenRefresh'
import { getCurrentTenantId, getStoredAccessToken } from '@/utils/jwtClaims'

const isDev = process.env.NODE_ENV === 'development'
const apiHost = process.env.REACT_APP_QS_HOST || config.qsHost || `https://qs.${config.domain}`
const ABSOLUTE_URL_RE = /^(?:[a-z][a-z\d+.-]*:)?\/\//i

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')
const ensureLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`)

const stripKnownQSBasePath = (value: string) => {
  const normalizedValue = trimTrailingSlash(value)
  const knownSuffixes = ['/api/v1/internal/v1', '/api/v2', '/api/v1', '/internal/v1']
  const matchedSuffix = knownSuffixes.find((suffix) => normalizedValue.endsWith(suffix))

  if (!matchedSuffix) {
    return normalizedValue
  }

  return normalizedValue.slice(0, -matchedSuffix.length)
}

const getPathname = (value?: string) => {
  if (!value) return ''

  try {
    const pathname = new URL(value, 'https://qs.local').pathname
    return trimTrailingSlash(pathname) || '/'
  } catch {
    return ''
  }
}

const normalizeRelativeRequestUrl = (base?: string, url?: string) => {
  if (!url || ABSOLUTE_URL_RE.test(url)) {
    return url
  }

  const normalizedUrl = ensureLeadingSlash(url)
  const basePath = getPathname(base)

  if (!basePath || basePath === '/') {
    return normalizedUrl
  }

  if (normalizedUrl === basePath) {
    return '/'
  }

  if (normalizedUrl.startsWith(`${basePath}/`)) {
    return normalizedUrl.slice(basePath.length)
  }

  return normalizedUrl
}

const buildQSBaseURL = (host: string, prefix: '/api/v1' | '/api/v2' | '/internal/v1') => {
  const origin = stripKnownQSBasePath(host)
  return `${origin}${prefix}`
}

const buildDebugUrl = (base: string, url: string) => {
  if (ABSOLUTE_URL_RE.test(url)) {
    return url
  }

  return `${trimTrailingSlash(base)}${normalizeRelativeRequestUrl(base, url) || ''}`
}

// 开发环境使用代理路径以避免 CORS；生产环境统一规范为恰好一个 API 前缀
const baseURL = isDev ? '/api/v1' : buildQSBaseURL(apiHost, '/api/v1')
const v2BaseURL = isDev ? '/api/v2' : buildQSBaseURL(apiHost, '/api/v2')
const internalBaseURL = isDev ? '/internal/v1' : buildQSBaseURL(apiHost, '/internal/v1')

export const qsAxios = axios.create({
  timeout: 50000,
  baseURL
})

export const qsSilentAxios = axios.create({
  timeout: 50000,
  baseURL
})

export const qsV2Axios = axios.create({
  timeout: 50000,
  baseURL: v2BaseURL
})

export const qsV2SilentAxios = axios.create({
  timeout: 50000,
  baseURL: v2BaseURL
})

export const qsInternalAxios = axios.create({
  timeout: 50000,
  baseURL: internalBaseURL
})

export const qsInternalRawAxios = axios.create({
  timeout: 50000,
  baseURL: internalBaseURL
})

// 使用真实后端 QS API
const attachCommonHeaders = (cfg: AxiosRequestConfig) => {
  cfg.headers = cfg.headers || {}
  cfg.url = normalizeRelativeRequestUrl(cfg.baseURL, cfg.url)
  const tenantId = getCurrentTenantId()
  if (tenantId) {
    cfg.headers['tenant_id'] = tenantId
  }
  const token = getStoredAccessToken()
  if (token) {
    cfg.headers['Authorization'] = `Bearer ${token}`
  }
  return cfg
}

const handleQSResponse = (response: any) => {
  if (response.status !== 200) {
    return Promise.reject(response.data)
  }

  const data: QSResponse<any> = response.data
  if (typeof data?.code !== 'number' || data.code !== 0) {
    const codeStr = data && typeof data.code !== 'undefined' ? String(data.code) : ''
    const handled = errorHandler.handleAuthError(codeStr)
    if (handled) {
      message.error(data?.message || '请求失败')
    }
    return Promise.reject(data)
  }

  return response
}

const createResponseErrorHandler = (
  client: typeof qsAxios
) => async (err: AxiosError) => {
  const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean }

  // 处理 401 错误并自动刷新 token
  if (err.response?.status === 401 && originalRequest) {
    try {
      return await handle401Error(err, originalRequest, (config) => client(config))
    } catch (refreshErr) {
      return Promise.reject(refreshErr)
    }
  }

  if (err.response?.status === 429) {
    const rateLimitMessage =
      err.response?.data?.message || '请求过于频繁，请稍后再试'
    message.warning(rateLimitMessage)
    return Promise.reject(err?.response || err)
  }

  const status = err && err.response && err.response.status ? String(err.response.status) : ''
  errorHandler.handleNetworkError(status, message.error)
  return Promise.reject(err?.response || err)
}

qsAxios.interceptors.request.use(attachCommonHeaders)
qsSilentAxios.interceptors.request.use(attachCommonHeaders)
qsV2Axios.interceptors.request.use(attachCommonHeaders)
qsV2SilentAxios.interceptors.request.use(attachCommonHeaders)
qsInternalAxios.interceptors.request.use(attachCommonHeaders)
qsInternalRawAxios.interceptors.request.use(attachCommonHeaders)

qsAxios.interceptors.response.use(
  handleQSResponse,
  createResponseErrorHandler(qsAxios)
)

qsV2Axios.interceptors.response.use(
  handleQSResponse,
  createResponseErrorHandler(qsV2Axios)
)

qsInternalAxios.interceptors.response.use(
  handleQSResponse,
  createResponseErrorHandler(qsInternalAxios)
)

qsInternalRawAxios.interceptors.response.use(
  (response) => response,
  createResponseErrorHandler(qsInternalRawAxios)
)

type Fn<T> = (data: QSResponse<T>) => unknown

export const qsGet = <T>(url: string, params: any = {}, clearFn?: Fn<T>): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsAxios
      .get(url, { params })
      .then((result) => {
        let tmp: QSResponse<T>
        if (clearFn) {
          tmp = clearFn(result.data) as unknown as QSResponse<T>
        } else {
          tmp = result.data as QSResponse<T>
        }
        resolve([null, tmp])
      })
      .catch((err) => resolve([err, undefined]))
  })

export const qsSilentGet = <T>(url: string, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsSilentAxios
      .get(url, {
        params,
        validateStatus: () => true
      })
      .then((result) => {
        if (result.status === 200 && result.data?.code === 0) {
          resolve([null, result.data as QSResponse<T>])
          return
        }
        resolve([result, undefined])
      })
      .catch((err) => resolve([err, undefined]))
  })

export const qsV2Get = <T>(url: string, params: any = {}, clearFn?: Fn<T>): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsV2Axios
      .get(url, { params })
      .then((result) => {
        const data = clearFn
          ? clearFn(result.data) as QSResponse<T>
          : result.data as QSResponse<T>
        resolve([null, data])
      })
      .catch((err) => resolve([err, undefined]))
  })

/**
 * Silent reads keep 404/403/429 available to the caller without displaying a
 * global network toast.  This is required for report-not-generated state.
 */
export const qsV2SilentGet = <T>(url: string, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsV2SilentAxios
      .get(url, { params, validateStatus: () => true })
      .then((result) => {
        if (result.status === 200 && result.data?.code === 0) {
          resolve([null, result.data as QSResponse<T>])
          return
        }
        resolve([result, undefined])
      })
      .catch((err) => resolve([err, undefined]))
  })

export const getHttpStatus = (error: unknown): number | undefined => {
  const candidate = error as { status?: unknown; response?: { status?: unknown } } | undefined
  const status = candidate?.status ?? candidate?.response?.status
  return typeof status === 'number' ? status : undefined
}

export const qsPost = <T>(url: string, data: any = {}, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    // 如果 data 是 undefined 或 null，不发送请求体（某些接口不需要请求体）
    const requestData = data === undefined || data === null ? undefined : data
    const fullUrl = buildDebugUrl(baseURL, url)
    console.log('[qsPost] 发送 POST 请求:', {
      url: fullUrl,
      data: requestData,
      params
    })
    qsAxios
      .post(url, requestData, { params })
      .then((result) => {
        console.log('[qsPost] 请求成功:', { url: fullUrl, status: result.status, data: result.data })
        resolve([null, result.data as QSResponse<T>])
      })
      .catch((err) => {
        console.error('[qsPost] 请求失败:', {
          url: fullUrl,
          error: err,
          response: err?.response,
          status: err?.response?.status,
          data: err?.response?.data
        })
        resolve([err, undefined])
      })
  })

export const qsInternalGet = <T>(url: string, params: any = {}, clearFn?: Fn<T>): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsInternalAxios
      .get(url, { params })
      .then((result) => {
        let tmp: QSResponse<T>
        if (clearFn) {
          tmp = clearFn(result.data) as unknown as QSResponse<T>
        } else {
          tmp = result.data as QSResponse<T>
        }
        resolve([null, tmp])
      })
      .catch((err) => resolve([err, undefined]))
  })

export const qsInternalRawGet = <T>(url: string, params: any = {}): Promise<[any, T | undefined]> =>
  new Promise((resolve) => {
    qsInternalRawAxios
      .get(url, { params })
      .then((result) => resolve([null, result.data as T]))
      .catch((err) => resolve([err, undefined]))
  })

export const qsInternalPost = <T>(url: string, data: any = {}, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    const requestData = data === undefined || data === null ? undefined : data
    const fullUrl = buildDebugUrl(internalBaseURL, url)
    console.log('[qsInternalPost] 发送 POST 请求:', {
      url: fullUrl,
      data: requestData,
      params
    })
    qsInternalAxios
      .post(url, requestData, { params })
      .then((result) => {
        console.log('[qsInternalPost] 请求成功:', { url: fullUrl, status: result.status, data: result.data })
        resolve([null, result.data as QSResponse<T>])
      })
      .catch((err) => {
        console.error('[qsInternalPost] 请求失败:', {
          url: fullUrl,
          error: err,
          response: err?.response,
          status: err?.response?.status,
          data: err?.response?.data
        })
        resolve([err, undefined])
      })
  })

export const qsPut = <T>(url: string, data: any = {}, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsAxios
      .put(url, data, { params })
      .then((result) => resolve([null, result.data as QSResponse<T>]))
      .catch((err) => resolve([err, undefined]))
  })

export const qsDelete = <T>(url: string, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    qsAxios
      .delete(url, { params })
      .then((result) => resolve([null, result.data as QSResponse<T>]))
      .catch((err) => resolve([err, undefined]))
  })

// 别名导出，方便使用
export const get = qsGet
export const silentGet = qsSilentGet
export const v2Get = qsV2Get
export const v2SilentGet = qsV2SilentGet
export const post = qsPost
export const put = qsPut
export const del = qsDelete
export const internalGet = qsInternalGet
export const internalPost = qsInternalPost
export const internalRawGet = qsInternalRawGet
