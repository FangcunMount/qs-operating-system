import { act, fireEvent, render, screen } from '@testing-library/react'
import type { EvaluationRelease, NativeCandidateEvidence, NativeEvaluationState } from '@/api/path/aiWorkflow'
import { NativeReviewWorkspace } from './NativeReviewWorkspace'
import { contradictionTargets, reviewRecords } from './reviewValidation'
import { releaseKeys } from './evaluationValidation'

const digest = 'sha256:' + 'a'.repeat(64)
const release = Object.fromEntries(releaseKeys.map((key) => [key, { id: key, version: 'v2', fingerprint: digest }])) as unknown as EvaluationRelease
const run: NativeEvaluationState = {
  run_id: '44444444-4444-4444-8444-444444444444', version: 8, status: 'awaiting_review',
  unresolved_result_unknown_count: 0, reviews: [], resolutions: [], review_reopenings: [],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1', run_id: '44444444-4444-4444-8444-444444444444',
    release, release_fingerprint: digest, requested_by: 'user:42', request_reason: 'test', created_at: '2026-09-13T00:00:00Z' }
}
const assertion = { type: 'forbidden_claims_absent', scope: 'default', ordinal: 1,
  status: 'failed', detail: '需要人工复核原文', evaluator: 'judge/v2' }
const detail = (): NativeCandidateEvidence => ({
  run_id: run.run_id, version: 8, candidate_id: 'candidate:1', normalized_output: '建议结合日常观察进一步了解。',
  semantic_output: JSON.stringify({ decisions: [assertion] }),
  evidence: { release_fingerprint: digest,
    candidate: { assertions: [assertion], semantic_assertions: [assertion] },
    semantic: { execution_id: 'semantic:1', output_fingerprint: digest, result: { evaluator_version: 'judge/v2' } } }
})
const confirm = () => {
  fireEvent.change(screen.getByLabelText('候选审核理由'), { target: { value: '已核对事实' } })
  fireEvent.click(screen.getByLabelText('我已核对当前候选及证据，确认提交审核决定'))
}
it('sends rejection under the selected review role and invalidates confirmation when edited', () => {
  const submit = jest.fn()
  render(<NativeReviewWorkspace run={run} detail={detail()} locked={false} submit={submit} />)
  fireEvent.click(screen.getByLabelText('安全与产品'))
  fireEvent.click(screen.getByLabelText('拒绝此候选'))
  confirm()
  fireEvent.change(screen.getByLabelText('候选审核理由'), { target: { value: '发现缺少事实依据' } })
  expect(screen.getByText('提交候选审核').closest('button')).toBeDisabled()
  fireEvent.click(screen.getByLabelText('我已核对当前候选及证据，确认提交审核决定'))
  fireEvent.click(screen.getByText('提交候选审核'))
  expect(submit).toHaveBeenCalledWith({ expected_version: 8, role: 'safety_product',
    reviews: [{ candidate_id: 'candidate:1', decision: 'reject', reason: '发现缺少事实依据' }] }, true)
})
it('binds semantic exception to original assertion and requires a literal candidate excerpt', async () => {
  const submit = jest.fn()
  render(<NativeReviewWorkspace run={run} detail={detail()} locked={false} submit={submit} />)
  fireEvent.click(screen.getByLabelText('对语义裁判的禁止性断言进行证据复核'))
  await act(async () => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: '待复核断言' }))
  })
  await act(async () => { fireEvent.click(screen.getByText('1：需要人工复核原文')) })
  fireEvent.change(screen.getByLabelText('候选原文引用'), { target: { value: '不存在的片段' } })
  fireEvent.change(screen.getByLabelText('断言复核理由'), { target: { value: '原文为观察建议' } })
  confirm()
  expect(screen.getByText('提交候选审核').closest('button')).toBeDisabled()
  fireEvent.change(screen.getByLabelText('候选原文引用'), { target: { value: '建议结合日常观察' } })
  fireEvent.click(screen.getByLabelText('我已核对当前候选及证据，确认提交审核决定'))
  fireEvent.click(screen.getByText('提交候选审核'))
  expect(submit.mock.calls[0][0].reviews[0].semantic_review).toEqual({
    policy_version: 'semantic-contradiction-dual-review/v1', execution_id: 'semantic:1', output_fingerprint: digest,
    assertion_ordinal: 1, original_detail: assertion.detail, candidate_excerpt: '建议结合日常观察', reason: '原文为观察建议'
  })
})
it.each(['locked', 'approved', 'old_version', 'already_reviewed'])('prevents editing a nonreviewable candidate: %s', (kind) => {
  const current = { ...run }
  if (kind === 'approved') current.status = 'approved'
  if (kind === 'old_version') current.version = 9
  if (kind === 'already_reviewed') current.reviews = [{ candidate_id: 'candidate:1', role: 'assessment_semantics',
    reviewer: 'user:42', decision: 'approve', reason: '已核对', reviewed_at: '2026-09-13T01:00:00Z' }]
  render(<NativeReviewWorkspace run={current} detail={detail()} locked={kind === 'locked'} submit={jest.fn()} />)
  expect(screen.getByLabelText('候选审核理由')).toBeDisabled()
  expect(screen.getByText('提交候选审核').closest('button')).toBeDisabled()
})
it.each(['release', 'assertions', 'semantic_assertions', 'original', 'policy'])('does not offer unbound semantic review: %s', (kind) => {
  const value = detail()
  const evidence = value.evidence as { release_fingerprint: string; candidate: Record<string, unknown> }
  const current = { ...run, creation: run.creation && { ...run.creation, release: { ...release } } }
  if (kind === 'release') evidence.release_fingerprint = 'sha256:' + 'b'.repeat(64)
  if (kind === 'assertions' || kind === 'semantic_assertions') evidence.candidate[kind] = []
  if (kind === 'original') value.semantic_output = '{invalid'
  if (kind === 'policy' && current.creation) current.creation.release.gate_policy = { ...release.gate_policy, version: 'v1' }
  expect(contradictionTargets(value, current)).toEqual([])
})
it('rejects duplicate roles or the same actor signing both roles', () => {
  const r = { candidate_id: 'candidate:1', role: 'assessment_semantics', reviewer: 'user:42',
    decision: 'approve', reason: '核对', reviewed_at: '2026-09-13T01:00:00Z' }
  expect(() => reviewRecords([r, r])).toThrow()
  expect(() => reviewRecords([r, { ...r, role: 'safety_product' }])).toThrow()
})

it('queues an explicitly reviewed candidate without sending the single-review request', () => {
  const submit = jest.fn(); const enqueue = jest.fn()
  render(<NativeReviewWorkspace run={run} detail={detail()} locked={false} submit={submit} enqueue={enqueue} />)
  expect(screen.getByText('加入批量审核计划').closest('button')).toBeDisabled()
  confirm()
  fireEvent.click(screen.getByText('加入批量审核计划'))
  expect(enqueue).toHaveBeenCalledWith({ expected_version: 8, role: 'assessment_semantics',
    reviews: [{ candidate_id: 'candidate:1', decision: 'approve', reason: '已核对事实' }] })
  expect(submit).not.toHaveBeenCalled()
})
