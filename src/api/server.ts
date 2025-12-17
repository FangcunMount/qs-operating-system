import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { FcResponse } from '../types/server'
import { config } from '../config/config'
import { errorHandler } from 'fc-tools-pc/dist/bundle'

// Token 刷新状态管理
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

// 添加刷新订阅者
function subscribeTokenRefresh(cb: (token: string) => void): void {
  refreshSubscribers.push(cb)
}

// 通知所有订阅者
function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

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

    // 判断是否是 401 错误且未重试过
    if (err.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // 如果已经在刷新 token，将请求加入队列
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${token}`
            }
            resolve(apiAxios(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshTokenValue = localStorage.getItem('refresh_token')
        
        if (!refreshTokenValue) {
          // 没有 refresh_token，跳转到登录页
          errorHandler.handleAuthError('401')
          isRefreshing = false
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
          isRefreshing = false
          return Promise.reject(err)
        }

        // 存储新的 token
        const { access_token, refresh_token } = response.data
        localStorage.setItem('access_token', access_token)
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token)
        }

        // 通知所有等待的请求
        onTokenRefreshed(access_token)

        // 更新当前请求的 token 并重试
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${access_token}`
        }

        isRefreshing = false
        return apiAxios(originalRequest)
      } catch (refreshError) {
        // 刷新失败
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        errorHandler.handleAuthError('401')
        isRefreshing = false
        return Promise.reject(refreshError)
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
