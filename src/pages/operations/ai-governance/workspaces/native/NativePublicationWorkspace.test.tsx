import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import * as commands from './commands'
import { NativePublicationWorkspace } from './NativePublicationWorkspace'
import { publicationJournalKey } from './usePublication'
import {
  checkHistory,
  checkPublicationReceipt,
  defaultPublicationSelector,
  PendingPublication
} from './publicationValidation'
import { releaseKeys } from './evaluationValidation'

jest.mock('@/api/path/aiWorkflow', () => ({
  getNativeEvaluation: jest.fn(),
  getAsset: jest.fn(),
  getPublication: jest.fn(),
  listPublicationHistory: jest.fn(),
  getPublicationHistory: jest.fn(),
  getPublicationReceipt: jest.fn(),
  publishConfiguration: jest.fn(),
  rollbackPublication: jest.fn(),
  disablePublication: jest.fn()
}))
const commandID = '11111111-1111-4111-8111-111111111111'
const runID = '22222222-2222-4222-8222-222222222222'
const pubID = '33333333-3333-4333-8333-333333333333'
const newID = '44444444-4444-4444-8444-444444444444'
const at = '2026-09-13T00:00:00Z'
const reason = '发布核对'
const selector = defaultPublicationSelector
const fingerprint = 'sha256:' + 'a'.repeat(64)
const release = Object.fromEntries(
  releaseKeys.map((key) => [key, { id: key, version: 'v1', fingerprint }])
) as unknown as api.EvaluationRelease
const manifest = Object.fromEntries(
  ['profile', 'prompt', 'generation_route', 'input_schema', 'output_schema'].map((key) => [
    key,
    {
      identity: key,
      version: 'v1',
      fingerprint,
      content_sha256: 'a'.repeat(64)
    }
  ])
) as unknown as api.RegisteredManifest
const definition = JSON.stringify({ profile_id: 'profile', version: 'v1', selector })
const initial: api.PublicationState = { selector, version: 0, active_publication_id: '', changed_at: '' }
const published = (version = 1, id = pubID): api.PublicationState => ({
  selector,
  version,
  active_publication_id: id,
  changed_at: at,
  publication: {
    schema_version: 'qs-ai-publication/v1',
    publication: {
      publication_id: id,
      audit: { actor: 'user:42', reason, at },
      evidence: {
        run_id: runID,
        run_version: 9,
        profile: { profile_id: 'profile', version: 'v1', fingerprint, definition_json: definition },
        manifest,
        release,
        evaluated_manifest_fingerprint: fingerprint,
        final_review: { actor: 'user:42', reason: '审核', finalized_at: at, passed: true }
      }
    }
  }
})
const receipt = (
  previous = initial,
  current = published(),
  action: api.PublicationAction = 'publish'
): api.PublicationReceipt => ({
  command_id: commandID,
  previous,
  current,
  action,
  actor: 'user:42',
  reason,
  changed_at: at
})
const approved: api.NativeEvaluationState = {
  run_id: runID,
  version: 9,
  status: 'approved',
  unresolved_result_unknown_count: 0,
  resolutions: [],
  reviews: [],
  review_reopenings: [],
  creation: {
    schema_version: 'qs-ai-evaluation-creation-receipt/v1',
    run_id: runID,
    release,
    release_fingerprint: fingerprint,
    requested_by: 'user:42',
    request_reason: '评测',
    created_at: at
  },
  finalization: {
    schema_version: 'qs-ai-evaluation-finalization/v1',
    run_id: runID,
    source_version: 8,
    version: 9,
    release_fingerprint: fingerprint,
    actor: 'user:42',
    reason: '审核',
    finalized_at: at,
    status: 'approved',
    passed: true,
    gate_result: {
      evaluated_at: at,
      gate_passes: { G1: true, G2: true, G3: true, G4: true, G5: true },
      metrics: [],
      reasons: [],
      semantic_adjudications: []
    }
  }
}
const historyEntry = (): api.PublicationHistoryEntry => ({
  version: 1,
  command_id: commandID,
  action: 'publish',
  actor: 'user:42',
  reason,
  changed_at: at,
  previous_publication_id: null,
  publication_id: pubID,
  run_id: runID,
  run_version: 9,
  profile_id: 'profile',
  profile_version: 'v1'
})
const historyPage = (): api.PublicationHistoryPage => ({
  schema_version: 'qs-ai-publication-history/v1',
  selector,
  entries: [historyEntry()],
  next_before_version: 0
})
const ok = (data: unknown) => Promise.resolve([undefined, { data }])
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const confirm = () => {
  fireEvent.change(screen.getByLabelText('发布操作理由'), { target: { value: reason } })
  fireEvent.click(screen.getByRole('checkbox', { name: '我已核对当前配置范围、版本和操作目标' }))
}
const intent = (): PendingPublication => ({
  commandID,
  action: 'publish',
  expected: { selector, version: 0, active_publication_id: '' },
  runID,
  runVersion: 9,
  releaseFingerprint: fingerprint
})
beforeEach(() => {
  jest.restoreAllMocks()
  jest.clearAllMocks()
  sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(commandID)
  ;(api.getNativeEvaluation as jest.Mock).mockImplementation(() => ok(approved))
  ;(api.getAsset as jest.Mock).mockImplementation(() =>
    ok({ item: { kind: 'profile', reference: manifest.profile }, definition_json: definition })
  )
  ;(api.getPublication as jest.Mock).mockImplementation(() => ok(initial))
  ;(api.publishConfiguration as jest.Mock).mockImplementation(() => ok(receipt()))
  ;(api.listPublicationHistory as jest.Mock).mockImplementation(() => ok(historyPage()))
  ;(api.getPublicationHistory as jest.Mock).mockImplementation(() => ok(receipt()))
})

