import { get, post, put, del } from '../qsServer'

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// 员工接口请求参数
export interface ICreateStaffRequest {
  name: string
  org_id?: number
  roles: string[]
  user_id?: string
  email?: string
  phone?: string
  password?: string
  is_active?: boolean
  [key: string]: any
}

export interface IUpdateStaffRequest {
  name?: string
  roles?: string[]
  email?: string
  phone?: string
  is_active?: boolean
  [key: string]: any
}

export interface IListStaffRequest {
  org_id?: number
  role?: string
  page?: number
  page_size?: number
  [key: string]: any
}

// 员工接口响应数据
export interface IStaff {
  id: string
  name: string
  org_id: string
  user_id: string
  roles: string[]
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IStaffListResponse {
  items: IStaff[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

// 员工API
export const staffApi = {
  // 查询员工列表
  listStaff: (params: IListStaffRequest) => {
    return get<IStaffListResponse>('/staff', params)
  },

  // 创建员工
  createStaff: (data: ICreateStaffRequest) => {
    return post<IStaff>('/staff', data)
  },

  // 获取员工详情
  getStaff: (id: string) => {
    return get<IStaff>(`/staff/${id}`)
  },

  // 删除员工
  deleteStaff: (id: string) => {
    return del(`/staff/${id}`)
  },

  // 更新员工
  updateStaff: (id: string, data: IUpdateStaffRequest) => {
    return put<IStaff>(`/staff/${id}`, data)
  }
}
