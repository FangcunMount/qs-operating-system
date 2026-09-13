import type {
  NativeEvaluationState,
  NativeReviewRecord,
  NativeReviewReopening
} from '@/api/path/aiWorkflow'
import { validReason } from './commands'
import { safeCount } from './evaluationValidation'
import { finalizationReceipt } from './finalizationValidation'
import { reviewRecords } from './reviewValidation'

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
function retains(reviews: NativeReviewRecord[], expected: NativeReviewRecord[]): boolean {
  const actual = new Set(reviews.map(stable))
  return expected.every((r) => actual.has(stable(r)))
}
export function reopeningHistory(run: NativeEvaluationState): NativeReviewReopening[] {
  const history = run.review_reopenings as NativeReviewReopening[]
  if (!Array.isArray(history) || history.length > 3) throw new Error('复审历史不完整。')
  if (
    history.length &&
    (!['awaiting_review', 'approved', 'rejected'].includes(run.status) ||
      run.unresolved_result_unknown_count !== 0)
  )
    throw new Error('复审历史与当前任务状态不一致。')
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
          r.transition_count !== previous.transition_count + 2)) ||
      !Array.isArray(r.candidate_ids) ||
      !r.candidate_ids.length ||
      r.candidate_ids.length > 35 ||
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
    const final = finalizationReceipt({
      ...run,
      version: r.source_version,
      status: 'rejected',
      finalization: r.previous_finalization
    })
    if (
      Date.parse(r.reopened_at) < Date.parse(final.finalized_at) ||
      (previous && Date.parse(final.finalized_at) < Date.parse(previous.reopened_at))
    )
      throw new Error('复审时间早于原审核。')
    const reviews = reviewRecords(r.previous_reviews)
    if (
      reviews.length !== 70 ||
      new Set(reviews.map((review) => review.candidate_id)).size !== 35 ||
      reviews.some((review) => Date.parse(review.reviewed_at) > Date.parse(final.finalized_at)) ||
      r.candidate_ids.some((id) => !reviews.some((review) => review.candidate_id === id))
    )
      throw new Error('复审候选不属于原审核记录。')
    const next = reviewRecords(i + 1 < history.length ? history[i + 1].previous_reviews : run.reviews)
    if (
      !retains(
        next,
        reviews.filter((review) => !r.candidate_ids.includes(review.candidate_id))
      ) ||
      next.some(
        (review) =>
          r.candidate_ids.includes(review.candidate_id) &&
          Date.parse(review.reviewed_at) < Date.parse(r.reopened_at)
      )
    )
      throw new Error('复审后原签名或新签名时间不一致。')
  })
  return history
}
export function canRequestReopening(run: NativeEvaluationState): boolean {
  try {
    const history = reopeningHistory(run)
    if (
      history.length >= 3 ||
      run.status !== 'rejected' ||
      run.creation?.release.gate_policy.version !== 'v2'
    )
      return false
    const final = finalizationReceipt(run)
    const g = final.gate_result
    // Display the supported operation range; AI still rederives exact eligibility.
    return (
      g.gate_passes.G1 &&
      g.gate_passes.G2 &&
      g.gate_passes.G3 &&
      !g.gate_passes.G4 &&
      g.gate_passes.G5 &&
      g.reasons.length > 0 &&
      g.reasons.every((r) => r.gate === 'G4' && r.code === 'candidate_hard_assertion_failed')
    )
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
      !retains(reviewRecords(entry.previous_reviews), reviewRecords(previous.reviews)))
  )
    throw new Error('复审回执与原审核版本不一致。')
}
