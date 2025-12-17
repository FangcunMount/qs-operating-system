export interface QSResponse<T = any> {
  code: number
  data: T
  message: string
}

export interface PageQuery {
  page?: number
  page_size?: number
}

export type Id = number | string
