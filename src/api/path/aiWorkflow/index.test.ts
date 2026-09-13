import * as api from './index'
import { internalV2Get, internalV2PostOnce } from '@/api/qsServer'
jest.mock('@/api/qsServer', () => ({ internalV2Get: jest.fn(), internalV2PostOnce: jest.fn() }))
const get = internalV2Get as jest.Mock
const post = internalV2PostOnce as jest.Mock
beforeEach(() => jest.clearAllMocks())
it('queries native tasks through the audit-scoped list without client-supplied identity or writes', () => {
  api.listNativeEvaluations('awaiting_review', 'cursor')
  expect(get.mock.calls).toEqual([
    ['/interpretation/ai-workflow/evaluations', { status: 'awaiting_review', cursor: 'cursor', limit: 20 }]
  ])
  expect(post).not.toHaveBeenCalled()
})
it('reads version-bound unknown calls and sends an original-call resolution without replay', () => {
  const command: api.NativeResolutionCommand = {
    expected_version: 7,
    execution_id: 'execution:1',
    decision: 'cancel_run',
    reason: '已核对供应商记录',
    confirm: true,
    acknowledged_duplicate_call_and_cost_risk: true
  }
  api.listNativeUnknowns('run/id', 7)
  api.resolveNativeUnknown('run/id', command)
  expect(get.mock.calls).toEqual([
    ['/interpretation/ai-workflow/evaluations/run%2Fid/result-unknown', { expected_version: 7 }]
  ])
  expect(post.mock.calls).toEqual([
    ['/interpretation/ai-workflow/evaluations/run%2Fid/result-unknown/resolve', command]
  ])
})
it('submits version-bound review reopening only once through the new proxy', () => {
  const command: api.NativeReopenCommand = { expected_version: 9, reason: '复核语义判定', confirm: true }
  api.reopenNativeReview('run/id', command)
  expect(post.mock.calls).toEqual([
    ['/interpretation/ai-workflow/evaluations/run%2Fid/reopen-review', command]
  ])
  expect(get).not.toHaveBeenCalled()
})
it('keeps publication reads scoped and mutations explicit without transport replay', () => {
  const selector: api.PublicationSelector = {
    audience: 'participant', model_kind: 'scale', decision_kind: 'score_range',
    model_code: '量表/a', model_version: 'v1/a'
  }
  const command: api.PublicationCommand = {
    command_id: 'command', expected: { selector, version: 0, active_publication_id: '' }, reason: '发布', confirm: true
  }
  api.getPublication(selector)
  api.listPublicationHistory(selector, 8)
  api.getPublicationHistory(selector, 3)
  api.getPublicationReceipt('command/id')
  api.publishConfiguration({ ...command, run_id: 'run', run_version: 9, release_fingerprint: 'sha256:ref' })
  api.rollbackPublication({ ...command, target_publication_id: 'target' })
  api.disablePublication(command)
  expect(get.mock.calls).toEqual([
    ['/interpretation/ai-workflow/publications', selector],
    ['/interpretation/ai-workflow/publications/history', { ...selector, limit: 20, before_version: 8 }],
    ['/interpretation/ai-workflow/publications/history/3', selector],
    ['/interpretation/ai-workflow/publications/commands/command%2Fid']
  ])
  expect(post.mock.calls).toEqual([
    ['/interpretation/ai-workflow/publications/publish', { ...command, run_id: 'run', run_version: 9, release_fingerprint: 'sha256:ref' }],
    ['/interpretation/ai-workflow/publications/rollback', { ...command, target_publication_id: 'target' }],
    ['/interpretation/ai-workflow/publications/disable', command]
  ])
})
it('routes native evaluation prepare/create/start and versioned result reads only to the new proxy', () => {
  const ref = { id: 'suite', version: 'v1', fingerprint: 'sha256:' + 'a'.repeat(64) }
  const query = { suite: ref, generation_route: ref, semantic_route: ref }
  const create: api.NativeEvaluationCreate = {
    release: {} as api.EvaluationRelease,
    reason: '创建',
    confirm: true
  }
  const start: api.NativeEvaluationStart = { expected_version: 7, reason: '启动', confirm: true }
  api.prepareNativeEvaluation(query)
  api.createNativeEvaluation('run/id', create)
  api.startNativeEvaluation('run/id', start)
  api.getNativeEvaluation('run/id')
  api.listNativeCandidates('run/id')
  api.getNativeCandidate('run/id', 'candidate/id', 7)
  expect(post.mock.calls).toEqual([
    ['/interpretation/ai-workflow/evaluations/prepare', query],
    ['/interpretation/ai-workflow/evaluations/run%2Fid/create', create],
    ['/interpretation/ai-workflow/evaluations/run%2Fid/start', start]
  ])
  expect(get.mock.calls).toEqual([
    ['/interpretation/ai-workflow/evaluations/run%2Fid'],
    ['/interpretation/ai-workflow/evaluations/run%2Fid/candidates'],
    [
      '/interpretation/ai-workflow/evaluations/run%2Fid/candidates/candidate%2Fid',
      { expected_version: 7 }
    ]
  ])
})
it('reads only the new QS proxy with slash-bearing identity in query parameters', () => {
  api.listAssets('prompt', '中文/id', 'cursor')
  api.getAsset('schema', 'schema/input', 'v1/sub')
  api.getPromptDraft('draft/id')
  api.getDraftReceipt('command/id')
  api.getFreezeReceipt('freeze/id')
  expect(get).toHaveBeenNthCalledWith(1, '/interpretation/ai-workflow/assets/prompt', {
    identity: '中文/id',
    cursor: 'cursor',
    limit: 20
  })
  expect(get).toHaveBeenNthCalledWith(2, '/interpretation/ai-workflow/assets/schema/detail', {
    identity: 'schema/input',
    version: 'v1/sub'
  })
  expect(get).toHaveBeenNthCalledWith(3, '/interpretation/ai-workflow/prompt-drafts/draft%2Fid')
  expect(get).toHaveBeenNthCalledWith(
    4,
    '/interpretation/ai-workflow/prompt-drafts/commands/command%2Fid'
  )
  expect(get).toHaveBeenNthCalledWith(
    5,
    '/interpretation/ai-workflow/prompt-drafts/freeze-commands/freeze%2Fid'
  )
  expect(post).not.toHaveBeenCalled()
})
it('sends fixed command identities and revisions through the no-replay transport', () => {
  const source = { identity: 'p', version: 'v1', fingerprint: 'sha256:f', content_sha256: 'c' }
  const command = { command_id: 'c', reason: '修改' }
  const create = { ...command, source, template_id: 'p', target_version: 'v2' }
  const revise = {
    ...command,
    expected_revision: 7,
    content: {
      system_message: '系统',
      task_template: '正文',
      data_preamble: '数据',
      allowed_placeholders: []
    }
  }
  api.createPromptDraft('d', create)
  api.revisePromptDraft('d', revise)
  api.freezePromptDraft('d', { ...command, expected_revision: 8 })
  expect(post.mock.calls).toEqual([
    ['/interpretation/ai-workflow/prompt-drafts/d/create', create],
    ['/interpretation/ai-workflow/prompt-drafts/d/revisions', revise],
    ['/interpretation/ai-workflow/prompt-drafts/d/freeze', { ...command, expected_revision: 8 }]
  ])
})