it('publishes only after fresh approved evidence and explicit confirmation, then requires fresh current state', async () => {
  render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
  expect(api.getNativeEvaluation).not.toHaveBeenCalled()
  click('核对审核记录与发布范围')
  await screen.findByText('从未发布')
  expect(api.getAsset).toHaveBeenCalledWith('profile', 'profile', 'v1')
  expect(api.getPublication).toHaveBeenCalledWith(selector)
  expect(screen.getByRole('button', { name: '确认发布已审核配置' })).toBeDisabled()
  confirm()
  click('确认发布已审核配置')
  await screen.findByText('原操作已确认')
  expect(api.publishConfiguration).toHaveBeenCalledTimes(1)
  expect(api.publishConfiguration).toHaveBeenCalledWith({
    command_id: commandID,
    expected: { selector, version: 0, active_publication_id: '' },
    reason,
    confirm: true,
    run_id: runID,
    run_version: 9,
    release_fingerprint: fingerprint
  })
  expect(sessionStorage.getItem(publicationJournalKey('42'))).toBeNull()
  expect(screen.queryByRole('button', { name: '确认发布已审核配置' })).not.toBeInTheDocument()
  expect(api.getPublication).toHaveBeenCalledTimes(1)
  ;(api.getPublication as jest.Mock).mockImplementation(() => ok(published(4, newID)))
  click('读取操作后的当前状态')
  await screen.findByText('最近读取的发布状态')
  expect(api.getPublication).toHaveBeenCalledTimes(2)
  expect(screen.getByRole('button', { name: '确认发布已审核配置' })).toBeDisabled()
})

it.each(['unapproved', 'missing-finalization', 'wrong-profile', 'wrong-selector'])(
  'cannot publish when preparation has %s',
  async (kind) => {
    const run = JSON.parse(JSON.stringify(approved))
    if (kind === 'unapproved') run.status = 'awaiting_review'
    if (kind === 'missing-finalization') delete run.finalization
    ;(api.getNativeEvaluation as jest.Mock).mockImplementation(() => ok(run))
    if (kind === 'wrong-profile')
      (api.getAsset as jest.Mock).mockImplementation(() =>
        ok({
          item: { kind: 'profile', reference: { ...manifest.profile, version: 'v2' } },
          definition_json: definition
        })
      )
    if (kind === 'wrong-selector')
      (api.getPublication as jest.Mock).mockImplementation(() =>
        ok({ ...initial, selector: { ...selector, model_code: 'other' } })
      )
    render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
    click('核对审核记录与发布范围')
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '核对审核记录与发布范围' })).not.toBeDisabled()
    )
    expect(screen.queryByRole('button', { name: '确认发布已审核配置' })).not.toBeInTheDocument()
    expect(api.publishConfiguration).not.toHaveBeenCalled()
  }
)

