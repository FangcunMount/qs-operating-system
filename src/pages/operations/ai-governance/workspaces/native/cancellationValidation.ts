import type { NativeCancellationReceipt, NativeEvaluationState } from '@/api/path/aiWorkflow'
import { validReason } from './commands'

const sourceStatuses = ['requested', 'collecting', 'blocked', 'awaiting_review']
const identifier = (value: unknown): boolean => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(value)
export interface PendingCancellation {
  actor: string
  discard: boolean
  sourceStatus: NativeCancellationReceipt['source_status']
}
export function validPendingCancellation(value: PendingCancellation): boolean {
  return Boolean(value && /^user:[1-9][0-9]*$/.test(value.actor) &&
    sourceStatuses.includes(value.sourceStatus) && typeof value.discard === 'boolean' &&
    value.discard === (value.sourceStatus === 'awaiting_review'))
}
export function canRequestCancellation(run: NativeEvaluationState): boolean {
  return Boolean(run.creation && sourceStatuses.includes(run.status) &&
    run.unresolved_result_unknown_count === 0 && !run.cancellation && !run.cancel_request && !run.finalization)
}
export function cancellationReceipt(run: NativeEvaluationState): NativeCancellationReceipt {
  const r = run.cancellation as NativeCancellationReceipt
  if (!r || !run.creation || r.schema_version !== 'qs-ai-evaluation-cancellation/v1' ||
    r.run_id !== run.run_id || r.release_fingerprint !== run.creation.release_fingerprint ||
    !Number.isSafeInteger(r.source_version) || r.source_version < 1 ||
    !Number.isSafeInteger(r.version) || r.version !== r.source_version + 1 || r.version !== run.version ||
    r.status !== 'canceled' || run.status !== 'canceled' || run.unresolved_result_unknown_count !== 0 || run.finalization ||
    !validPendingCancellation({ actor: r.actor, discard: r.discard, sourceStatus: r.source_status }) ||
    typeof r.reason !== 'string' || !validReason(r.reason) || r.reason !== r.reason.trim() ||
    typeof r.canceled_at !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(r.canceled_at) ||
    !Number.isFinite(Date.parse(r.canceled_at)) || Date.parse(r.canceled_at) < Date.parse(run.creation.created_at) ||
    typeof r.execution_id !== 'string' || typeof r.invocation_id !== 'string' ||
    Boolean(r.execution_id) !== Boolean(r.invocation_id) ||
    (r.execution_id && (r.source_status !== 'collecting' || !identifier(r.execution_id) || !identifier(r.invocation_id))))
    throw new Error('取消回执与原任务不一致，请重新查询。')
  const at = Date.parse(r.canceled_at)
  const auditTimes = [
    ...run.reviews.map((review) => (review as { reviewed_at?: string })?.reviewed_at),
    ...run.review_reopenings.map((entry) => (entry as { reopened_at?: string })?.reopened_at)
  ]
  if (auditTimes.some((time) => typeof time !== 'string' || !Number.isFinite(Date.parse(time)) || Date.parse(time) > at))
    throw new Error('取消时间早于原审核记录。')
  return r
}
export function confirmsCancellation(
  run: NativeEvaluationState, pending: PendingCancellation, version: number
): NativeCancellationReceipt | NonNullable<NativeEvaluationState['cancel_request']> {
  if (run.cancel_request) {
    const request = cancellationRequest(run)
    if (request.source_version !== version || request.actor !== pending.actor || pending.discard)
      throw new Error('停止请求回执与原命令不一致。')
    return request
  }
  const r = cancellationReceipt(run)
  if (r.source_version !== version || r.actor !== pending.actor || r.discard !== pending.discard || r.source_status !== pending.sourceStatus)
    throw new Error('尚未取得本次取消的原始回执，请保留原任务并查询。')
  return r
}
export function sourceBeforeCancellation(run: NativeEvaluationState): NativeEvaluationState {
  if (!run.cancellation) return run
  const r = cancellationReceipt(run)
  return { ...run, version: r.source_version, status: r.source_status, cancellation: undefined }
}


export function cancellationRequest(run: NativeEvaluationState): NonNullable<NativeEvaluationState['cancel_request']> {
  const r = run.cancel_request
  if (!r || !run.creation || r.schema_version !== 'qs-ai-evaluation-cancel-request/v1' ||
    r.run_id !== run.run_id || r.status !== 'cancel_requested' ||
    !Number.isSafeInteger(r.source_version) || r.source_version < 1 ||
    r.version !== r.source_version + 1 || r.version > run.version ||
    !/^user:[1-9][0-9]*$/.test(r.actor) || !validReason(r.reason) || r.reason !== r.reason.trim() ||
    !Number.isFinite(Date.parse(r.requested_at)) || Date.parse(r.requested_at) < Date.parse(run.creation.created_at) ||
    run.cancel_draining !== (run.status !== 'canceled'))
    throw new Error('停止请求回执与原任务不一致，请重新查询。')
  return r
}
