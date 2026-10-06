import type { NativeEvaluationState, NativeReviewCorrectionCommand, NativeReviewCorrectionReceipt } from '@/api/path/aiWorkflow'
import { validReason, validUUID } from './commands'
import { fingerprint, safeCount } from './evaluationValidation'
import { reviewRecords } from './reviewValidation'

export function checkCorrection(value: NativeReviewCorrectionCommand): void {
  if (!value || !validUUID(value.command_id) || !safeCount(value.expected_version) ||
    !/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(value.candidate_id) ||
    !['assessment_semantics', 'safety_product'].includes(value.role) ||
    !fingerprint(value.previous_review_fingerprint) || !fingerprint(value.candidate_output_fingerprint) ||
    !['approve', 'reject'].includes(value.decision) || !validReason(value.reason) || value.confirm !== true)
    throw new Error('Invalid review correction')
}

export function confirmsCorrection(run: NativeEvaluationState, command: NativeReviewCorrectionCommand, owner: string): boolean {
  checkCorrection(command)
  if (run.version < command.expected_version + 1) return false
  const archived = (run.review_reopenings || []).flatMap((raw) => {
    const round = raw as { previous_review_corrections?: NativeReviewCorrectionReceipt[] }
    return round?.previous_review_corrections || []
  })
  const matches = [...(run.review_corrections || []), ...archived].filter((r) => r.command_id === command.command_id)
  if (matches.length !== 1) return false
  const entry = matches[0]
  const before = reviewRecords([entry.previous_review])[0]
  const after = reviewRecords([entry.review])[0]
  return entry.source_version === command.expected_version && entry.version === command.expected_version + 1 &&
    entry.previous_review_fingerprint === command.previous_review_fingerprint &&
    entry.candidate_output_fingerprint === command.candidate_output_fingerprint &&
    before.candidate_id === command.candidate_id && after.candidate_id === command.candidate_id &&
    before.role === command.role && after.role === command.role &&
    before.reviewer === `user:${owner}` && after.reviewer === before.reviewer &&
    !before.semantic_review && !after.semantic_review &&
    after.decision === command.decision && after.reason === command.reason &&
    Date.parse(after.reviewed_at) >= Date.parse(before.reviewed_at)
}

// An explicit, complete read can settle a losing CAS. Legacy reads without the
// correction audit cannot prove absence and must keep the original command.
export function excludesCorrection(run: NativeEvaluationState, command: NativeReviewCorrectionCommand): boolean {
  if (run.version <= command.expected_version || !Array.isArray(run.review_corrections) ||
    !Array.isArray(run.review_reopenings)) return false
  const records: unknown[] = [...run.review_corrections]
  for (const raw of run.review_reopenings) {
    if (!raw || typeof raw !== 'object') return false
    const round = raw as { previous_review_corrections?: unknown }
    if (round.previous_review_corrections !== undefined) {
      if (!Array.isArray(round.previous_review_corrections)) return false
      records.push(...round.previous_review_corrections)
    }
  }
  return records.every((raw) => {
    if (!raw || typeof raw !== 'object') return false
    const entry = raw as { command_id?: unknown }
    return typeof entry.command_id === 'string' && validUUID(entry.command_id) && entry.command_id !== command.command_id
  })
}
