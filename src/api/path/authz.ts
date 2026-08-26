import { iamV3Del, iamV3Get, iamV3Post, iamV3Put } from '../iamV3Server'
import type { IamV3Result } from '../iamV3Server'

export type AttributeValueType = 'string' | 'int64' | 'bool'
export type ConstraintOperator = 'eq'

export interface IRole {
  id: string
  name: string
  display_name: string
  description?: string
  tenant_id?: string
}

export interface ICreateRoleRequest {
  name: string
  display_name: string
  description?: string
  [key: string]: unknown
}

export interface IUpdateRoleRequest {
  display_name?: string
  description?: string
  [key: string]: unknown
}

export interface IListResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

export interface IAssignment {
  id: string
  subject_type: 'user'
  subject_id: string
  role_id: string
  granted_by: string
  tenant_id?: string
}

export interface IGrantRequest {
  subject_type: 'user'
  subject_id: string
  role_id: string
  [key: string]: unknown
}

export interface IRevokeRequest {
  subject_type: 'user'
  subject_id: string
  role_id: string
  reason?: string
  [key: string]: unknown
}

export interface IAttributeDefinition {
  key: string
  type: AttributeValueType
  allowed_string_values?: string[]
}

export interface IAttributeSchema {
  version: 1
  attributes: IAttributeDefinition[]
}

export interface IConstraintValue {
  type: AttributeValueType
  string?: string
  int64?: number
  bool?: boolean
}

export interface IConstraintPredicate {
  key: string
  operator: ConstraintOperator
  value: IConstraintValue
}

export interface IConstraintSet {
  version: 1
  all_of: IConstraintPredicate[]
}

export interface IPermissionGrant {
  id: string
  tenant_id: string
  role_id: string
  resource_id: string
  resource_pattern?: string
  action: string
  constraint_set: IConstraintSet
  grant_key: string
  granted_by: string
  active: boolean
}

export interface ICreatePermissionGrantRequest {
  role_id: string
  resource_id: string
  action: string
  constraint_set: IConstraintSet
  [key: string]: unknown
}

export interface IResource {
  id: string
  key: string
  domain: string
  app_name: string
  type: string
  actions: string[]
  attribute_schema: IAttributeSchema
  display_name: string
  description?: string
}

export interface ICreateResourceRequest {
  key: string
  domain: string
  app_name: string
  type: string
  actions: string[]
  attribute_schema: IAttributeSchema
  display_name: string
  description?: string
  [key: string]: unknown
}

export interface IUpdateResourceRequest {
  actions?: string[]
  attribute_schema?: IAttributeSchema
  display_name?: string
  description?: string
  [key: string]: unknown
}

export interface IMessage {
  message?: string
}

const emptyAttributeSchema = (): IAttributeSchema => ({ version: 1, attributes: [] })

const normalizeResource = (resource: IResource): IResource => ({
  ...resource,
  actions: resource.actions || [],
  attribute_schema: resource.attribute_schema || emptyAttributeSchema()
})

const normalizeConstraintSet = (constraintSet?: IConstraintSet): IConstraintSet => ({
  version: 1,
  all_of: constraintSet?.all_of || []
})

const normalizeGrant = (grant: IPermissionGrant): IPermissionGrant => ({
  ...grant,
  constraint_set: normalizeConstraintSet(grant.constraint_set)
})

function normalizeList<T>(
  data: T[] | undefined,
  metadata: { total?: number; offset?: number; limit?: number }
): IListResponse<T> {
  return {
    data: data || [],
    total: metadata.total ?? data?.length ?? 0,
    offset: metadata.offset ?? 0,
    limit: metadata.limit ?? data?.length ?? 0
  }
}

export const listRoles = async (
  params?: { offset?: number; limit?: number }
): Promise<[unknown, IListResponse<IRole> | undefined]> => {
  const [error, response] = await iamV3Get<IRole[]>('/authz/roles', params)
  if (error || !response) return [error, undefined]
  return [null, normalizeList(response.data, response)]
}

export const createRole = (data: ICreateRoleRequest): IamV3Result<IRole> => (
  iamV3Post<IRole>('/authz/roles', data)
)

export const getRole = (id: string): IamV3Result<IRole> => iamV3Get<IRole>(`/authz/roles/${id}`)

