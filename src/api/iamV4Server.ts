import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import { message } from 'antd'
import { errorHandler } from 'fc-tools-pc/dist/bundle'
import { config } from '../config/config'
import { handle401Error } from './tokenRefresh'
import { getStoredAccessToken } from '@/utils/jwtClaims'

export interface IamV4Response<T> {
  code: number
  message: string
  data?: T
  total?: number
  offset?: number
  limit?: number
}

interface RequestData {
  [key: string]: unknown
}

const replaceApiVersion = (value: string, version: string) => {
  const normalized = value.replace(/\/+$/, '')
  if (/\/api\/v\d+$/.test(normalized)) {
    return normalized.replace(/\/api\/v\d+$/, `/api/${version}`)
  }
  return `${normalized}/api/${version}`
}

export const resolveIamV4BaseURL = (): string => {
  if (process.env.NODE_ENV === 'development') return ''
  const host = process.env.REACT_APP_IAM_HOST || config.iamHost || `https://iam.${config.domain}`
  return replaceApiVersion(host, 'v4')
}

const iamV4Axios = axios.create({
  timeout: 50000,
  baseURL: resolveIamV4BaseURL()
})

iamV4Axios.interceptors.request.use((request) => {
  const accessToken = getStoredAccessToken()
  if (accessToken) {
    request.headers = request.headers || {}
    request.headers.Authorization = `Bearer ${accessToken}`
  }
  return request
})

iamV4Axios.interceptors.response.use(
  (response) => {
    const payload = response.data as IamV4Response<unknown> | undefined
    if (payload && typeof payload.code === 'number' && payload.code !== 0 && payload.code !== 200) {
      errorHandler.handleAuthError(String(payload.code))
      return Promise.reject(payload)
    }
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && originalRequest) {
      try {
        return await handle401Error(error, originalRequest, request => iamV4Axios(request))
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }
    const status = error.response?.status ? String(error.response.status) : ''
    errorHandler.handleNetworkError(status, message.error)
    return Promise.reject(error.response || error)
  }
)

export type IamV4Result<T> = Promise<[unknown, IamV4Response<T> | undefined]>

export const iamV4Get = <T>(url: string, params: RequestData = {}): IamV4Result<T> => (
  iamV4Axios.get(url, { params })
    .then(result => [null, result.data as IamV4Response<T>] as [unknown, IamV4Response<T>])
    .catch(error => [error, undefined] as [unknown, undefined])
)

export const iamV4Post = <T>(url: string, data: RequestData): IamV4Result<T> => (
  iamV4Axios.post(url, data)
    .then(result => [null, result.data as IamV4Response<T>] as [unknown, IamV4Response<T>])
    .catch(error => [error, undefined] as [unknown, undefined])
)

export const iamV4Put = <T>(url: string, data: RequestData): IamV4Result<T> => (
  iamV4Axios.put(url, data)
    .then(result => [null, result.data as IamV4Response<T>] as [unknown, IamV4Response<T>])
    .catch(error => [error, undefined] as [unknown, undefined])
)

export const iamV4Del = <T>(url: string, data: RequestData = {}): IamV4Result<T> => (
  iamV4Axios.delete(url, { data })
    .then(result => [null, result.data as IamV4Response<T>] as [unknown, IamV4Response<T>])
    .catch(error => [error, undefined] as [unknown, undefined])
)
