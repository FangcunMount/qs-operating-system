import axios from 'axios'
import { message } from 'antd'
import { FcResponse } from '../types/server'
import { config } from '../config/config'
import { errorHandler } from 'fc-tools-pc/dist/bundle'

const apiAxios = axios.create({
  timeout: 50000,
  baseURL: config.host
})

apiAxios.interceptors.request.use((cfg) => {
  cfg.headers['token'] = localStorage.getItem('token') || config.token || ''
  return cfg
})
apiAxios.interceptors.response.use(
  (response) => {
    if (response.status !== 200) {
      return Promise.reject(response.data)
    }

    if (response.data.errno !== '0') {
      const authErrFlag = errorHandler.handleAuthError(response.data.errno)
      if (authErrFlag) {
        message.error(response.data.errmsg)
      }

      return Promise.reject(response.data)
    }

    return response
  },
  (err) => {
    errorHandler.handleNetworkError(err && err.response && err.response.status ? String(err.response.status) : '', message.error)
    Promise.reject(err.response)
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

// Mock 相关工具函数
export const isMockEnabled = (): boolean => {
  return process.env.REACT_APP_MOCK === 'true' || localStorage.getItem('mockEnabled') === 'true'
}

export const mockDelay = (ms = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}
