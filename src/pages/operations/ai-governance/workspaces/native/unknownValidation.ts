import type { NativeEvaluationState, NativeResolutionDecision, NativeUnknownIndex } from '@/api/path/aiWorkflow'
import { safeCount } from './evaluationValidation'
import { validReason } from './commands'

export interface PendingResolution {
  executionID: string
  decision: NativeResolutionDecision
  actor: string
}
const identity = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(v)
const timestamp = (v: unknown): v is string => typeof v === 'string' && /(Z|[+-]\d{2}:\d{2})$/.test(v) && Number.isFinite(Date.parse(v))
export const validPendingResolution = (v: PendingResolution): boolean => Boolean(v && identity(v.executionID) &&
  ['cancel_run', 'authorize_replacement'].includes(v.decision) && /^user:[1-9][0-9]*$/.test(v.actor))

export function checkUnknownIndex(value: NativeUnknownIndex, run: NativeEvaluationState): void {
  if (!value || !run.creation || value.run_id !== run.run_id || value.version !== run.version ||
    value.release_fingerprint !== run.creation.release_fingerprint || value.status !== run.status ||
    value.unresolved_result_unknown_count !== run.unresolved_result_unknown_count ||
    !Array.isArray(value.executions) || value.executions.length > 140 || value.executions.length !== value.unresolved_result_unknown_count ||
    typeof value.can_resolve !== 'boolean' || (value.can_resolve && (run.status !== 'blocked' || !value.executions.length)))
    throw new Error('调用明细与当前任务不一致，请重新查询任务。')
  const executions = new Set<string>(), invocations = new Set<string>()
  for (const item of value.executions) {
    if (!item || !identity(item.execution_id) || !identity(item.invocation_id) || !identity(item.case_id) ||
      executions.has(item.execution_id) || invocations.has(item.invocation_id) ||
      !['generation', 'semantic'].includes(item.kind) ||
      (item.kind === 'semantic' ? !identity(item.candidate_id) : item.candidate_id !== '') ||
      !safeCount(item.slot_ordinal) || !safeCount(item.execution_ordinal) ||
      !timestamp(item.started_at) || !timestamp(item.finished_at) || Date.parse(item.finished_at) < Date.parse(item.started_at) ||
      !Number.isSafeInteger(item.provider_call_count) || item.provider_call_count < 0 ||
      typeof item.failure_stage !== 'string' || typeof item.failure_code !== 'string' ||
      !/^[a-z][a-z0-9_-]{0,127}$/.test(item.failure_code) ||
      ![item.target_execution_count, item.target_execution_limit, item.stage_execution_count, item.stage_execution_limit].every(safeCount) ||
      item.target_execution_count > item.target_execution_limit || item.stage_execution_count > item.stage_execution_limit ||
      typeof item.replacement_allowed !== 'boolean' || (item.replacement_allowed && !value.can_resolve))
      throw new Error('调用证据不完整，请重新查询任务。')
    executions.add(item.execution_id)
    invocations.add(item.invocation_id)
  }
}

export function confirmsResolution(value: NativeEvaluationState, pending: PendingResolution, sourceVersion: number, reason?: string): void {
  const matches = value.resolutions.filter((raw) => Boolean(raw && typeof raw === 'object' &&
    (raw as { execution_id?: unknown }).execution_id === pending.executionID))
  const receipt = matches[0] as { decision?: unknown;
     actor?: unknown;
     reason?: unknown;
     resolved_at?: unknown;
     acknowledged_duplicate_call_and_cost_risk?: unknown } | undefined
  if (value.version <= sourceVersion || matches.length !== 1 || !receipt || receipt.decision !== pending.decision ||
    receipt.actor !== pending.actor || receipt.acknowledged_duplicate_call_and_cost_risk !== true ||
    typeof receipt.reason !== 'string' || !validReason(receipt.reason) || !timestamp(receipt.resolved_at) ||
    (reason !== undefined && receipt.reason !== reason) || (pending.decision === 'cancel_run' && value.status !== 'canceled'))
    throw new Error('尚未取得与原调用及操作人一致的处置记录，请保留原任务。')
}
