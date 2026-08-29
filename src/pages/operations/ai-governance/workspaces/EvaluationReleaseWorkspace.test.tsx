import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  getAIEvaluationAttempt,
  getAIEvaluationRun,
  listAIEvaluationRuns
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationRun,
  AIEvaluationRunSummary,
  AIReviewAttemptSummary
} from '@/api/path/aiGovernance'
import { EvaluationReleaseWorkspace } from './EvaluationReleaseWorkspace'

jest.mock('@/api/path/aiGovernance', () => ({
  cancelAIEvaluation: jest.fn(),
  finalizeAIEvaluation: jest.fn(),
  getAIEvaluationAttempt: jest.fn(),
  getAIEvaluationCapacity: jest.fn(),
  getAIEvaluationRun: jest.fn(),
  listAIEvaluationRuns: jest.fn(),
  recoverAIEvaluation: jest.fn(),
  startAIEvaluation: jest.fn()
}))

const listRunsMock = listAIEvaluationRuns as jest.Mock
const getRunMock = getAIEvaluationRun as jest.Mock
const getAttemptMock = getAIEvaluationAttempt as jest.Mock
const success = (data: unknown) => Promise.resolve([null, { code: 0, data }])

const progress = {
  planned_generation_attempts: 35,
  generation_attempts: 1,
  failed_attempts: 0,
  pending_generation_attempts: 34,
  required_reviews: 70,
  recorded_reviews: 0,
  missing_reviews: 70,
  fully_reviewed_attempts: 0,
  rejected_reviews: 0,
  all_required_reviews_recorded: false
}

const collectingRun: AIEvaluationRunSummary = {
  run_id: 'run-live',
  version: 1,
  status: 'collecting',
  requested_org_id: 10001,
  requested_by: 'user:10001',
  request_reason: 'production evaluation',
  created_at: '2026-08-28T10:00:00Z',
  release: {
    suite: { id: 'suite', version: 'v1', fingerprint: 'suite-fingerprint', git_blob_sha: 'suite-sha' },
    prompt: { template_id: 'prompt', version: 'v1', fingerprint: 'prompt-fingerprint', git_blob_sha: 'prompt-sha' },
    profile: { id: 'profile', version: 'v1', fingerprint: 'profile-fingerprint' },
    input_schema: { version: 'input/v1', fingerprint: 'input-fingerprint' },
    output_schema: { version: 'output/v1', fingerprint: 'output-fingerprint' },
    provider: {
      route: 'generation',
      route_revision: 'v2',
      resolved_provider: 'deepseek',
      resolved_model: 'deepseek-v4-flash',
      fingerprint: 'generation-provider-fingerprint'
    },
    decoding: { max_output_tokens: 12000, reasoning_effort: 'low' },
    semantic_evaluator: {
      version: 'v1',
      prompt: { template_id: 'judge', version: 'v1', fingerprint: 'judge-fingerprint', git_blob_sha: 'judge-sha' },
      output_schema: { version: 'judge-output/v1', fingerprint: 'judge-output-fingerprint' },
      provider: {
        route: 'judge',
        route_revision: 'v2',
        resolved_provider: 'deepseek',
        resolved_model: 'deepseek-v4-pro',
        fingerprint: 'judge-provider-fingerprint'
      },
      decoding: { max_output_tokens: 8000, reasoning_effort: 'low' }
    },
    generation_case_ids: ['PROMPT-EVAL-001'],
    preflight_case_id: 'PROMPT-EVAL-001',
    preflight_rejection_reason: '',
    repetitions_per_case: 5
  },
  progress,
  can_review: false,
  can_finalize: false,
  can_cancel: true,
  recovery_max_provider_invocations: 0
}

const collectingDetail: AIEvaluationRun = {
  ...collectingRun,
  execution: {
    case_id: 'PROMPT-EVAL-001',
    attempt: 1,
    phase: 'dispatching',
    claimed_at: '2026-08-28T10:00:01Z',
    lease_expires_at: '2026-08-28T10:06:01Z'
  },
  recoveries: [],
  attempts: []
}

