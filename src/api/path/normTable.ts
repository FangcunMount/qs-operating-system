import { get, post } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface NormTableSummary {
  table_version: string
  form_variant?: string
  kind: string
  algorithm: string
  factor_count: number
}

export interface NormBand {
  min_age_months?: number
  max_age_months?: number
  gender?: string
  mean: number
  std_dev: number
}

export interface NormLookupEntry {
  raw_score_min: number
  raw_score_max: number
  min_age_months?: number
  max_age_months?: number
  gender?: string
  t_score: number
  percentile: number
  standard_score?: number
}

export interface NormFactorTable {
  factor_code: string
  bands?: NormBand[]
  lookup?: NormLookupEntry[]
}

export interface NormTableDetail extends NormTableSummary {
  factors: NormFactorTable[]
}

export interface ImportNormTablePayload {
  table_version: string
  form_variant: string
  kind: string
  algorithm: string
  factors: NormFactorTable[]
}

export interface NormTableListResult {
  items: NormTableSummary[]
  total: number
  page: number
  page_size: number
}

export interface NormTableListParams {
  kind?: string
  algorithm?: string
  form_variant?: string
}

/** The client passes authoritative, versioned norm data through without
 * manufacturing or normalizing norm values in the browser. */
export const importNormTable = (payload: ImportNormTablePayload): Promise<[any, QSResponse<NormTableDetail> | undefined]> =>
  post<NormTableDetail>('/norm-tables', payload)

export const listNormTables = (
  params: NormTableListParams
): Promise<[any, QSResponse<NormTableListResult> | undefined]> =>
  get<NormTableListResult>('/norm-tables', params)

export const getNormTable = (tableVersion: string): Promise<[any, QSResponse<NormTableDetail> | undefined]> =>
  get<NormTableDetail>(`/norm-tables/${encodeURIComponent(tableVersion)}`)

export const normTableApi = { importNormTable, listNormTables, getNormTable }
