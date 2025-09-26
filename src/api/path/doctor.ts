import { ApiResponse } from '@/types/server'
import { get } from '../server'

export function getDoctorSimpleList<T = { list: { id: string; name: string }[] }>(): ApiResponse<T> {
  return get<T>('/api/doctor/simplelist')
}

export const doctorApi = {
  getDoctorSimpleList
}
