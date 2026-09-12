import type { QSResponse } from '@/types/qs'
import { get, put } from '../qsServer'

export interface OperatorScope {
  org_id: string
  kind: 'stores' | 'all_stores'
  store_ids: string[]
}
export interface OperatorScopeAssignment {
  assignment_id: string
  role_id: string
  role_name: string
  management_protection: string
  scope: OperatorScope | null
}
export interface OperatorScopeConfiguration {
  operator_id: string
  policy_version: string
  assignments: OperatorScopeAssignment[]
  unconfigured_assignments: OperatorScopeAssignment[]
  protected_access: boolean
}
export interface OperatorScopeUpdate {
  expected_policy_version: string
  roles: Array<{ role_name: string; kind: 'stores' | 'all_stores'; store_ids: string[] }>
  reason: string
}
type UpdateResponse = { policy_version: string; projection_pending: boolean }

export const operatorScopeApi = {
  get: (id: string): Promise<[unknown, QSResponse<OperatorScopeConfiguration> | undefined]> =>
    get<OperatorScopeConfiguration>(`/operators/${id}/authorization-scope`),
  replace: (id: string, data: OperatorScopeUpdate): Promise<[unknown, QSResponse<UpdateResponse> | undefined]> =>
    put<{ policy_version: string; projection_pending: boolean }>(`/operators/${id}/authorization-scope`, data)
}
