import type { NativeCandidateIndex, NativeEvaluationState, NativeReviewCommand } from '@/api/path/aiWorkflow'
import { checkReviewCommand, reviewRecords } from './reviewValidation'

export function validateBatch(run: NativeEvaluationState, index: NativeCandidateIndex, command: NativeReviewCommand): void {
  checkReviewCommand(command)
  if (!run.creation || run.status !== 'awaiting_review' || index.run_id !== run.run_id ||
    index.version !== run.version || command.expected_version !== run.version) throw new Error('任务版本已变化，请重新读取候选并整理审核计划。')
  const candidates = new Set(index.candidates.map((c) => c.candidate_id))
  const recorded = reviewRecords(run.reviews)
  if (command.reviews.some((r) => !candidates.has(r.candidate_id) ||
    recorded.some((v) => v.candidate_id === r.candidate_id && v.role === command.role)))
    throw new Error('计划包含不属于当前任务的候选，或该角色已经审核过的候选。')
}

export function importBatch(raw: string, run: NativeEvaluationState, index: NativeCandidateIndex): NativeReviewCommand {
  if (raw.length > 128000) throw new Error('审核计划过大，单批最多 35 条。')
  const value = JSON.parse(raw)
  if (!value || value.run_id !== run.run_id || !Array.isArray(value.reviews) ||
    Object.keys(value).some((k) => !['run_id', 'expected_version', 'role', 'reviews'].includes(k)) ||
    value.reviews.some((r: unknown) => !r || typeof r !== 'object' ||
      Object.keys(r || {}).some((k) => !['candidate_id', 'decision', 'reason'].includes(k))))
    throw new Error('请使用当前任务的审核计划格式。裁判矛盾复核请从候选详情加入。')
  const command: NativeReviewCommand = { expected_version: value.expected_version, role: value.role, reviews: value.reviews }
  validateBatch(run, index, command)
  return command
}
