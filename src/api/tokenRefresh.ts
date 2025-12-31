import { AxiosError, AxiosRequestConfig } from 'axios'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { refreshToken } from './path/auth'

/**
 * Token 刷新状态管理
 */
class TokenRefreshManager {
  private isRefreshing = false
  private refreshSubscribers: Array<(token: string) => void> = []

  /**
   * 订阅 token 刷新事件
   */
  subscribe(cb: (token: string) => void): void {
    this.refreshSubscribers.push(cb)
  }

  /**
   * 通知所有订阅者 token 已刷新
   */
  notify(token: string): void {
    this.refreshSubscribers.forEach(cb => cb(token))
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

/**
 * 刷新 token
 */
async function refreshAccessToken(): Promise<string | null> {
  const refreshTokenValue = localStorage.getItem('refresh_token')
  
  if (!refreshTokenValue) {
    console.warn('[TokenRefresh] refresh_token 不存在')
    return null
  }

  try {
    const [error, response] = await refreshToken(refreshTokenValue)

    if (error) {
      // 检查是否是 CORS 错误
      if (error.message?.includes('CORS') || error.message?.includes('Network Error') || !error.response) {
        console.error('[TokenRefresh] CORS 错误或网络错误:', {
          message: error.message,
          code: error.code,
          isAxiosError: error.isAxiosError,
          baseURL: error.config?.baseURL,
          url: error.config?.url
        })
      } else {
        console.error('[TokenRefresh] 刷新 token 失败:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        })
      }
      return null
    }

    if (!response?.data) {
      console.warn('[TokenRefresh] 响应数据为空')
      return null
    }

    // 存储新的 token
    const { access_token, refresh_token } = response.data
    localStorage.setItem('access_token', access_token)
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token)
    }

    console.log('[TokenRefresh] Token 刷新成功')
    return access_token
  } catch (error: any) {
    console.error('[TokenRefresh] 刷新 token 异常:', {
      message: error?.message,
      stack: error?.stack,
      isAxiosError: error?.isAxiosError
    })
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
      tokenRefreshManager.subscribe((token: string) => {
        if (originalRequest.headers) {
          originalRequest.headers['Authorization'] = `Bearer ${token}`
        }
        retryRequest(originalRequest)
          .then(resolve)
          .catch(reject)
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
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      errorHandler.handleAuthError('401')
      tokenRefreshManager.setRefreshing(false)
      tokenRefreshManager.clear()
      throw err
    }

    // 通知所有等待的请求
    tokenRefreshManager.notify(newToken)

    // 更新当前请求的 token 并重试
    if (originalRequest.headers) {
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`
    }

    tokenRefreshManager.setRefreshing(false)
    return retryRequest(originalRequest)
  } catch (refreshError) {
    // 刷新失败
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    errorHandler.handleAuthError('401')
    tokenRefreshManager.setRefreshing(false)
    tokenRefreshManager.clear()
    throw refreshError
  }
}

