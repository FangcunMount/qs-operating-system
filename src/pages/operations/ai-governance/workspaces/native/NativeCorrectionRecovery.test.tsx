import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import type { NativeReviewCorrectionCommand, NativeReviewRecord } from '@/api/path/aiWorkflow'
import { evaluationJournalKey, useNativeEvaluation } from './useNativeEvaluation'
import { releaseKeys } from './evaluationValidation'
jest.mock('@/api/path/aiWorkflow', () => ({ ...jest.requireActual('@/api/path/aiWorkflow'),
  getNativeEvaluation: jest.fn(), correctNativeReview: jest.fn() }))
const runID = '44444444-4444-4444-8444-444444444444'
const digest = 'sha256:' + 'a'.repeat(64)
const command: NativeReviewCorrectionCommand = { command_id: '55555555-5555-4555-8555-555555555555', expected_version: 151,
  candidate_id: 'candidate:1', role: 'safety_product', previous_review_fingerprint: digest,
  candidate_output_fingerprint: digest, decision: 'approve', reason: '正文正确，标题仅记录建议', confirm: true }
const old: NativeReviewRecord = { candidate_id: command.candidate_id, role: command.role, reviewer: 'user:10002',
  decision: 'reject', reason: '标题不明确', reviewed_at: '2026-10-06T10:00:00+00:00' }
const state = (accepted: boolean): api.NativeEvaluationState => ({
  run_id: runID, version: accepted ? 152 : 151, status: 'awaiting_review', unresolved_result_unknown_count: 0,
  resolutions: [], review_reopenings: [], reviews: [accepted ? { ...old, decision: command.decision, reason: command.reason } : old],
  creation: { schema_version: 'qs-ai-evaluation-creation-receipt/v1', run_id: runID,
    release: Object.fromEntries(releaseKeys.map((k) => [k, { id: k, version: 'v2', fingerprint: digest }])) as unknown as api.EvaluationRelease,
    release_fingerprint: digest, requested_by: 'user:10001', request_reason: 'test', created_at: '2026-10-06T09:00:00Z' },
  review_corrections: accepted ? [{ command_id: command.command_id, source_version: 151, version: 152,
    previous_review_fingerprint: digest, candidate_output_fingerprint: digest, previous_review: old,
    review: { ...old, decision: command.decision, reason: command.reason, reviewed_at: '2026-10-06T11:00:00+00:00' } }] : []
})
const ok = (data: unknown) => [null, { data }]
function Harness() {
  const c = useNativeEvaluation('10002', {})
  return <><button onClick={() => c.read(runID)}>read</button><button onClick={() => c.correctReview(command)}>correct</button>
    <button onClick={c.retryCorrection}>retry original</button><span data-testid="pending">{c.journal?.pending || 'none'}</span>
    <span data-testid="version">{c.run?.version || 0}</span><span>{c.error}</span></>
}
beforeEach(() => { sessionStorage.clear(); jest.clearAllMocks(); (api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(false))) })
it('recovers the original receipt after timeout and refresh without resending', async () => {
  (api.correctNativeReview as jest.Mock).mockResolvedValue([{ status: 503 }, undefined])
  const view = render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await waitFor(() => expect(screen.getByTestId('version')).toHaveTextContent('151'))
  fireEvent.click(screen.getByText('correct'))
  await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('correct_review'))
  const saved = JSON.parse(sessionStorage.getItem(evaluationJournalKey('10002')) || '{}')
  expect(saved.correction).toEqual(command)
  view.unmount()
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok(state(true)))
  render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('none'))
  expect(api.correctNativeReview).toHaveBeenCalledTimes(1)
  expect(screen.getByTestId('version')).toHaveTextContent('152')
})
it('explicit retry reuses the original command ID and intent', async () => {
  sessionStorage.setItem(evaluationJournalKey('10002'), JSON.stringify({ runID, releaseFingerprint: digest,
    pending: 'correct_review', expectedVersion: 151, lastVersion: 151, correction: command }))
  ;(api.correctNativeReview as jest.Mock).mockResolvedValue(ok(state(true)))
  render(<Harness />)
  fireEvent.click(screen.getByText('retry original'))
  await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('none'))
  expect(api.correctNativeReview).toHaveBeenCalledWith(runID, command)
})
it('settles a losing CAS only after an explicit complete audit read', async () => {
  sessionStorage.setItem(evaluationJournalKey('10002'), JSON.stringify({ runID, releaseFingerprint: digest,
    pending: 'correct_review', expectedVersion: 151, lastVersion: 151, correction: command }))
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok({ ...state(false), version: 152 }))
  render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('none'))
  expect(screen.getByText(/原更正命令未生效/)).toBeInTheDocument()
  expect(api.correctNativeReview).not.toHaveBeenCalled()
})
it('does not discard a pending command on a legacy read lacking correction audit', async () => {
  sessionStorage.setItem(evaluationJournalKey('10002'), JSON.stringify({ runID, releaseFingerprint: digest,
    pending: 'correct_review', expectedVersion: 151, lastVersion: 151, correction: command }))
  ;(api.getNativeEvaluation as jest.Mock).mockResolvedValue(ok({ ...state(false), version: 152, review_corrections: undefined }))
  render(<Harness />)
  fireEvent.click(screen.getByText('read'))
  await waitFor(() => expect(screen.getByText(/审核更正回执尚未确认/)).toBeInTheDocument())
  expect(screen.getByTestId('pending')).toHaveTextContent('correct_review')
  expect(api.correctNativeReview).not.toHaveBeenCalled()
})