it('uses the lifecycle endpoint separately from historical revision reads', () => {
  api.getPromptDraftLifecycle('draft/id')
  expect(get).toHaveBeenCalledWith('/interpretation/ai-workflow/prompt-drafts/draft%2Fid/lifecycle')
  expect(post).not.toHaveBeenCalled()
})

it('registers native Profile through the no-replay proxy and reads only the original receipt', () => {
  const source = { identity: 'p', version: 'v1', fingerprint: 'sha256:f', content_sha256: 'c' }
  const command = {
    command_id: 'c',
    reason: '新策略',
    source,
    definition_json: '{}',
    prompt: source,
    generation_route: source
  }
  api.registerProfile(command)
  api.getProfileReceipt('command/id')
  expect(post).toHaveBeenCalledWith('/interpretation/ai-workflow/profiles/register', command)
  expect(get).toHaveBeenCalledWith('/interpretation/ai-workflow/profiles/commands/command%2Fid')
})

it('registers Suite through the no-replay proxy and queries the original command', () => {
  const asset = { identity: 'p', version: 'v1', fingerprint: 'sha256:f', content_sha256: 'c' }
  const command = {
    command_id: 'c',
    reason: '新套件',
    source: { id: 's', version: 'v1', fingerprint: 'sha256:f' },
    suite_id: 's',
    suite_version: 'v2',
    profile: asset,
    prompt: asset,
    generation_route: asset
  }
  api.registerSuite(command)
  api.getSuiteReceipt('command/id')
  expect(post).toHaveBeenCalledWith('/interpretation/ai-workflow/suites/register', command)
  expect(get).toHaveBeenCalledWith('/interpretation/ai-workflow/suites/commands/command%2Fid')
})

it('sends native candidate review once with version and encoded Run identity', () => {
  const command: api.NativeReviewCommand = { expected_version: 8, role: 'assessment_semantics',
    reviews: [{ candidate_id: 'candidate:1', decision: 'approve', reason: '已核对' }] }
  api.reviewNativeEvaluation('run/id', command)
  expect(post).toHaveBeenCalledWith('/interpretation/ai-workflow/evaluations/run%2Fid/reviews', command)
  expect(get).not.toHaveBeenCalled()
})

it('reads version-bound native gates and preserves explicit false finalization through the no-replay proxy', () => {
  api.previewNativeGates('run/id', 8)
  const command = { expected_version: 8, expected_passed: false, reason: '门槛未通过', confirm: true as const }
  api.finalizeNativeEvaluation('run/id', command)
  expect(get).toHaveBeenCalledWith('/interpretation/ai-workflow/evaluations/run%2Fid/gates', { expected_version: 8 })
  expect(post).toHaveBeenCalledWith('/interpretation/ai-workflow/evaluations/run%2Fid/finalize', command)
})

it.each([false, true])('sends explicit discard=%s cancellation once', (discard) => {
  const command: api.NativeCancelCommand = { expected_version: 7, reason: '结束任务', confirm: true, discard }
  api.cancelNativeEvaluation('run/id', command)
  expect(post.mock.calls).toEqual([['/interpretation/ai-workflow/evaluations/run%2Fid/cancel', command]])
  expect(get).not.toHaveBeenCalled()
})
