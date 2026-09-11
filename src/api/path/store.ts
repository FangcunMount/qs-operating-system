import { get, post, put } from '../qsServer'
import type { IClinician } from './clinician'

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export interface IStore {
  id: string
  org_id: string
  code: string
  name: string
  address: string
  is_active: boolean
  version: number
  clinician_count: number
}
export interface IStoreProgress {
  total: number
  configured: number
  unconfigured: number
  active_total: number
  active_configured: number
  active_unconfigured: number
}
export interface IStoreChange {
  id: string
  from_store_id: string | null
  to_store_id: string
  kind: 'initial' | 'transfer' | 'unchanged'
  actor_id: string
  created_at: string
  reason: string
  request_id: string
  invalidated_count: number
  version: number
}
export const storeApi = {
  list: (params: { page?: number; page_size?: number; search?: string; is_active?: boolean }) =>
    get<{ items: IStore[]; total: number }>('/stores', params),
  get: (id: string) => get<IStore>(`/stores/${id}`),
  create: (data: { code: string; name: string; address?: string }) => post<IStore>('/stores', data),
  update: (id: string, data: { name: string; address?: string; expected_version: number }) => put<IStore>(`/stores/${id}`, data),
  setActive: (item: IStore, active: boolean) =>
    post<IStore>(`/stores/${item.id}/${active ? 'activate' : 'deactivate'}`, { expected_version: item.version }),
  progress: () => get<IStoreProgress>('/stores/configuration-progress'),
  assign: (id: string, data: { store_id: string; expected_version: number; reason: string; request_id: string }) =>
    put<{ clinician: IClinician; change: IStoreChange; invalidated_count: number }>(`/clinicians/${id}/store`, data),
  history: (id: string) => get<{ items: IStoreChange[] }>(`/clinicians/${id}/store-history`)
}

// Load all enabled stores for assignment; never silently truncate the selector.
export const loadStoreOptions = async (enabledOnly = true): Promise<IStore[]> => {
  const items: IStore[] = []
  for (let page = 1; ; page++) {
    const [error, response] = await storeApi.list({ page, page_size: 100, is_active: enabledOnly ? true : undefined })
    if (error || !response?.data) throw error || new Error('获取门店失败')
    items.push(...response.data.items)
    if (items.length >= response.data.total || response.data.items.length === 0) return items
  }
}

export const loadEnabledStores = (): Promise<IStore[]> => loadStoreOptions(true)
