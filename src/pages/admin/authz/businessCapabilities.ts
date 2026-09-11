import { ACTION_LABELS, matrixCell, cellSignature, matrixRows } from './permissionMatrixModel'
import type { MatrixCell, MatrixData, MatrixRow } from './permissionMatrixModel'

export interface Capability { id: string; label: string; group: string; resource: string; actions: string[] }
const assessments = 'qs:evaluation:collection:assessments'
// Presentation mappings checked against qs-server application/authz/permission.go,
// evaluation/operator and interpretation/administration query entry points.
// No role membership or grant facts are defined here.
export const BUSINESS_CAPABILITIES: Capability[] = [
  { id: 'progress', label: '查看测评进度', group: '测评过程', resource: assessments, actions: ['list_progress', 'read_progress'] },
  { id: 'execute', label: '批量执行测评', group: '测评过程', resource: assessments, actions: ['batch_evaluate'] },
  { id: 'retry', label: '重试测评', group: '测评过程', resource: assessments, actions: ['retry'] },
  { id: 'results', label: '查看完整测评与评分', group: '专业结果', resource: assessments, actions: ['list', 'read'] },
  { id: 'answers', label: '查看答卷', group: '专业结果', resource: 'qs:answersheet:collection:answersheets', actions: ['list', 'read'] },
  { id: 'reports', label: '查看专业报告', group: '专业结果', resource: 'qs:evaluation:collection:reports', actions: ['list', 'read'] }
]
export function capabilities(data: MatrixData): Capability[] {
  const mapped = new Set(BUSINESS_CAPABILITIES.flatMap(item => item.actions.map(action => `${item.resource}/${action}`)))
  return [...BUSINESS_CAPABILITIES, ...matrixRows(data.resources).filter(row => !mapped.has(`${row.resource.key}/${row.action}`))
    .map(row => ({ id: row.key, label: `${row.resource.display_name} · ${ACTION_LABELS[row.action] || row.action}`,
      group: `${row.resource.app_name} · 其他目录能力`, resource: row.resource.key, actions: [row.action] }))]
}
export type CapabilityState = 'complete' | 'partial' | 'stale' | 'none' | 'unknown'
export const CAPABILITY_META: Record<CapabilityState, { label: string; color?: string }> = {
  complete: { label: '完整配置', color: 'green' }, partial: { label: '部分配置', color: 'gold' },
  stale: { label: '权限数据待刷新', color: 'orange' }, none: { label: '未配置' }, unknown: { label: '目录待核对', color: 'default' }
}
export interface CapabilityResult {
  state: CapabilityState
  items: Array<{ action: string; row: MatrixRow | undefined; cell: MatrixCell | undefined }>
  signature: string
}
export function capabilityResult(capability: Capability, data: MatrixData, roleIds: string[]): CapabilityResult {
  const resource = data.resources.find(item => item.key === capability.resource)
  const items = capability.actions.map(action => {
    const row: MatrixRow | undefined = resource?.actions.includes(action) ? { key: `${resource.id}/${action}`, resource, action } : undefined
    return { action, row, cell: row ? matrixCell(row, data.grants, roleIds, data.resources) : undefined }
  })
  const configured = items.filter(item => item.cell && item.cell.state !== 'none').length
  let state: CapabilityState = 'none'
  if (items.some(item => !item.row)) state = 'unknown'
  else if (configured === 0) state = 'none'
  else if (configured < items.length) state = 'partial'
  else if (items.some(item => item.cell?.state === 'stale')) state = 'stale'
  else state = 'complete'
  const signature = items.map(item => {
    if (!item.cell) return 'unknown'
    return item.cell.state === 'direct' || item.cell.state === 'wildcard' ? 'complete' : cellSignature(item.cell)
  }).join('|')
  return { state, items, signature }
}
export function conditionSummary(cell: MatrixCell): string { return cell.state === 'stale' ? '权限数据待刷新' : '' }
