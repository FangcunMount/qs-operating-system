import { get, post } from '../ossServer'
import { ApiResponse } from '@/types/server'

interface IBaseSaveUploadFileProps {
  name: string
  pathname: string
  scene_type: string
  remark?: string
}

interface ISaveUploadFileProps extends IBaseSaveUploadFileProps {
  type: 'video' | 'picture' | 'file'
}

export interface IOSSSignature {
  accessid: string
  callback: string
  dir: string
  expire: string
  host: string
  policy: string
  signature: string
}

export function getOSSSignature<T = IOSSSignature>(dirName: string): ApiResponse<T> {
  const params = { dir: dirName }
  return get<T>('/oss/getSignature', params)
}

export function saveUploadFile<T = { id: string; url: string }>(data: ISaveUploadFileProps): ApiResponse<T> {
  return post<T>('/oss/uploadafterjson', { ...data })
}

export function saveUploadVideoFile<T = { id: string; url: string }>(data: IBaseSaveUploadFileProps): ApiResponse<T> {
  return saveUploadFile<T>({ type: 'video', ...data })
}

export function saveUploadImageFile<T = { id: string; url: string }>(data: IBaseSaveUploadFileProps): ApiResponse<T> {
  return saveUploadFile<T>({ type: 'picture', ...data })
}

export function saveUploadAnyFile<T = { id: string; url: string }>(data: IBaseSaveUploadFileProps): ApiResponse<T> {
  return saveUploadFile<T>({ type: 'file', ...data })
}

export const OSSApi = {
  getOSSSignature,
  saveUploadFile,
  saveUploadVideoFile,
  saveUploadImageFile,
  saveUploadAnyFile
}
