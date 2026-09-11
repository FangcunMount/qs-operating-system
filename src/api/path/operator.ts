import { get, post, put, qsDeleteWithBody, silentGet } from '../qsServer'

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

// 运营人员接口请求参数
export interface ICreateOperatorRequest {
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

export interface IUpdateOperatorRequest {
  name?: string
  roles?: string[]
  email?: string
  phone?: string
  is_active?: boolean
  [key: string]: any
}

export interface IListOperatorRequest {
  org_id?: number
  role?: string
  page?: number
  page_size?: number
  [key: string]: any
}

// 运营人员接口响应数据
export interface IOperator {
  version: number
  id: string
  name: string
  org_id: string
  user_id: string
  roles: string[]
  effective_roles: string[]
  inherited_roles: string[]
  authz_policy_version: number
  authz_projection_pending: boolean
  email?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IOperatorListResponse {
  items: IOperator[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

// 运营人员API
export const operatorApi = {
  // 查询运营人员列表
  listOperator: (params: IListOperatorRequest) => {
    return get<IOperatorListResponse>('/operators', params)
  },

  // 创建运营人员
  createOperator: (data: ICreateOperatorRequest) => {
    return post<IOperator>('/operators', data)
  },

  // 获取运营人员详情
  getOperator: (id: string) => {
    return get<IOperator>(`/operators/${id}`)
  },

  retire: (id: string, data: IRetireOperatorRequest) => qsDeleteWithBody<IOperatorRetirement>(`/operators/${id}`, data),
  retirement: (id: string) => silentGet<IOperatorRetirement>(`/operators/${id}/retirement`),

  // 更新运营人员
  updateOperator: (id: string, data: IUpdateOperatorRequest) => {
    return put<IOperator>(`/operators/${id}`, data)
  }
}

export interface IRetireOperatorRequest { expected_version: number; request_id: string; reason: string }
export interface IOperatorRetirement extends IRetireOperatorRequest {
  operator_id: string
  stage: 'disabled' | 'revoked' | 'completed'
  policy_version: number
  needs_attention: boolean
}
