import { get, post } from '../server'
import { FcResponse } from '../../types/server'

// ==================== 类型定义 ====================

// 角色
export interface IRole {
  id: number
  name: string
  display_name: string
  description?: string
  tenant_id?: string
  createdAt: string
}

export interface ICreateRoleRequest {
  name: string
  display_name: string
  description?: string
  [key: string]: any
}

export interface IUpdateRoleRequest {
  display_name?: string
  description?: string
  [key: string]: any
}

// 角色列表响应
export interface IRoleListResponse {
  data: IRole[]
  total: number
  limit: number
  offset?: number
}

// 分页结果（其他接口使用）
export interface IPageResult<T> {
  total: number
  limit: number
  offset: number
  data: T[]
}

// 角色分配
export interface IAssignment {
  id: number
  subject_type: 'user' | 'group'
  subject_id: string
  role_id: number
  granted_by: string
  tenant_id?: string
}

export interface IGrantRequest {
  subject_type: 'user' | 'group'
  subject_id: string
  role_id: number
  granted_by: string
  [key: string]: any
}

export interface IRevokeRequest {
  subject_type: 'user' | 'group'
  subject_id: string
  role_id: number
  [key: string]: any
}

// 策略规则
export interface IPolicyRule {
  role_id: number
  resource_id: number
  action: string
}

export interface IAddPolicyRequest {
  role_id: number
  resource_id: number
  action: string
  changed_by: string
  reason?: string
  [key: string]: any
}

export interface IRemovePolicyRequest {
  role_id: number
  resource_id: number
  action: string
  changed_by: string
  reason?: string
  [key: string]: any
}

// 资源
export interface IResource {
  id: number
  key: string
  domain: string
  app_name: string
  type: string
  actions: string[]
  createdAt: string
  display_name: string
  description?: string
}

export interface ICreateResourceRequest {
  key: string
  domain: string
  app_name: string
  type: string
  actions: string[]
  display_name: string
  description?: string
  [key: string]: any
}

export interface IUpdateResourceRequest {
  actions?: string[]
  display_name?: string
  description?: string
  [key: string]: any
}

// 消息响应
export interface IMessage {
  message: string
}

// ==================== API 方法 ====================

// ===== 角色管理 =====

/**
 * 列出角色
 */
export const listRoles = async (
  params?: { offset?: number; limit?: number }
): Promise<[any, IRoleListResponse | undefined]> => {
  const [error, response] = await get<IRole[]>('/authz/roles', params)
  if (error || !response) {
    return [error, undefined]
  }
  // 将响应转换为期望的格式
  return [null, response as any as IRoleListResponse]
}

/**
 * 创建角色
 */
export const createRole = async (data: ICreateRoleRequest): Promise<[any, FcResponse<IRole> | undefined]> => {
  return post<IRole>('/authz/roles', data)
}

/**
 * 获取角色详情
 */
export const getRole = async (id: number): Promise<[any, FcResponse<IRole> | undefined]> => {
  return get<IRole>(`/authz/roles/${id}`)
}

/**
 * 更新角色
 */
export const updateRole = async (id: number, data: IUpdateRoleRequest): Promise<[any, FcResponse<IRole> | undefined]> => {
  return post<IRole>(`/authz/roles/${id}`, data)
}

/**
 * 删除角色
 */
export const deleteRole = async (id: number): Promise<[any, FcResponse<IMessage> | undefined]> => {
  const response = await fetch(`/authz/roles/${id}`, { method: 'DELETE' })
  const data = await response.json()
  return [response.ok ? null : data, response.ok ? data : undefined]
}

/**
 * 获取角色的策略列表
 */
export const getPoliciesByRole = async (roleId: number): Promise<[any, FcResponse<{ items: IPolicyRule[] }> | undefined]> => {
  return get<{ items: IPolicyRule[] }>(`/authz/roles/${roleId}/policies`)
}

/**
 * 列出角色的分配记录
 */
export const listAssignmentsByRole = async (
  roleId: number,
  params?: { offset?: number; limit?: number }
): Promise<[any, FcResponse<IPageResult<IAssignment>> | undefined]> => {
  return get<IPageResult<IAssignment>>(`/authz/roles/${roleId}/assignments`, params)
}

// ===== 角色分配管理 =====

/**
 * 授予角色
 */
