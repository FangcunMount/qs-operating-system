import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { FcResponse } from '../types/server'
import { config } from '../config/config'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { handle401Error } from './tokenRefresh'

const isDev = process.env.NODE_ENV === 'development'
const apiAxios = axios.create({
  timeout: 50000,
  // 开发环境使用相对路径（''），让 webpack dev-server 的 `setupProxy.js` 转发请求以避免 CORS
  // 生产/非开发环境使用配置或环境变量的绝对地址
  baseURL: isDev ? '' : (process.env.REACT_APP_HOST || process.env.REACT_APP_IAM_HOST || config.iamHost || config.host)
})

// 直接使用真实网络请求
apiAxios.interceptors.request.use((cfg) => {
  const accessToken = localStorage.getItem('access_token') || localStorage.getItem('token') || config.token || ''
  if (accessToken) {
    cfg.headers['Authorization'] = `Bearer ${accessToken}`
    cfg.headers['token'] = accessToken
  }
  return cfg
})
apiAxios.interceptors.response.use(
  (response) => {
    if (response.status !== 200) {
      return Promise.reject(response.data)
    }

    const data = response.data
    // 支持新格式 (code) 和旧格式 (errno)
    const isNewFormat = typeof data.code !== 'undefined'
    // 新格式支持 code === 0 或 code === 200（HTTP风格）
    const isSuccess = isNewFormat ? (data.code === 0 || data.code === 200) : data.errno === '0'

    if (!isSuccess) {
      const errorCode = isNewFormat ? String(data.code) : data.errno
      const errorMsg = isNewFormat ? data.message : data.errmsg
      
      const authErrFlag = errorHandler.handleAuthError(errorCode)
      if (authErrFlag) {
        message.error(errorMsg)
      }

      return Promise.reject(data)
    }

    return response
  },
  async (err: AxiosError) => {
    const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean }

    // 处理 401 错误并自动刷新 token
    if (err.response?.status === 401 && originalRequest) {
      try {
        return await handle401Error(err, originalRequest, (config) => apiAxios(config))
      } catch (refreshErr) {
        return Promise.reject(refreshErr)
      }
    }

    // 处理其他网络错误
    errorHandler.handleNetworkError(err && err.response && err.response.status ? String(err.response.status) : '', message.error)
    return Promise.reject(err.response)
  }
)

type Fn = (data: FcResponse<any>) => unknown
interface IAnyObj {
  [index: string]: unknown
}

export const get = <T>(url: string, params: IAnyObj = {}, clearFn?: Fn): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    apiAxios
      .get(url, { params })
      .then((result) => {
        let tmp: FcResponse<T>
        if (clearFn !== undefined) {
          tmp = clearFn(result.data) as unknown as FcResponse<T>
        } else {
          tmp = result.data as FcResponse<T>
        }
        resolve([null, tmp as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

export const post = <T>(url: string, data: IAnyObj, params: IAnyObj = {}): Promise<[any, FcResponse<T> | undefined]> => {
  return new Promise((resolve) => {
    apiAxios
      .post(url, data, { params })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })
}

export const patch = <T>(url: string, data: IAnyObj, params: IAnyObj = {}): Promise<[any, FcResponse<T> | undefined]> => {
  return new Promise((resolve) => {
    apiAxios
      .patch(url, data, { params })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })
}

// 如需在运行时模拟，请使用独立的 mock 层或本地代理。当前已完全使用后端 API。
