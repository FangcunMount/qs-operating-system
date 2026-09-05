import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getAIEvaluationRunV2, listAIEvaluationRunsV2, cancelAIEvaluationRunV2, listAIEvaluationRuns } from '@/api/path/aiGovernance'
import type { AIEvaluationRunV2 } from '@/api/path/aiGovernance'
import { buildTechnicalFailureEvidence, EvaluationReleaseWorkspace } from './EvaluationReleaseWorkspace'

jest.mock('@/api/path/aiGovernance', () => ({
  cancelAIEvaluationRunV2: jest.fn(),
  listAIEvaluationRunsV2: jest.fn(),
  finalizeAIEvaluationV2: jest.fn(),
  getAIEvaluationCapacity: jest.fn(),
  getAIEvaluationOutputV2: jest.fn(),
  getAIEvaluationRunV2: jest.fn(),
  listAIEvaluationRuns: jest.fn(),
  resolveAIEvaluationResultUnknownV2: jest.fn(),
  startAIEvaluationV2: jest.fn()
}))

const success = (data: unknown) => Promise.resolve([null, { code: 0, data }])
const ref = { id: 'contract', version: 'v1', fingerprint: 'sha256:contract' }
const run: AIEvaluationRunV2 = {
  schema_version: 'prompt-evaluation-evidence/v2',
  run_id: 'v2-run-1',
  version: 1,
  status: 'blocked',
  organization_id: 12,
  requested_by: 'user:34',
  request_reason: 'verify v2',
  created_at: '2026-08-31T10:00:00Z',
  release_fingerprint: 'sha256:release',
  release: {
    fingerprint: 'sha256:release',
    suite: { ...ref, id: 'suite' },
    prompt: { ...ref, id: 'prompt' },
    profile: { ...ref, id: 'profile' },
    input_schema: { ...ref, id: 'input' },
    output_schema: { ...ref, id: 'output' },
    generation_route: { ...ref, id: 'generation-route' },
    semantic_prompt: { ...ref, id: 'semantic-prompt' },
    semantic_output_schema: { ...ref, id: 'semantic-output' },
    semantic_route: { ...ref, id: 'semantic-route' },
    execution_policy: { ...ref, id: 'execution-policy' },
    gate_policy: { ...ref, id: 'gate-policy' }
  },
  execution_policy_id: 'execution-policy',
  execution_policy_version: 'v1',
  gate_policy_id: 'gate-policy',
  gate_policy_version: 'v1',
  reserved_provider_invocations: 140,
  required_candidates: 35,
  accepted_candidates: 1,
  review_ready_candidates: 0,
  unresolved_result_unknown_count: 1,
  slots: [{
    case_id: 'PROMPT-EVAL-001',
    slot_ordinal: 1,
    status: 'blocked',
    generation_execution_ids: ['generation:1']
  }],
  generation_executions: [{
    execution_id: 'generation:1',
    kind: 'generation',
    case_id: 'PROMPT-EVAL-001',
    slot_ordinal: 1,
    execution_ordinal: 1,
    invocation_id: 'invocation:1',
    status: 'result_unknown',
    started_at: '2026-08-31T10:00:01Z',
    provider_call_count: 1,
    provider_receipt_present: false,
    raw_output_bytes: 0,
    normalized_output_bytes: 0,
    failure: {
      stage: 'provider',
      kind: 'provider_execution',
      code: 'provider_result_unknown',
      retryable: false,
      result_unknown: true,
      disposition: 'manual_resolution_required',
      safe_message: 'provider result is unknown',
      evidence_refs: ['generation:1']
    }
  }],
  semantic_executions: [],
  human_reviews: [],
  result_unknown_resolutions: []
}

