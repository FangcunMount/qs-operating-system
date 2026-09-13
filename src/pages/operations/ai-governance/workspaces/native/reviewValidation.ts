import type {
  NativeCandidateEvidence, NativeEvaluationState, NativeReviewCommand,
  NativeReviewRecord, NativeSemanticReview
} from '@/api/path/aiWorkflow'
import { validReason } from './commands'
import { fingerprint, safeCount } from './evaluationValidation'

const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const validID = (value: unknown) =>
  typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(value)
const text = (value: unknown, limit = 1000) => {
  try {
    return typeof value === 'string' && Boolean(value.trim()) && !/[<>]/.test(value) && !value.includes('\u0000') &&
      unescape(encodeURIComponent(value)).length <= limit
  } catch { return false }
}
export const validSemanticReview = (value: NativeSemanticReview): boolean =>
  value.policy_version === 'semantic-contradiction-dual-review/v1' &&
  validID(value.execution_id) && fingerprint(value.output_fingerprint) &&
  safeCount(value.assertion_ordinal) && text(value.original_detail, 2000) &&
  text(value.candidate_excerpt) && validReason(value.reason)

export function checkReviewCommand(value: NativeReviewCommand): void {
  if (!safeCount(value.expected_version) ||
    !['assessment_semantics', 'safety_product'].includes(value.role) ||
    !Array.isArray(value.reviews) || !value.reviews.length || value.reviews.length > 35 ||
    new Set(value.reviews.map((r) => r.candidate_id)).size !== value.reviews.length ||
    value.reviews.some((r) => !validID(r.candidate_id) || !['approve', 'reject'].includes(r.decision) ||
      !validReason(r.reason) || (r.semantic_review &&
        (r.decision !== 'approve' || !validSemanticReview(r.semantic_review)))))
    throw new Error('Invalid review')
}
export function reviewRecords(values: unknown[]): NativeReviewRecord[] {
  if (!Array.isArray(values) || values.length > 70) throw new Error('Invalid review history')
  const roles = new Set<string>()
  const actors = new Set<string>()
  return values.map((raw) => {
    const r = object(raw) as unknown as NativeReviewRecord
    checkReviewCommand({ expected_version: 1, role: r.role, reviews: [r] })
    if (!validID(r.reviewer) || typeof r.reviewed_at !== 'string' ||
      !/(Z|[+-]\d\d:\d\d)$/.test(r.reviewed_at) || !Number.isFinite(Date.parse(r.reviewed_at)))
      throw new Error('Invalid reviewer audit')
    const roleKey = `${r.candidate_id}:${r.role}`
    const actorKey = `${r.candidate_id}:${r.reviewer}`
    if (roles.has(roleKey) || actors.has(actorKey)) throw new Error('Duplicate review identity')
    roles.add(roleKey)
    actors.add(actorKey)
    return r
  })
}
export function confirmsReview(values: unknown[], command: NativeReviewCommand): boolean {
  const records = reviewRecords(values)
  return command.reviews.every((item) => records.filter((r) =>
    r.candidate_id === item.candidate_id && r.role === command.role &&
    r.decision === item.decision && r.reason === item.reason &&
    ((!r.semantic_review && !item.semantic_review) || (r.semantic_review && item.semantic_review &&
      Object.entries(item.semantic_review).every(([key, value]) =>
        object(r.semantic_review)[key] === value)))
  ).length === 1)
}
export interface ContradictionTarget {
  executionID: string
  outputFingerprint: string
  ordinal: number
  detail: string
}
export function contradictionTargets(detail: NativeCandidateEvidence, run: NativeEvaluationState): ContradictionTarget[] {
  if (detail.run_id !== run.run_id || detail.version !== run.version ||
    run.creation?.release.gate_policy.version !== 'v2') return []
  const evidence = object(detail.evidence)
  const semantic = object(evidence.semantic)
  const candidate = object(evidence.candidate)
  const result = object(semantic.result)
  const assertions = candidate.assertions
  const semanticAssertions = candidate.semantic_assertions
  if (evidence.release_fingerprint !== run.creation.release_fingerprint ||
    !validID(semantic.execution_id) || (typeof semantic.output_fingerprint !== 'string' || !fingerprint(semantic.output_fingerprint)) ||
    typeof result.evaluator_version !== 'string' || !Array.isArray(assertions) ||
    !Array.isArray(semanticAssertions)) return []
  let decisions: unknown
  try { decisions = object(JSON.parse(detail.semantic_output)).decisions } catch { return [] }
  if (!Array.isArray(decisions)) return []
  return decisions.filter((raw) => {
    const d = object(raw)
    const matches = (a: unknown) => {
      const v = object(a)
      return v.type === d.type && v.scope === d.scope && v.ordinal === d.ordinal &&
        v.status === d.status && v.detail === d.detail && v.evaluator === result.evaluator_version
    }
    return d.type === 'forbidden_claims_absent' && d.scope === 'default' &&
      d.status === 'failed' && safeCount(d.ordinal as number) && text(d.detail, 2000) &&
      assertions.filter(matches).length === 1 && semanticAssertions.filter(matches).length === 1 &&
      (decisions as unknown[]).filter((other) => object(other).ordinal === d.ordinal &&
        object(other).type === d.type && object(other).scope === d.scope).length === 1
  }).map((raw) => {
    const d = object(raw)
    return { executionID: semantic.execution_id as string, outputFingerprint: semantic.output_fingerprint as string,
      ordinal: d.ordinal as number, detail: d.detail as string }
  })
}
