import { authzApi } from '@/api/path/authz'
import type { IListResponse, IPermissionGrant, IResource, IRole } from '@/api/path/authz'

export interface MatrixData { roles: IRole[]; resources: IResource[]; grants: IPermissionGrant[]; loadedAt: Date }
export interface MatrixRow { key: string; resource: IResource; action: string }
export type CellState = 'none' | 'stale' | 'direct' | 'wildcard'
export interface MatrixCell { state: CellState; grants: IPermissionGrant[] }

// Never present a truncated or inconsistent catalog as complete.
export async function readAll<T extends { id: string }>(
  fetchPage: (params: { offset: number; limit: number }) => Promise<[unknown, IListResponse<T> | undefined]>
): Promise<T[]> {
  const result: T[] = []
  const seen = new Set<string>()
  let total: number | undefined
  for (;;) {
    const [error, page] = await fetchPage({ offset: result.length, limit: 100 })
    if (error || !page) throw new Error('无法读取完整授权配置，请确认访问权限后重试。')
    if (total !== undefined && page.total !== total) throw new Error('读取期间目录发生变化，请刷新后重试。')
    total = page.total
    for (const item of page.data) {
      if (seen.has(item.id)) throw new Error('目录分页重复，请刷新后重试。')
      seen.add(item.id)
      result.push(item)
    }
    if (result.length === total) return result
    if (!page.data.length || result.length > total) throw new Error('目录数据不完整，请刷新后重试。')
  }
}

export async function loadMatrixData(): Promise<MatrixData> {
  const [roles, resources] = await Promise.all([readAll(authzApi.listRoles), readAll(authzApi.listResources)])
  const grants: IPermissionGrant[] = []
  // Bound fan-out and fail the whole view if any role cannot be read.
  for (let start = 0; start < roles.length; start += 4) {
    const batches = await Promise.all(roles.slice(start, start + 4).map(async role => {
      const [error, rows] = await authzApi.listPermissionGrants(role.id)
      if (error || !rows) throw new Error(`无法读取「${role.display_name}」的授权，请确认权限后重试。`)
      if (rows.some(grant => grant.role_id !== role.id)) throw new Error('授权归属不一致，请刷新后重试。')
      return rows.filter(grant => grant.active)
    }))
    batches.forEach(rows => grants.push(...rows))
  }
  return { roles, resources, grants, loadedAt: new Date() }
}

export const ACTION_LABELS: Record<string, string> = {
  read: '查看详情', list: '查看列表', create: '创建', update: '编辑', delete: '删除',
  read_progress: '查看进度详情', list_progress: '查看进度列表', batch_evaluate: '批量执行',
  retry: '重试', force_retry: '强制重试', statistics: '查看统计', analyze: '分析', audit: '审核', publish: '发布'
}
export const CELL_META: Record<CellState, { label: string; color?: string }> = {
  none: { label: '未配置' }, stale: { label: '权限数据待刷新', color: 'orange' },
  direct: { label: '直接授权', color: 'green' }, wildcard: { label: '通配覆盖', color: 'blue' }
}
export function matrixRows(resources: IResource[]): MatrixRow[] {
  return resources.flatMap(resource => Array.from(new Set(resource.actions)).map(action => ({ key: `${resource.id}/${action}`, resource, action })))
}
// Same four-segment whole-segment wildcard semantics as IAM Resource.Key.Covers.
export function coversResource(pattern: string, target: string): boolean {
  const parts = pattern.split(':')
  const candidate = target.split(':')
  return parts.length === 4 && candidate.length === 4
    && parts.every((part, index) => Boolean(part) && (part === '*' || part === candidate[index]))
}
export function grantResourceKey(grant: IPermissionGrant, resources: IResource[]): string {
  return grant.resource_pattern || resources.find(resource => resource.id === grant.resource_id)?.key || ''
}
export function matrixCell(row: MatrixRow, grants: IPermissionGrant[], roleIds: string[], resources: IResource[]): MatrixCell {
  const matches = grants.filter(grant => grant.active && roleIds.includes(grant.role_id)
    && (grant.action === '*' || grant.action === row.action)
    && coversResource(grantResourceKey(grant, resources), row.resource.key))
  if (!matches.length) return { state: 'none', grants: [] }
  const unconditional = matches.filter(grant => grant.constraint_set.all_of.length === 0)
  if (!unconditional.length) return { state: 'stale', grants: matches }
  const direct = unconditional.some(grant => grant.action === row.action && grantResourceKey(grant, resources) === row.resource.key)
  return { state: direct ? 'direct' : 'wildcard', grants: matches }
}
export function cellSignature(cell: MatrixCell): string {
  if (cell.state !== 'stale') return cell.state
  return JSON.stringify(Array.from(new Set(cell.grants.map(grant => JSON.stringify(
    grant.constraint_set.all_of.map(predicate => JSON.stringify(predicate)).sort()
  )))).sort())
}
