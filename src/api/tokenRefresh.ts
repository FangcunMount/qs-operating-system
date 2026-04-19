import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { config } from '@/config/config'
import {
  clearStoredTokens,
  getStoredRefreshToken,
  parseJwtClaims,
  persistTokenPair,
  validateJwtClaims
} from '@/utils/jwtClaims'

const isDev = process.env.NODE_ENV === 'development'
const authBaseURL = isDev
  ? ''
  : (
    process.env.REACT_APP_IAM_HOST
    || config.iamHost
    || process.env.REACT_APP_HOST
    || config.host
  )

const refreshAxios = axios.create({
  timeout: 50000,
  baseURL: authBaseURL
})

type TokenRefreshSubscriber = {
  onSuccess: (token: string) => void
  onFailure: (error: unknown) => void
}

/**
 * Token 刷新状态管理
 */
class TokenRefreshManager {
  private isRefreshing = false
  private refreshSubscribers: TokenRefreshSubscriber[] = []

  /**
   * 订阅 token 刷新事件
   */
  subscribe(subscriber: TokenRefreshSubscriber): void {
    this.refreshSubscribers.push(subscriber)
  }

  /**
   * 通知所有订阅者 token 已刷新
   */
  notify(token: string): void {
    this.refreshSubscribers.forEach(({ onSuccess }) => onSuccess(token))
    this.refreshSubscribers = []
  }

  /**
   * 通知所有订阅者 token 刷新失败
   */
  notifyFailure(error: unknown): void {
    this.refreshSubscribers.forEach(({ onFailure }) => onFailure(error))
    this.refreshSubscribers = []
  }

  /**
   * 获取当前刷新状态
   */
  getRefreshing(): boolean {
    return this.isRefreshing
  }

  /**
   * 设置刷新状态
   */
  setRefreshing(value: boolean): void {
    this.isRefreshing = value
  }

  /**
   * 清除所有订阅者
   */
  clear(): void {
    this.refreshSubscribers = []
  }
}

// 创建全局的 token 刷新管理器
export const tokenRefreshManager = new TokenRefreshManager()

const redirectToLogin = () => {
  if (typeof window !== 'undefined' && window.location.pathname !== '/user/login') {
    window.location.replace('/user/login')
  }
}

const clearAuthSession = () => {
  clearStoredTokens()
  errorHandler.handleAuthError('401')
}

/**
 * 刷新 token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshTokenValue = getStoredRefreshToken()
  
  if (!refreshTokenValue) {
    console.warn('[TokenRefresh] refresh_token 不存在')
    return null
  }

  try {
    const response = await refreshAxios.post('/authn/refresh_token', {
      refresh_token: refreshTokenValue
    })

    if (response.status !== 200) {
      console.error('[TokenRefresh] 刷新 token 失败:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      })
      return null
    }

    const data = response.data
    const isSuccess = typeof data?.code !== 'undefined' ? (data.code === 0 || data.code === 200) : data?.errno === '0'
    if (!isSuccess) {
      console.error('[TokenRefresh] 刷新 token 失败:', data)
      return null
    }

    if (!data?.data) {
      console.warn('[TokenRefresh] 响应数据为空')
      return null
    }

    const { access_token, refresh_token } = data.data
    if (!access_token) {
      console.warn('[TokenRefresh] access_token 缺失')
      return null
    }

    const claims = parseJwtClaims(access_token)
    const claimCheck = claims ? validateJwtClaims(claims) : { valid: false, reason: 'access_token 非法 JWT' }
    if (!claimCheck.valid) {
      console.error('[TokenRefresh] token claims 校验失败:', claimCheck.reason)
      return null
    }

    persistTokenPair(access_token, refresh_token)
    console.log('[TokenRefresh] Token 刷新成功')
    return access_token
  } catch (error: any) {
    if (error.message?.includes('CORS') || error.message?.includes('Network Error') || !error.response) {
      console.error('[TokenRefresh] CORS 错误或网络错误:', {
        message: error.message,
        code: error.code,
        isAxiosError: error.isAxiosError,
        baseURL: error.config?.baseURL,
        url: error.config?.url
      })
    } else {
      console.error('[TokenRefresh] 刷新 token 异常:', {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data
      })
    }
    return null
  }
}

/**
 * 处理 401 错误并自动刷新 token
 * @param err Axios 错误对象
 * @param originalRequest 原始请求配置
 * @param retryRequest 重试请求的函数
 * @returns Promise
 */
export async function handle401Error<T>(
  err: AxiosError,
  originalRequest: AxiosRequestConfig & { _retry?: boolean },
  retryRequest: (config: AxiosRequestConfig) => Promise<T>
): Promise<T> {
  // 判断是否是 401 错误且未重试过
  if (err.response?.status !== 401 || !originalRequest || originalRequest._retry) {
    throw err
  }

  // 如果已经在刷新 token，将请求加入队列
  if (tokenRefreshManager.getRefreshing()) {
    return new Promise((resolve, reject) => {
      tokenRefreshManager.subscribe({
        onSuccess: (token: string) => {
          if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
          }
          retryRequest(originalRequest)
            .then(resolve)
            .catch(reject)
        },
        onFailure: (error: unknown) => {
          reject(error)
        }
      })
    })
  }

  // 标记为已重试，开始刷新 token
  originalRequest._retry = true
  tokenRefreshManager.setRefreshing(true)

  try {
    const newToken = await refreshAccessToken()

    if (!newToken) {
      // 刷新失败，清除 token 并跳转登录
      clearAuthSession()
      tokenRefreshManager.notifyFailure(err)
      tokenRefreshManager.setRefreshing(false)
      tokenRefreshManager.clear()
      redirectToLogin()
      throw err
    }

    tokenRefreshManager.setRefreshing(false)

    // 通知所有等待的请求
    tokenRefreshManager.notify(newToken)

    // 更新当前请求的 token 并重试
    if (originalRequest.headers) {
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`
    }

    return retryRequest(originalRequest)
  } catch (refreshError) {
    // 刷新失败
    clearAuthSession()
    tokenRefreshManager.notifyFailure(refreshError)
    tokenRefreshManager.setRefreshing(false)
    tokenRefreshManager.clear()
    redirectToLogin()
    throw refreshError
  }
}