export const grantRole = async (data: IGrantRequest): Promise<[any, FcResponse<IAssignment> | undefined]> => {
  return post<IAssignment>('/authz/assignments/grant', data)
}

/**
 * 撤销角色
 */
export const revokeRole = async (data: IRevokeRequest): Promise<[any, FcResponse<IMessage> | undefined]> => {
  return post<IMessage>('/authz/assignments/revoke', data)
}

/**
 * 根据分配ID撤销角色
 */
export const revokeAssignmentById = async (id: number): Promise<[any, FcResponse<IMessage> | undefined]> => {
  const response = await fetch(`/authz/assignments/${id}`, { method: 'DELETE' })
  const data = await response.json()
  return [response.ok ? null : data, response.ok ? data : undefined]
}

/**
 * 列出主体的角色分配
 */
export const listAssignmentsBySubject = async (
  params: { subject_type: string; subject_id: string; offset?: number; limit?: number }
): Promise<[any, FcResponse<IPageResult<IAssignment>> | undefined]> => {
  return get<IPageResult<IAssignment>>('/authz/assignments/subject', params)
}

// ===== 策略管理 =====

/**
 * 添加策略规则
 */
export const addPolicyRule = async (data: IAddPolicyRequest): Promise<[any, FcResponse<IMessage> | undefined]> => {
  return post<IMessage>('/authz/policies', data)
}

/**
 * 移除策略规则
 */
export const removePolicyRule = async (data: IRemovePolicyRequest): Promise<[any, FcResponse<IMessage> | undefined]> => {
  const response = await fetch('/authz/policies', { 
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  const responseData = await response.json()
  return [response.ok ? null : responseData, response.ok ? responseData : undefined]
}

/**
 * 获取当前策略版本
 */
export const getPolicyVersion = async (): Promise<[any, FcResponse<{ version: string }> | undefined]> => {
  return get<{ version: string }>('/authz/policies/version')
}

// ===== 资源管理 =====

/**
 * 列出资源
 */
export const listResources = async (
  params?: { app_name?: string; domain?: string; type?: string; offset?: number; limit?: number }
): Promise<[any, FcResponse<IPageResult<IResource>> | undefined]> => {
  return get<IPageResult<IResource>>('/authz/resources', params)
}

/**
 * 创建资源
 */
export const createResource = async (data: ICreateResourceRequest): Promise<[any, FcResponse<IResource> | undefined]> => {
  return post<IResource>('/authz/resources', data)
}

/**
 * 获取资源详情
 */
export const getResource = async (id: number): Promise<[any, FcResponse<IResource> | undefined]> => {
  return get<IResource>(`/authz/resources/${id}`)
}

/**
 * 根据键获取资源
 */
export const getResourceByKey = async (key: string): Promise<[any, FcResponse<IResource> | undefined]> => {
  return get<IResource>(`/authz/resources/key/${encodeURIComponent(key)}`)
}

/**
 * 更新资源
 */
export const updateResource = async (id: number, data: IUpdateResourceRequest): Promise<[any, FcResponse<IResource> | undefined]> => {
  return post<IResource>(`/authz/resources/${id}`, data)
}

/**
 * 删除资源
 */
export const deleteResource = async (id: number): Promise<[any, FcResponse<IMessage> | undefined]> => {
  const response = await fetch(`/authz/resources/${id}`, { method: 'DELETE' })
  const data = await response.json()
  return [response.ok ? null : data, response.ok ? data : undefined]
}

/**
 * 验证资源动作
 */
export const validateResourceAction = async (
  data: { resource_key: string; action: string }
): Promise<[any, FcResponse<{ valid: boolean }> | undefined]> => {
  return post<{ valid: boolean }>('/authz/resources/validate-action', data)
}

// 导出所有 API
export const authzApi = {
  // 角色
  listRoles,
  createRole,
  getRole,
  updateRole,
  deleteRole,
  getPoliciesByRole,
  listAssignmentsByRole,
  // 分配
  grantRole,
  revokeRole,
  revokeAssignmentById,
  listAssignmentsBySubject,
  // 策略
  addPolicyRule,
  removePolicyRule,
  getPolicyVersion,
  // 资源
  listResources,
  createResource,
  getResource,
  getResourceByKey,
  updateResource,
  deleteResource,
  validateResourceAction
}

// 为了兼容旧代码，保留 authApi 别名
export const authApi = authzApi

