export interface FcResponse<T> {
  errno: string
  errmsg: string
  data: T
}

export type ApiResponse<T> = Promise<[any, FcResponse<T> | undefined]>

// 分页列表响应类型
export interface ListResponse<T> {
  list: T[]
  total: number
  page?: number
  pageSize?: number
}
