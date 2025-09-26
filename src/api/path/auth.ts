import { ApiResponse } from '@/types/server'
import { get } from '../server'

export function getToken<T = { token: string }>(
  code: string
): ApiResponse<T> {
  return get<T>('/api/auth/gettoken', { code })
}

export const authApi = {
  getToken
}
