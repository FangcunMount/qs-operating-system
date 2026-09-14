import { act, fireEvent, render, screen } from '@testing-library/react'
import type { EvaluationRelease, NativeCandidateIndex, NativeEvaluationState, NativeReviewCommand } from '@/api/path/aiWorkflow'
import { NativeBatchReviewWorkspace } from './NativeBatchReviewWorkspace'
import { importBatch } from './batchReview'
import { releaseKeys } from './evaluationValidation'

const digest = 'sha256:' + 'a'.repeat(64)
const id = '44444444-4444-4444-8444-444444444444'
const release = Object.fromEntries(releaseKeys.map((key) => [key, { id: key, version: 'v2', fingerprint: digest }])) as unknown as EvaluationRelease
const run: NativeEvaluationState = {
  run_id: id, version: 8, status: 'awaiting_review', unresolved_result_unknown_count: 0,
  reviews: [], resolutions: [], review_reopenings: [],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1', run_id: id, release,
    release_fingerprint: digest, requested_by: 'user:42', request_reason: 'test', created_at: '2026-09-13T00:00:00Z' }
}
const index: NativeCandidateIndex = { run_id: id, version: 8,
  candidates: Array.from({ length: 35 }, (_, i) => ({ candidate_id: `candidate:${i + 1}`, 
    case_id: `case:${Math.floor(i / 5) + 1}`, slot_ordinal: i % 5 + 1 })) }
const command = (): NativeReviewCommand => ({ expected_version: 8, role: 'assessment_semantics',
  reviews: index.candidates.map((c, i) => ({ candidate_id: c.candidate_id, 
    decision: i === 34 ? 'reject' : 'approve', reason: `已核对候选 ${i + 1} 的事实及引用` })) })
const source = () => JSON.stringify({ run_id: id, ...command() })
const load = (raw = source()) => {
  fireEvent.change(screen.getByLabelText('批量审核计划 JSON'), { target: { value: raw } })
  fireEvent.click(screen.getByText('校验并载入审核计划'))
}
const confirm = () => fireEvent.click(screen.getByLabelText('我已逐条核对本批候选、决定及理由，确认按当前角色一次提交'))
const props = () => ({ run, index, locked: false, queued: null, onConsumed: jest.fn(), submit: jest.fn().mockResolvedValue(undefined) })

it('previews 35 individual decisions and submits one version-bound request only after confirmation', async () => {
  const p = props(); render(<NativeBatchReviewWorkspace {...p} />)
  load()
  expect(p.submit).not.toHaveBeenCalled()
  expect(screen.getByText(/已选 35 条，通过 34 条，拒绝 1 条/)).toBeInTheDocument()
  expect(screen.getByText('批量提交审核（35）').closest('button')).toBeDisabled()
  confirm()
  await act(async () => { fireEvent.click(screen.getByText('批量提交审核（35）')) })
  expect(p.submit).toHaveBeenCalledTimes(1)
  expect(p.submit).toHaveBeenCalledWith(command(), true)
  expect(screen.getByText('批量提交审核（35）').closest('button')).toBeDisabled()
})
it('invalidates confirmation when the plan changes or an entry is removed', () => {
  render(<NativeBatchReviewWorkspace {...props()} />); load(); confirm()
  fireEvent.click(screen.getAllByText('移出计划')[0])
  expect(screen.getByText('批量提交审核（34）').closest('button')).toBeDisabled()
  confirm()
  fireEvent.change(screen.getByLabelText('批量审核计划 JSON'), { target: { value: source() + ' ' } })
  expect(screen.getByText('批量提交审核（34）').closest('button')).toBeDisabled()
})
it('keeps the existing plan after an invalid import without allowing a confirmed submission', () => {
  const p = props(); render(<NativeBatchReviewWorkspace {...p} />); load(); confirm(); load('{bad json')
  expect(screen.getByText('批量提交审核（35）').closest('button')).toBeDisabled()
  expect(p.submit).not.toHaveBeenCalled()
})
it.each(['foreign_run', 'old_version', 'foreign_candidate', 'duplicate', 'empty_reason', 
  'oversized', 'unsigned', 'exception'])('rejects a malformed or unbound plan atomically: %s', (kind) => {
  const value = { run_id: id, ...command() }
  if (kind === 'foreign_run') value.run_id = 'other'
  if (kind === 'old_version') value.expected_version = 7
  if (kind === 'foreign_candidate') value.reviews[0].candidate_id = 'other'
  if (kind === 'duplicate') value.reviews[1] = value.reviews[0]
  if (kind === 'empty_reason') value.reviews[0].reason = ''
  if (kind === 'oversized') value.reviews.push(value.reviews[0])
  if (kind === 'unsigned') Object.assign(value.reviews[0], { decision: '' })
  if (kind === 'exception') Object.assign(value.reviews[0], { semantic_review: {} })
  expect(() => importBatch(JSON.stringify(value), run, index)).toThrow()
})
it('rejects already reviewed candidates, unfinished tasks and stale indexes', () => {
  const reviewed = { ...run, reviews: [{ ...command().reviews[0], 
    role: 'assessment_semantics', reviewer: 'user:42', reviewed_at: '2026-09-13T01:00:00Z' }] }
  expect(() => importBatch(source(), reviewed, index)).toThrow()
  expect(() => importBatch(source(), { ...run, status: 'collecting' }, index)).toThrow()
  expect(() => importBatch(source(), run, { ...index, version: 7 })).toThrow()
})
it('preserves bound semantic review when queued from a candidate, and prevents mixing roles', () => {
  const p = props()
  const queued = { ...command(), reviews: [{ ...command().reviews[0], semantic_review: {
    policy_version: 'semantic-contradiction-dual-review/v1' as const, execution_id: 'semantic:1', output_fingerprint: digest,
    assertion_ordinal: 1, original_detail: '原断言', candidate_excerpt: '原文片段', reason: '人工复核依据'
  } }] }
  const view = render(<NativeBatchReviewWorkspace {...p} queued={queued} />)
  expect(screen.getByText('已绑定原始证据')).toBeInTheDocument()
  expect(p.onConsumed).toHaveBeenCalledWith(null)
  view.rerender(<NativeBatchReviewWorkspace {...p} queued={{ ...queued, role: 'safety_product' }} />)
  expect(screen.getByText(/一个批次只能包含一个审核角色/)).toBeInTheDocument()
  expect(screen.getByText('批量提交审核（1）')).toBeInTheDocument()
})
it('does not resend on double clicks and locks pending-result recovery', async () => {
  let done: () => void = () => undefined
  const p = props(); p.submit.mockImplementation(() => new Promise<void>((resolve) => { done = resolve }))
  const view = render(<NativeBatchReviewWorkspace {...p} />); load(); confirm()
  fireEvent.click(screen.getByText('批量提交审核（35）'))
  fireEvent.click(screen.getByText('批量提交审核（35）'))
  expect(p.submit).toHaveBeenCalledTimes(1)
  view.rerender(<NativeBatchReviewWorkspace {...p} locked />)
  await act(async () => { done() })
  expect(screen.getByLabelText('批量审核计划 JSON')).toBeDisabled()
  expect(screen.getByText('批量提交审核（35）').closest('button')).toBeDisabled()
})
