import * as commands from './commands'
import { fireEvent, render, screen } from '@testing-library/react'
import type { EvaluationRelease, NativeCandidateEvidence, NativeEvaluationState, NativeReviewRecord } from '@/api/path/aiWorkflow'
import { NativeReviewCorrectionWorkspace } from './NativeReviewCorrectionWorkspace'
import { confirmsCorrection } from './reviewCorrectionValidation'
import { releaseKeys } from './evaluationValidation'
beforeEach(() => jest.spyOn(commands, 'newCommandID').mockReturnValue('55555555-5555-4555-8555-555555555555'))
afterEach(() => jest.restoreAllMocks())
const digest = 'sha256:' + 'a'.repeat(64)
const original: NativeReviewRecord = { candidate_id: 'candidate:1', role: 'safety_product', reviewer: 'user:10002',
  decision: 'reject', reason: '标题不明确', reviewed_at: '2026-10-06T10:00:00+00:00' }
const release = Object.fromEntries(releaseKeys.map((k) => [k, { id: k, version: 'v2', fingerprint: digest }])) as unknown as EvaluationRelease
const run: NativeEvaluationState = {
  run_id: '44444444-4444-4444-8444-444444444444', version: 151, status: 'awaiting_review',
  unresolved_result_unknown_count: 0, reviews: [original], resolutions: [], review_reopenings: [],
  original_reviews: [original], review_corrections: [],
  review_fingerprints: [{ candidate_id: original.candidate_id, role: original.role, fingerprint: digest }],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1', run_id: '44444444-4444-4444-8444-444444444444',
    release, release_fingerprint: digest, requested_by: 'user:10001', request_reason: 'test', created_at: '2026-10-06T09:00:00Z' }
}
const detail: NativeCandidateEvidence = { run_id: run.run_id, version: run.version, candidate_id: original.candidate_id,
  normalized_output: '{}', semantic_output: '{}', evidence: { candidate: { normalized_output_fingerprint: digest } } }
it('only corrects the original reviewer decision with explicit confirmation and frozen identities', () => {
  const submit = jest.fn()
  render(<NativeReviewCorrectionWorkspace run={run} detail={detail} owner="10002" locked={false} submit={submit} />)
  fireEvent.click(screen.getByText('更正决定：安全与产品'))
  fireEvent.click(screen.getByLabelText('通过并记录意见'))
  fireEvent.change(screen.getByLabelText('审核更正理由'), { target: { value: '正文与引用一致；标题作为非阻塞建议' } })
  expect(screen.getByText('提交审核更正').closest('button')).toBeDisabled()
  fireEvent.click(screen.getByLabelText('我已重新核对原候选、冻结事实与引用，确认更正自己的决定'))
  fireEvent.click(screen.getByText('提交审核更正'))
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({ expected_version: 151, candidate_id: original.candidate_id,
    role: 'safety_product', decision: 'approve', previous_review_fingerprint: digest, candidate_output_fingerprint: digest,
    confirm: true, reason: '正文与引用一致；标题作为非阻塞建议' }))
  expect(original.decision).toBe('reject')
})
it.each(['other_actor', 'terminal', 'stale', 'old_server', 'unbound_body'])('blocks correction: %s', (kind) => {
  const current = { ...run }
  if (kind === 'terminal') current.status = 'approved'
  if (kind === 'stale') current.version++
  if (kind === 'old_server') current.review_fingerprints = undefined
  render(<NativeReviewCorrectionWorkspace run={current} detail={kind === 'unbound_body' ? { ...detail, evidence: {} } : detail}
    owner={kind === 'other_actor' ? '10001' : '10002'} locked={false} submit={jest.fn()} />)
  expect(screen.getByText('更正决定：安全与产品').closest('button')).toBeDisabled()
})
it('recovers only the exact persisted correction command, not a coincidental version increment', () => {
  const command = { command_id: '55555555-5555-4555-8555-555555555555', expected_version: 151, candidate_id: original.candidate_id,
    role: original.role, decision: 'approve' as const, reason: '非阻塞建议', previous_review_fingerprint: digest,
    candidate_output_fingerprint: digest, confirm: true as const }
  const receipt = { command_id: command.command_id, source_version: 151, version: 152, previous_review_fingerprint: digest,
    candidate_output_fingerprint: digest, previous_review: original,
    review: { ...original, decision: command.decision, reason: command.reason, reviewed_at: '2026-10-06T11:00:00+00:00' } }
  expect(confirmsCorrection({ ...run, version: 153 }, command, '10002')).toBe(false)
  const current = { ...run, version: 153, review_corrections: [receipt] }
  expect(confirmsCorrection(current, command, '10002')).toBe(true)
  expect(confirmsCorrection(current, command, '10001')).toBe(false)
  expect(confirmsCorrection(current, { ...command, reason: 'different' }, '10002')).toBe(false)
  const reopened = { ...current, review_corrections: [], review_reopenings: [{ previous_review_corrections: [receipt] }] }
  expect(confirmsCorrection(reopened, command, '10002')).toBe(true)
})
