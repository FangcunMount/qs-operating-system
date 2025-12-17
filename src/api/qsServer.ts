import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { config } from '../config/config'
import type { QSResponse } from '@/types/qs'

const isDev = process.env.NODE_ENV === 'development'
// 开发环境使用 /api/v1，让代理转发请求以避免 CORS；生产环境使用绝对地址
const baseURL = isDev ? '/api/v1' : (process.env.REACT_APP_QS_HOST || config.qsHost || `https://qs.${config.domain}/api/v1`)

// Token 刷新状态管理（与 server.ts 共享）
let isQsRefreshing = false
let qsRefreshSubscribers: Array<(token: string) => void> = []

function subscribeQsTokenRefresh(cb: (token: string) => void): void {
  qsRefreshSubscribers.push(cb)
}

function onQsTokenRefreshed(token: string): void {
  qsRefreshSubscribers.forEach(cb => cb(token))
  qsRefreshSubscribers = []
}

export const qsAxios = axios.create({
  timeout: 50000,
  baseURL
})

// 使用真实后端 QS API

qsAxios.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token') || config.token || ''
  if (token) {
    cfg.headers['Authorization'] = `Bearer ${token}`
  }
  return cfg
})

qsAxios.interceptors.response.use(
  (response) => {
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
  },
  async (err: AxiosError) => {
    const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean }

    // 判断是否是 401 错误且未重试过
    if (err.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // 如果已经在刷新 token，将请求加入队列
      if (isQsRefreshing) {
        return new Promise((resolve) => {
          subscribeQsTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`
            }
            resolve(qsAxios(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isQsRefreshing = true

      try {
        const refreshTokenValue = localStorage.getItem('refresh_token')
        
        if (!refreshTokenValue) {
          // 没有 refresh_token，跳转到登录页
          errorHandler.handleAuthError('401')
          isQsRefreshing = false
          return Promise.reject(err)
        }

        // 动态导入 auth API 避免循环依赖
        const { refreshToken: refreshTokenAPI } = await import('./path/auth')
        const [error, response] = await refreshTokenAPI(refreshTokenValue)

        if (error || !response?.data) {
          // 刷新失败，清除 token 并跳转登录
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          errorHandler.handleAuthError('401')
          isQsRefreshing = false
          return Promise.reject(err)
        }

        // 存储新的 token
        const { access_token, refresh_token } = response.data
        localStorage.setItem('access_token', access_token)
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token)
        }

        // 通知所有等待的请求
        onQsTokenRefreshed(access_token)

        // 更新当前请求的 token 并重试
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`
        }

        isQsRefreshing = false
        return qsAxios(originalRequest)
      } catch (refreshError) {
        // 刷新失败
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        errorHandler.handleAuthError('401')
        isQsRefreshing = false
        return Promise.reject(refreshError)
      }
    }

    const status = err && err.response && err.response.status ? String(err.response.status) : ''
    errorHandler.handleNetworkError(status, message.error)
    return Promise.reject(err?.response || err)
  }
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
    qsAxios
      .post(url, requestData, { params })
      .then((result) => resolve([null, result.data as QSResponse<T>]))
      .catch((err) => resolve([err, undefined]))
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
