import type { NativeEvaluationState, NativeFinalization, NativeGateID, NativeGatePreview, NativeGateResult } from '@/api/path/aiWorkflow'
import { validReason } from './commands'
export const gateIDs: NativeGateID[] = ['G1', 'G2', 'G3', 'G4', 'G5']
const awareTime = (v: unknown) => typeof v === 'string' && /(Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v))
export function checkGateResult(value: NativeGateResult): void {
  if (!value || !awareTime(value.evaluated_at) || !value.gate_passes ||
    Object.keys(value.gate_passes).length !== 5 || gateIDs.some((g) => typeof value.gate_passes[g] !== 'boolean') ||
    !Array.isArray(value.metrics) || !Array.isArray(value.reasons) || !Array.isArray(value.semantic_adjudications) ||
    value.metrics.some((m) => !m || typeof m.name !== 'string' || !m.name ||
      ![m.numerator, m.denominator].every((n) => Number.isSafeInteger(n) && n >= 0) ||
      typeof m.value !== 'number' || !Number.isFinite(m.value) ||
      !(m.threshold === null && m.name.startsWith('observed_')) &&
        !(typeof m.threshold === 'number' && Number.isFinite(m.threshold))) ||
    value.reasons.some((r) => !r || !gateIDs.includes(r.gate) || typeof r.code !== 'string' || !r.code ||
      !Array.isArray(r.evidence_refs) || r.evidence_refs.some((ref) => typeof ref !== 'string' || !ref)))
    throw new Error('门槛结果不完整，请重新读取。')
}
export function checkGatePreview(value: NativeGatePreview, run: NativeEvaluationState): void {
  if (!value || !run.creation || value.run_id !== run.run_id || value.version !== run.version ||
    value.release_fingerprint !== run.creation.release_fingerprint ||
    value.gate_result?.schema_version !== 'qs-ai-evaluation-gate-preview/v1')
    throw new Error('门槛结果与当前任务版本不一致，请重新查询任务。')
  checkGateResult(value.gate_result)
}
export const gatePassed = (value: NativeGateResult): boolean => gateIDs.every((g) => value.gate_passes[g])
export const reviewIncomplete = (value: NativeGateResult): boolean => value.reasons.some((r) =>
  ['human_review_incomplete', 'human_review_count_incomplete'].includes(r.code))
export function finalizationReceipt(run: NativeEvaluationState): NativeFinalization {
  const value = run.finalization as NativeFinalization | undefined
  if (!value || !run.creation || value.schema_version !== 'qs-ai-evaluation-finalization/v1' ||
    value.run_id !== run.run_id || value.version !== run.version || value.source_version !== run.version - 1 ||
    value.source_version < 1 || value.release_fingerprint !== run.creation.release_fingerprint ||
    !['approved', 'rejected'].includes(value.status) || value.status !== run.status ||
    typeof value.passed !== 'boolean' || value.passed !== (run.status === 'approved') ||
    !/^user:[1-9][0-9]*$/.test(value.actor) || typeof value.reason !== 'string' || !validReason(value.reason) ||
    !awareTime(value.finalized_at) || value.finalized_at !== value.gate_result?.evaluated_at ||
    run.unresolved_result_unknown_count !== 0)
    throw new Error('最终审核回执不完整或版本不一致，请重新查询任务。')
  checkGateResult(value.gate_result)
  if (gatePassed(value.gate_result) !== value.passed || reviewIncomplete(value.gate_result))
    throw new Error('最终审核回执与门槛结果不一致。')
  return value
}