it('requires a historical detail before rollback and sends the currently observed CAS', async () => {
  const current = published(2, newID)
  ;(api.getPublication as jest.Mock).mockImplementation(() => ok(current))
  ;(api.rollbackPublication as jest.Mock).mockImplementation(() =>
    ok(receipt(current, published(3), 'rollback'))
  )
  render(<NativePublicationWorkspace owner="42" />)
  click('查询当前发布')
  await screen.findByText('最近读取的发布状态')
  confirm()
  expect(screen.getByRole('button', { name: '确认回退到所选配置' })).toBeDisabled()
  click('读取发布历史')
  await screen.findByRole('button', { name: '核对版本 1' })
  expect(api.rollbackPublication).not.toHaveBeenCalled()
  click('核对版本 1')
  await screen.findByText('历史变更 1 的原始证据')
  expect(api.getPublicationHistory).toHaveBeenCalledWith(selector, 1)
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  confirm()
  click('确认回退到所选配置')
  await screen.findByText('原操作已确认')
  expect(api.rollbackPublication).toHaveBeenCalledWith({
    command_id: commandID,
    expected: { selector, version: 2, active_publication_id: newID },
    reason,
    confirm: true,
    target_publication_id: pubID
  })
})

it('disables only an active configuration and preserves the original version', async () => {
  const current = published()
  ;(api.getPublication as jest.Mock).mockImplementation(() => ok(current))
  ;(api.disablePublication as jest.Mock).mockImplementation(() =>
    ok(receipt(current, { ...initial, version: 2, changed_at: at }, 'disable'))
  )
  render(<NativePublicationWorkspace owner="42" />)
  click('查询当前发布')
  await screen.findByText('最近读取的发布状态')
  confirm()
  click('确认停用当前配置')
  await screen.findByText('原操作已确认')
  expect(api.disablePublication).toHaveBeenCalledWith({
    command_id: commandID,
    expected: { selector, version: 1, active_publication_id: pubID },
    reason,
    confirm: true
  })
})

it('persists uncertain commands across reload, never replays and keeps not-found receipts pending', async () => {
  (api.publishConfiguration as jest.Mock).mockResolvedValue([{ status: 504 }, undefined])
  ;(api.getPublicationReceipt as jest.Mock).mockResolvedValue([{ status: 404 }, undefined])
  const view = render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
  click('核对审核记录与发布范围')
  await screen.findByText('从未发布')
  confirm()
  click('确认发布已审核配置')
  await screen.findByText('操作结果尚未确认，请查询原命令回执；不要重复提交。')
  const raw = sessionStorage.getItem(publicationJournalKey('42')) || ''
  expect(JSON.parse(raw)).toEqual(intent())
  expect(raw).not.toContain(reason)
  view.unmount()
  const reloaded = render(<NativePublicationWorkspace owner="42" />)
  click('查询原发布命令回执')
  await screen.findByText('尚未取得原命令回执，继续保留原命令；请稍后再查。')
  expect(sessionStorage.getItem(publicationJournalKey('42'))).toBe(raw)
  expect(api.publishConfiguration).toHaveBeenCalledTimes(1)
  reloaded.unmount()
  render(<NativePublicationWorkspace owner="43" />)
  expect(screen.queryByText(commandID)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '查询当前发布' })).not.toBeDisabled()
})

