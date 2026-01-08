import { get } from '../server'
import type { FcResponse } from '../../types/server'

export interface IChildSuggestItem {
  id: number | string
  name: string
  mobile?: string
  weight?: number
}

export const identityApi = {
  // IAM 儿童档案联想搜索
  suggestChild: (keyword: string): Promise<[any, FcResponse<IChildSuggestItem[]> | undefined]> => {
    return get<IChildSuggestItem[]>('/suggest/child', { k: keyword })
  }
}
