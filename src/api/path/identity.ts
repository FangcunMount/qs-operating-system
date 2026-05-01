import { get } from '../server'
import type { FcResponse } from '../../types/server'

export interface IProfileSuggestItem {
  id: number | string
  name: string
  mobile?: string
  weight?: number
}

export type IChildSuggestItem = IProfileSuggestItem

export const suggestProfile = async (keyword: string): Promise<[any, FcResponse<IProfileSuggestItem[]> | undefined]> => {
  const [error, response] = await get<IProfileSuggestItem[]>('/suggest/profile', { k: keyword })
  if (error || !response) {
    return [error, undefined]
  }

  const payload = response as any
  const items = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.data)
      ? payload.data
      : []

  return [null, { code: 0, message: 'success', data: items }]
}

export const identityApi = {
  suggestProfile,
  // 兼容旧调用名，实际请求 IAM v2 /suggest/profile。
  suggestChild: suggestProfile
}