describe('EvaluationReleaseWorkspace', () => {
  beforeEach(() => {
    listRunsMock.mockReset()
    getRunMock.mockReset()
    getAttemptMock.mockReset()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('explains conditional semantic judging and the current serial execution phase', async () => {
    listRunsMock.mockReturnValue(success({ items: [collectingRun] }))
    getRunMock.mockReturnValue(success(collectingDetail))
    render(<EvaluationReleaseWorkspace />)

    fireEvent.click(await screen.findByText('run-live'))

    expect(await screen.findByText('35 次生成 + 最多 35 次独立模型裁判')).toBeInTheDocument()
    expect(screen.getByText('评测正在串行执行，页面每 15 秒自动刷新')).toBeInTheDocument()
    expect(screen.getByText('当前 PROMPT-EVAL-001 第 1 次：模型调用中')).toBeInTheDocument()
    expect(screen.getByText(/因此裁判次数最多为 35 次/)).toBeInTheDocument()
    expect(screen.getByText('思考强度 low · 最大输出 12000 tokens')).toBeInTheDocument()
    expect(screen.getByText('思考强度 low · 最大输出 8000 tokens')).toBeInTheDocument()
  })

  it('automatically refreshes while a Run is collecting and stops after it leaves collecting', async () => {
    jest.useFakeTimers()
    const awaitingRun: AIEvaluationRunSummary = {
      ...collectingRun,
      status: 'awaiting_review',
      progress: { ...progress, generation_attempts: 35, pending_generation_attempts: 0 }
    }
    listRunsMock
      .mockReturnValueOnce(success({ items: [collectingRun] }))
      .mockReturnValue(success({ items: [awaitingRun] }))
    render(<EvaluationReleaseWorkspace />)

    await waitFor(() => expect(listRunsMock).toHaveBeenCalledTimes(1))
    await act(async () => {
      jest.advanceTimersByTime(15000)
      await Promise.resolve()
    })
    await waitFor(() => expect(screen.getByText('待人工审核')).toBeInTheDocument())
    expect(listRunsMock).toHaveBeenCalledTimes(2)

    act(() => {
      jest.advanceTimersByTime(30000)
    })
    expect(listRunsMock).toHaveBeenCalledTimes(2)
  })

  it('shows technical failures as read-only evidence and opens their details', async () => {
    const failedAttempt: AIReviewAttemptSummary = {
      case_id: 'PROMPT-EVAL-002',
      attempt: 4,
      failure: {
        stage: 'output_validation',
        code: 'provider_output_schema_invalid',
        safe_message: 'Provider output did not satisfy the frozen output schema',
        retryable: false,
        result_unknown: false
      },
      missing_roles: ['assessment_semantics', 'safety_product'],
      reviews: []
    }
    const failedRun: AIEvaluationRun = {
      ...collectingDetail,
      run_id: 'run-failed',
      status: 'awaiting_review',
      execution: undefined,
      progress: {
        ...progress,
        generation_attempts: 35,
        failed_attempts: 1,
        pending_generation_attempts: 0
      },
      attempts: [failedAttempt],
      can_cancel: true
    }
    listRunsMock.mockReturnValue(success({ items: [failedRun] }))
    getRunMock.mockReturnValue(success(failedRun))
    getAttemptMock.mockReturnValue(success({
      ...failedAttempt,
      assessment_input: { facts: { model: { code: 'prompt-eval-scale' } } },
      raw_provider_output: '{"schema_version":"invalid"}',
      normalized_output: undefined,
      provider_receipt: {
        invocation_id: 'invocation-1',
        request_id: 'request-1',
        provider: 'deepseek',
        model: 'deepseek-v4-pro',
        input_tokens: 1000,
        output_tokens: 800,
        latency_ms: 12000
      },
      assertions: [{
        type: 'output_schema_valid',
        scope: 'default',
        ordinal: 1,
        hard: true,
        evaluator: 'deterministic',
        status: 'failed',
        detail: 'schema validation failed'
      }]
    }))

    render(<EvaluationReleaseWorkspace />)
    fireEvent.click(await screen.findByText('run-failed'))

    expect(await screen.findByText('技术失败证据（1）')).toBeInTheDocument()
    expect(screen.getByText('output_validation')).toBeInTheDocument()
    expect(screen.getByText('provider_output_schema_invalid')).toBeInTheDocument()
    expect(screen.getByText('Provider output did not satisfy the frozen output schema')).toBeInTheDocument()
    expect(screen.queryByText(/提交通过意见|提交拒绝意见/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('查看详情'))
    expect(await screen.findByText('只读失败详情')).toBeInTheDocument()
    expect(getAttemptMock).toHaveBeenCalledWith('run-failed', 'PROMPT-EVAL-002', 4)
    expect(screen.getByText('deepseek-v4-pro')).toBeInTheDocument()
    expect(screen.getByText('schema validation failed')).toBeInTheDocument()
  })
})
