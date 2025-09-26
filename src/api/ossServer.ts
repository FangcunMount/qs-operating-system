import axios from 'axios'
import { message } from 'antd'
import { FcResponse } from '../types/server'
import { config } from '@/config/config'
import { errorHandler } from 'fc-tools-pc/dist/bundle'

const ossAxios = axios.create({
  timeout: 50000,
  baseURL: config.ossHost
})

ossAxios.interceptors.request.use((cfg) => {
  cfg.headers['Content-Type'] = 'application/x-www-form-urlencoded'
  return cfg
})

ossAxios.interceptors.response.use(
  (response) => {
    if (response.status !== 200) {
      return Promise.reject(response.data)
    }

    return response
  },
  (err) => {
    console.log('ossServer fail', err)
    errorHandler.handleNetworkError(err && err.response && err.response.status ? String(err.response.status) : '', message.error)
    Promise.reject(err.response)
  }
)

interface IAnyObj {
  [index: string]: unknown
}

export const get = <T>(url: string, params: IAnyObj = {}): Promise<[any, FcResponse<T> | undefined]> =>
  new Promise((resolve) => {
    ossAxios
      .get(url, { params })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })

export const post = <T>(url: string, data: IAnyObj, params: IAnyObj = {}): Promise<[any, FcResponse<T> | undefined]> => {
  return new Promise((resolve) => {
    ossAxios
      .post(url, data, { params })
      .then((result) => {
        resolve([null, result.data as FcResponse<T>])
      })
      .catch((err) => {
        resolve([err, undefined])
      })
  })
}
