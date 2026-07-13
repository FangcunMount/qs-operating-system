import { get, post } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface NormTableSummary {
  table_version: string
  form_variant?: string
  kind?: string
  algorithm?: string
}

export interface NormTableListParams {
  kind?: string
  algorithm?: string
  form_variant?: string
}

/** These routes are activated only after the ModelCatalog norm-table backend
 * contract has been deployed. The client intentionally passes versioned JSON
 * through without manufacturing norm values in the browser. */
export const importNormTable = (payload: unknown): Promise<[any, QSResponse<NormTableSummary> | undefined]> =>
  post<NormTableSummary>('/norm-tables', payload)

export const listNormTables = (
  params: NormTableListParams
): Promise<[any, QSResponse<{ items?: NormTableSummary[]; tables?: NormTableSummary[] }> | undefined]> =>
  get<{ items?: NormTableSummary[]; tables?: NormTableSummary[] }>('/norm-tables', params)

export const getNormTable = (tableVersion: string): Promise<[any, QSResponse<unknown> | undefined]> => get<unknown>(`/norm-tables/${tableVersion}`)

export const normTableApi = { importNormTable, listNormTables, getNormTable }
