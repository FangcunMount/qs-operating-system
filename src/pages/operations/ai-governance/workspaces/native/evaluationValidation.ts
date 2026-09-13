import type {
  EvaluationPlan,
  EvaluationPlanQuery,
  EvaluationReference,
  EvaluationRelease,
  NativeEvaluationState,
  EvaluationStatus
} from '@/api/path/aiWorkflow'
import { validReason, validUUID } from './commands'

export const releaseKeys: Array<keyof EvaluationRelease> = [
  'suite',
  'prompt',
  'profile',
  'input_schema',
  'output_schema',
  'generation_route',
  'semantic_prompt',
  'semantic_output_schema',
  'semantic_route',
  'execution_policy',
  'gate_policy'
]
export const statusLabels: Record<EvaluationStatus, string> = {
  requested: '已创建，待启动',
  collecting: '正在评测',
  blocked: '执行受阻，需核对',
  awaiting_review: '等待人工审核',
  approved: '审核通过',
  rejected: '审核未通过',
  canceled: '已取消'
}
export const fingerprint = (value: string): boolean => /^sha256:[a-f0-9]{64}$/.test(value)
export const validRef = (value?: EvaluationReference): value is EvaluationReference =>
  Boolean(
    value &&
      /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(value.id) &&
      /^[A-Za-z0-9][A-Za-z0-9._/-]{0,127}$/.test(value.version) &&
      fingerprint(value.fingerprint)
  )
export const sameRef = (a: EvaluationReference, b: EvaluationReference): boolean =>
  Boolean(a && b) && a.id === b.id && a.version === b.version && a.fingerprint === b.fingerprint
const validRelease = (value: EvaluationRelease) =>
  value && releaseKeys.every((key) => validRef(value[key]))
export const sameRelease = (a: EvaluationRelease, b: EvaluationRelease): boolean =>
  releaseKeys.every((key) => sameRef(a[key], b[key]))
export const safeCount = (value: number): boolean => Number.isSafeInteger(value) && value > 0

export function checkPlan(value: EvaluationPlan, query: EvaluationPlanQuery): void {
  if (
    !value ||
    !validRelease(value.release) ||
    !fingerprint(value.release_fingerprint) ||
    !sameRef(value.release.suite, query.suite) ||
    !sameRef(value.release.generation_route, query.generation_route) ||
    !sameRef(value.release.semantic_route, query.semantic_route) ||
    ![
      value.generation_case_count,
      value.candidates_per_case,
      value.candidate_count,
      value.preflight_case_count,
      value.max_generation_invocations,
      value.max_semantic_invocations
    ].every(safeCount) ||
    value.candidate_count / value.generation_case_count !== value.candidates_per_case ||
    typeof value.execution_policy_json !== 'string' ||
    typeof value.gate_policy_json !== 'string'
  ) {
    throw new Error('准备清单与选择的配置不一致，请重新读取。')
  }
}

export function checkEvaluation(
  value: NativeEvaluationState,
  id: string,
  expectedFingerprint?: string
): void {
  if (
    !value ||
    value.run_id !== id ||
    !validUUID(value.run_id) ||
    !safeCount(value.version) ||
    !Object.prototype.hasOwnProperty.call(statusLabels, value.status) ||
    !Number.isSafeInteger(value.unresolved_result_unknown_count) ||
    value.unresolved_result_unknown_count < 0 ||
    !Array.isArray(value.resolutions) ||
    !Array.isArray(value.reviews) ||
    !Array.isArray(value.review_reopenings) ||
    (value.can_reopen_review !== undefined && typeof value.can_reopen_review !== 'boolean')
  ) {
    throw new Error('任务状态不完整，请重新读取。')
  }
  const c = value.creation
  if (
    c &&
    (c.schema_version !== 'qs-ai-evaluation-creation-receipt/v1' ||
      c.run_id !== id ||
      !validRelease(c.release) ||
      !fingerprint(c.release_fingerprint) ||
      !validReason(c.request_reason) ||
      !/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(c.requested_by) ||
      !Number.isFinite(Date.parse(c.created_at)) ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(c.created_at))
  ) {
    throw new Error('原始创建记录不完整，请重新读取。')
  }
  if (expectedFingerprint && (!c || c.release_fingerprint !== expectedFingerprint)) {
    throw new Error('尚未取得与原请求一致的创建记录，请保留原任务标识。')
  }
}