export const updateRole = (id: string, data: IUpdateRoleRequest): IamV3Result<IRole> => (
  iamV3Put<IRole>(`/authz/roles/${id}`, data)
)

export const deleteRole = (id: string): IamV3Result<IMessage> => (
  iamV3Del<IMessage>(`/authz/roles/${id}`)
)

export const listPermissionGrants = async (
  roleId: string
): Promise<[unknown, IPermissionGrant[] | undefined]> => {
  const [error, response] = await iamV3Get<IPermissionGrant[]>(`/authz/roles/${roleId}/grants`)
  if (error || !response) return [error, undefined]
  return [null, (response.data || []).map(normalizeGrant)]
}

export const createPermissionGrant = (
  data: ICreatePermissionGrantRequest
): IamV3Result<IPermissionGrant> => (
  iamV3Post<IPermissionGrant>('/authz/grants', data)
)

export const revokePermissionGrant = (id: string, reason?: string): IamV3Result<IMessage> => (
  iamV3Del<IMessage>(`/authz/grants/${id}`, reason ? { reason } : {})
)

export const listAssignmentsByRole = async (
  roleId: string
): Promise<[unknown, IListResponse<IAssignment> | undefined]> => {
  const [error, response] = await iamV3Get<IAssignment[]>(`/authz/roles/${roleId}/assignments`)
  if (error || !response) return [error, undefined]
  return [null, normalizeList(response.data, response)]
}

export const grantRole = (data: IGrantRequest): IamV3Result<IAssignment> => (
  iamV3Post<IAssignment>('/authz/assignments/grant', data)
)

export const revokeRole = (data: IRevokeRequest): IamV3Result<IMessage> => (
  iamV3Post<IMessage>('/authz/assignments/revoke', data)
)

export const revokeAssignmentById = (id: string): IamV3Result<IMessage> => (
  iamV3Del<IMessage>(`/authz/assignments/${id}`)
)

export const listAssignmentsBySubject = async (
  params: { subject_type: 'user'; subject_id: string }
): Promise<[unknown, IListResponse<IAssignment> | undefined]> => {
  const [error, response] = await iamV3Get<IAssignment[]>('/authz/assignments/subject', params)
  if (error || !response) return [error, undefined]
  return [null, normalizeList(response.data, response)]
}

export const listResources = async (
  params?: { app_name?: string; domain?: string; type?: string; offset?: number; limit?: number }
): Promise<[unknown, IListResponse<IResource> | undefined]> => {
  const [error, response] = await iamV3Get<IResource[]>('/authz/resources', params)
  if (error || !response) return [error, undefined]
  const resources = (response.data || []).map(normalizeResource)
  return [null, normalizeList(resources, response)]
}

export const createResource = (data: ICreateResourceRequest): IamV3Result<IResource> => (
  iamV3Post<IResource>('/authz/resources', data)
)

export const getResource = (id: string): IamV3Result<IResource> => (
  iamV3Get<IResource>(`/authz/resources/${id}`)
)

export const getResourceByKey = (key: string): IamV3Result<IResource> => (
  iamV3Get<IResource>(`/authz/resources/key/${encodeURIComponent(key)}`)
)

export const updateResource = (id: string, data: IUpdateResourceRequest): IamV3Result<IResource> => (
  iamV3Put<IResource>(`/authz/resources/${id}`, data)
)

export const deleteResource = (id: string): IamV3Result<IMessage> => (
  iamV3Del<IMessage>(`/authz/resources/${id}`)
)

export const validateResourceAction = (
  data: { resource_key: string; action: string }
): IamV3Result<{ valid: boolean }> => (
  iamV3Post<{ valid: boolean }>('/authz/resources/validate-action', data)
)

export const authzApi = {
  listRoles,
  createRole,
  getRole,
  updateRole,
  deleteRole,
  listPermissionGrants,
  createPermissionGrant,
  revokePermissionGrant,
  listAssignmentsByRole,
  grantRole,
  revokeRole,
  revokeAssignmentById,
  listAssignmentsBySubject,
  listResources,
  createResource,
  getResource,
  getResourceByKey,
  updateResource,
  deleteResource,
  validateResourceAction
}

export const authApi = authzApi
