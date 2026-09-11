import { get, post, put } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface TesteeOwnership {
  id: string
  store_id: string | null
  store_version: number
}
export interface OwnershipChange {
  store_id: string
  expected_version: number
  reason: string
  request_id: string
}
export interface OwnershipHistory {
  id: string
  from_store_id: string | null
  to_store_id: string
  kind: string
  actor_id: string
  created_at: string
  reason: string
  version: number
}
export const testeeStoreApi = {
  get: (id: string): Promise<[any, QSResponse<TesteeOwnership> | undefined]> => get<TesteeOwnership>(`/testees/${id}`),
  assign: (id: string, change: OwnershipChange): Promise<[any, QSResponse<OwnershipHistory> | undefined]> =>
    put<OwnershipHistory>(`/testees/${id}/store`, change),
  transfer: (id: string, change: OwnershipChange): Promise<[any, QSResponse<OwnershipHistory> | undefined]> =>
    post<OwnershipHistory>(`/testees/${id}/store-transfers`, change),
  history: (id: string, before?: string): Promise<[any, QSResponse<OwnershipHistory[]> | undefined]> =>
    get<OwnershipHistory[]>(`/testees/${id}/store-history`, { before, limit: 20 })
}
