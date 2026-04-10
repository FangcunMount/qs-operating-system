import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { config } from '../config/config'
import type { QSResponse } from '@/types/qs'
import { handle401Error } from './tokenRefresh'

const isDev = process.env.NODE_ENV === 'development'
const apiHost = process.env.REACT_APP_QS_HOST || config.qsHost || `https://qs.${config.domain}`
// 开发环境使用代理路径以避免 CORS；生产环境使用绝对地址
const baseURL = isDev ? '/api/v1' : `${apiHost}/api/v1`
const internalBaseURL = isDev ? '/internal/v1' : `${apiHost}/internal/v1`

export const qsAxios = axios.create({
  timeout: 50000,
  baseURL
})

export const qsInternalAxios = axios.create({
  timeout: 50000,
  baseURL: internalBaseURL
})

// 使用真实后端 QS API
const attachCommonHeaders = (cfg: AxiosRequestConfig) => {
  cfg.headers = cfg.headers || {}
  cfg.headers['tenant_id'] = '1'
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || config.token || ''
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
qsInternalAxios.interceptors.request.use(attachCommonHeaders)

qsAxios.interceptors.response.use(
  handleQSResponse,
  createResponseErrorHandler(qsAxios)
)

qsInternalAxios.interceptors.response.use(
  handleQSResponse,
  createResponseErrorHandler(qsInternalAxios)
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

export const qsPost = <T>(url: string, data: any = {}, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    // 如果 data 是 undefined 或 null，不发送请求体（某些接口不需要请求体）
    const requestData = data === undefined || data === null ? undefined : data
    const fullUrl = `${baseURL}${url}`
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

export const qsInternalPost = <T>(url: string, data: any = {}, params: any = {}): Promise<[any, QSResponse<T> | undefined]> =>
  new Promise((resolve) => {
    const requestData = data === undefined || data === null ? undefined : data
    const fullUrl = `${internalBaseURL}${url}`
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
export const post = qsPost
export const put = qsPut
export const del = qsDelete
export const internalGet = qsInternalGet
export const internalPost = qsInternalPost