it('recovers only matching receipts and never treats an old receipt as current state', async () => {
  sessionStorage.setItem(publicationJournalKey('42'), JSON.stringify(intent()))
  ;(api.getPublicationReceipt as jest.Mock)
    .mockImplementationOnce(() => ok({ ...receipt(), command_id: newID }))
    .mockImplementationOnce(() => ok(receipt()))
  render(<NativePublicationWorkspace owner="42" />)
  click('查询原发布命令回执')
  await screen.findByText('原命令回执不一致，继续保留原命令，请联系管理员核对。')
  expect(sessionStorage.getItem(publicationJournalKey('42'))).not.toBeNull()
  click('查询原发布命令回执')
  await screen.findByText('原操作已确认')
  expect(api.getPublication).not.toHaveBeenCalled()
  expect(screen.queryByText('最近读取的发布状态')).not.toBeInTheDocument()
  expect(api.publishConfiguration).not.toHaveBeenCalled()
})

it('prevents duplicate submissions while transport is pending and ignores late owner results', async () => {
  let resolve: (value: unknown) => void = () => undefined
  ;(api.publishConfiguration as jest.Mock).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r
      })
  )
  const view = render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
  click('核对审核记录与发布范围')
  await screen.findByText('从未发布')
  confirm()
  const button = screen.getByRole('button', { name: '确认发布已审核配置' })
  fireEvent.click(button)
  fireEvent.click(button)
  expect(api.publishConfiguration).toHaveBeenCalledTimes(1)
  view.unmount()
  render(<NativePublicationWorkspace owner="43" />)
  await act(async () => {
    resolve([undefined, { data: receipt() }])
  })
  expect(screen.queryByText('原操作已确认')).not.toBeInTheDocument()
  expect(sessionStorage.getItem(publicationJournalKey('42'))).not.toBeNull()
})

it('does not send a write when the command journal cannot be persisted', async () => {
  render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
  click('核对审核记录与发布范围')
  await screen.findByText('从未发布')
  confirm()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full')
  })
  click('确认发布已审核配置')
  await screen.findByText('无法保存原命令标识，本次未发送。')
  expect(api.publishConfiguration).not.toHaveBeenCalled()
})

it.each(['command', 'version', 'run', 'target', 'audit'])('rejects an unbound %s receipt', (kind) => {
  const value = receipt()
  const pending = intent()
  if (kind === 'command') value.command_id = newID
  if (kind === 'version') value.current.version = 2
  if (kind === 'run') pending.runID = newID
  if (kind === 'target') {
    pending.action = 'rollback'
    pending.targetID = newID
  }
  if (kind === 'audit') value.actor = ''
  expect(() => checkPublicationReceipt(value, pending, reason)).toThrow()
})

it.each(['null', 'selector', 'cursor', 'order', 'missing-source'])(
  'rejects malformed %s history',
  (kind) => {
    const page = historyPage()
    if (kind === 'null') page.entries = null as unknown as api.PublicationHistoryEntry[]
    if (kind === 'selector') page.selector = { ...selector, model_code: 'other' }
    if (kind === 'cursor') page.next_before_version = 1
    if (kind === 'order') page.entries.push(historyEntry())
    if (kind === 'missing-source') page.entries[0].publication_id = null
    expect(() => checkHistory(page, selector, 0)).toThrow()
  }
)

it.each(['null', '{}', 'broken-json'])('locks a damaged %s command journal without requests', raw => {
  sessionStorage.setItem(publicationJournalKey('42'), raw)
  render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
  expect(screen.getByText('无法恢复原发布命令，请联系管理员核对。')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '查询当前发布' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '核对审核记录与发布范围' })).toBeDisabled()
  expect(api.publishConfiguration).not.toHaveBeenCalled()
})

it('requires a fresh snapshot after a definitive permission rejection', async () => {
  (api.publishConfiguration as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  render(<NativePublicationWorkspace owner="42" initialRunID={runID} />)
  click('核对审核记录与发布范围')
  await screen.findByText('从未发布')
  confirm()
  click('确认发布已审核配置')
  await screen.findByText('操作被拒绝，请重新读取状态并核对权限。')
  expect(sessionStorage.getItem(publicationJournalKey('42'))).toBeNull()
  expect(screen.queryByText('最近读取的发布状态')).not.toBeInTheDocument()
  expect(api.publishConfiguration).toHaveBeenCalledTimes(1)
})
