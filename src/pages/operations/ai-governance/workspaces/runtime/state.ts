import type { RuntimeRequest } from '@/api/path/aiWorkflow/runtime'
export const statusNames: Record<string, string> = {
  pending: 'QS 已接单',
  queued: '等待执行',
  running: '生成中',
  awaiting_answer: '等待补充',
  blocked: '执行受阻',
  cancelled: '已取消',
  completed: '成果已生成'
}
export const formatTime = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleString('zh-CN') : '未记录'
export function stage(row: RuntimeRequest): string {
  if (!row.session_id) return 'QS 已接单，等待 AI 接收'
  if (!row.ai) return 'AI 状态暂未确认'
  return statusNames[row.ai.status] || '未知执行状态'
}
export function active(row: RuntimeRequest): boolean {
  if (row.commands_pending > 0 || !row.session_id) return true
  if (!row.ai) return !['completed', 'cancelled', 'blocked'].includes(row.status)
  return ['queued', 'running', 'awaiting_answer'].includes(row.ai.status) || row.ai.version > row.version
}
export const failureNames: Record<string, string> = {
  provider_result_unknown: '模型调用结果未知。不得自动再次调用；先核对原调用记录。',
  result_unknown: '模型调用结果未知。不得自动再次调用；先核对原调用记录。',
  access_revoked: '授权已撤销，禁止继续执行。',
  source_changed: '标准报告已经变化，需要核对报告版本。',
  budget_exhausted: '生成预算不足，需先核对额度。'
}
export function readError(error: unknown): string {
  const e = error as { status?: number; response?: { status?: number } } | null
  const status = e?.status || e?.response?.status
  if (status === 403 || status === 401) return '当前权限或登录状态已失效，已清除本页数据。'
  if (status === 404 || status === 501)
    return '记录不存在、不可访问或运行中心服务尚未升级，请核对部署与编号。'
  return '暂时无法读取运行记录，请重试。不能据此判断任务未执行。'
}