describe('EvaluationReleaseWorkspace', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    jest.clearAllMocks()
    const listRunsMock = listAIEvaluationRuns as jest.Mock
    const getRunV2Mock = getAIEvaluationRunV2 as jest.Mock
    listRunsMock.mockReturnValue(success({ items: [] }))
    ;(listAIEvaluationRunsV2 as jest.Mock).mockReturnValue(success({ items: [] }))
    getRunV2Mock.mockReturnValue(success(run))
  })

  it('keeps generation and semantic failures visible', () => {
    expect(buildTechnicalFailureEvidence(run)).toEqual([
      expect.objectContaining({ execution_id: 'generation:1', status: 'result_unknown' })
    ])
  })

  it('labels the v1 catalog as history and locates v2 by exact Run ID', async () => {
    render(<EvaluationReleaseWorkspace />)

    expect(await screen.findByText('历史 v1 Run（只读）')).toBeInTheDocument()
    const input = screen.getByPlaceholderText('输入 v2 Run ID')
    fireEvent.change(input, { target: { value: 'v2-run-1' } })
    fireEvent.click(screen.getByLabelText('search').closest('button') as HTMLButtonElement)

    await waitFor(() => expect(getAIEvaluationRunV2).toHaveBeenCalledWith('v2-run-1'))
    expect(window.sessionStorage.getItem('ai-governance:v2:last-run-id')).toBe('v2-run-1')
    expect(await screen.findByText('Run 已阻塞')).toBeInTheDocument()
    expect(screen.getAllByText('provider_result_unknown').length).toBeGreaterThan(0)
    expect(screen.getByText('35 个固定 Slot')).toBeInTheDocument()
  })

  it('restores the last exact v2 Run ID after a page refresh', async () => {
    window.sessionStorage.setItem('ai-governance:v2:last-run-id', 'v2-run-1')

    render(<EvaluationReleaseWorkspace />)

    await waitFor(() => expect(getAIEvaluationRunV2).toHaveBeenCalledWith('v2-run-1'))
    expect(screen.getByPlaceholderText('输入 v2 Run ID')).toHaveValue('v2-run-1')
    expect(await screen.findByText('Run 已阻塞')).toBeInTheDocument()
  })
})

const summary = {
  run_id: '635960720508334638', version: 7, status: 'blocked', created_at: run.created_at,
  prompt_version: 'v4', profile_version: 'v4', required_candidates: 35,
  accepted_candidates: 1, review_ready_candidates: 0, review_count: 0,
  unresolved_result_unknown_count: 0, last_cause: 'generation_budget_exhausted',
  can_cancel: true, can_discard: false
}

it('lists exact Run IDs and pages through server cursors', async () => {
  window.sessionStorage.clear()
  ;(listAIEvaluationRuns as jest.Mock).mockReturnValue(success({ items: [] }))
  ;(listAIEvaluationRunsV2 as jest.Mock).mockResolvedValueOnce([null, { data: { items: [summary], next_cursor: 'page-2' } }])
    .mockResolvedValue([null, { data: { items: [], next_cursor: '' } }])
  render(<EvaluationReleaseWorkspace />)
  expect(await screen.findByRole('button', { name: summary.run_id })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '下一页' }))
  await waitFor(() => expect(listAIEvaluationRunsV2).toHaveBeenLastCalledWith({ status: undefined, cursor: 'page-2', limit: 20 }))
})

it('requires a reason and sends the freshly loaded version when canceling', async () => {
  window.sessionStorage.clear()
  jest.clearAllMocks()
  ;(listAIEvaluationRuns as jest.Mock).mockReturnValue(success({ items: [] }))
  ;(listAIEvaluationRunsV2 as jest.Mock).mockReturnValue(success({ items: [summary] }))
  const current = { ...run, run_id: summary.run_id, version: 9, can_cancel: true, unresolved_result_unknown_count: 0 }
  ;(getAIEvaluationRunV2 as jest.Mock).mockReturnValue(success(current))
  ;(cancelAIEvaluationRunV2 as jest.Mock).mockReturnValue(success({ ...current, status: 'canceled', can_cancel: false }))
  render(<EvaluationReleaseWorkspace />)
  fireEvent.click(await screen.findByRole('button', { name: '取消评测' }))
  const confirm = await screen.findByRole('button', { name: '确认结束本轮' })
  expect(confirm).toBeDisabled()
  fireEvent.change(screen.getByPlaceholderText('理由会进入不可变审计记录，请描述本次操作依据。'), { target: { value: '版本已被替代' } })
  fireEvent.click(confirm)
  await waitFor(() => expect(cancelAIEvaluationRunV2).toHaveBeenCalledWith(summary.run_id, 9, '版本已被替代', false))
  await waitFor(() => expect(listAIEvaluationRunsV2).toHaveBeenCalledTimes(2))
})
