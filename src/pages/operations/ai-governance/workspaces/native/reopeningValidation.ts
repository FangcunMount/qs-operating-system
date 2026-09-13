import type {
  NativeEvaluationState,
  NativeReviewReopening
} from '@/api/path/aiWorkflow'
import { validReason } from './commands'
import { sourceBeforeCancellation } from './cancellationValidation'
import { safeCount } from './evaluationValidation'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}
function retains(reviews: unknown[], expected: unknown[]): boolean {
  const actual = new Set(reviews.map(stable))
  return expected.every((r) => actual.has(stable(r)))
}
export function reopeningHistory(current: NativeEvaluationState): NativeReviewReopening[] {
  const run = sourceBeforeCancellation(current)
  const history = run.review_reopenings as NativeReviewReopening[]
  if (!Array.isArray(history) || JSON.stringify(history).length > 2 * 1024 * 1024)
    throw new Error('复审历史不完整。')
  history.forEach((r, i) => {
    const previous = history[i - 1]
    if (
      !run.creation ||
      !r ||
      !safeCount(r.source_version) ||
      r.version !== r.source_version + 1 ||
      r.version > run.version ||
      !safeCount(r.transition_count) ||
      (previous &&
        (r.source_version <= previous.version ||
          r.transition_count <= previous.transition_count)) ||
      !Array.isArray(r.candidate_ids) ||
      !Array.isArray(r.previous_reviews) ||
      new Set(r.candidate_ids).size !== r.candidate_ids.length ||
      r.candidate_ids.some(
        (id) => typeof id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(id)
      ) ||
      !/^user:[1-9][0-9]*$/.test(r.actor) ||
      typeof r.reason !== 'string' ||
      !validReason(r.reason) ||
      typeof r.reopened_at !== 'string' ||
      !/(Z|[+-]\d\d:\d\d)$/.test(r.reopened_at) ||
      !Number.isFinite(Date.parse(r.reopened_at))
    )
      throw new Error('复审历史版本或审计不一致。')
    // AI validates review signatures, candidate eligibility and gate policy.
    // The UI only binds the displayed archive to this Run, release and version.
    const final = r.previous_finalization
    if (!final || final.schema_version !== 'qs-ai-evaluation-finalization/v1' ||
      final.run_id !== run.run_id || final.version !== r.source_version ||
      !safeCount(final.source_version) || final.source_version + 1 !== final.version ||
      final.release_fingerprint !== run.creation.release_fingerprint ||
      typeof final.finalized_at !== 'string' ||
      !/(Z|[+-]\d\d:\d\d)$/.test(final.finalized_at) ||
      !Number.isFinite(Date.parse(final.finalized_at)))
      throw new Error('复审历史版本或审计不一致。')
    if (Date.parse(r.reopened_at) < Date.parse(final.finalized_at) ||
      (previous && Date.parse(final.finalized_at) < Date.parse(previous.reopened_at)))
      throw new Error('复审时间早于原审核。')
  })
  return history
}
export function canRequestReopening(run: NativeEvaluationState): boolean {
  try {
    reopeningHistory(run)
    return run.can_reopen_review === true
  } catch {
    return false
  }
}
export function confirmsReopening(
  run: NativeEvaluationState,
  sourceVersion: number,
  previous?: NativeEvaluationState,
  reason?: string
): void {
  const history = reopeningHistory(run)
  const entry = history.find((r) => r.source_version === sourceVersion)
  if (!entry || (reason !== undefined && entry.reason !== reason))
    throw new Error('尚未取得原版本的复审记录。')
  if (
    previous &&
    (run.status !== 'awaiting_review' ||
      run.version !== previous.version + 1 ||
      run.finalization ||
      stable(entry.previous_finalization) !== stable(previous.finalization) ||
      history.length !== previous.review_reopenings.length + 1 ||
      stable(history.slice(0, -1)) !== stable(previous.review_reopenings) ||
      entry.previous_reviews.length !== previous.reviews.length ||
      !retains(entry.previous_reviews, previous.reviews))
  )
    throw new Error('复审回执与原审核版本不一致。')
}
