import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import * as commands from './commands'
import { PromptDraftWorkspace } from './PromptDraftWorkspace'

jest.mock('@/api/path/aiWorkflow', () => ({
  createPromptDraft: jest.fn(),
  revisePromptDraft: jest.fn(),
  freezePromptDraft: jest.fn(),
  getPromptDraft: jest.fn(),
  getPromptDraftLifecycle: jest.fn(),
  getDraftReceipt: jest.fn(),
  getFreezeReceipt: jest.fn()
}))
const source = { identity: 'prompt', version: 'v1', fingerprint: 'sha256:' + 'a'.repeat(64), content_sha256: 'b'.repeat(64) }
const content = {
  system_message: '系统说明',
  task_template: '原任务模板',
  data_preamble: '事实',
  allowed_placeholders: []
}
const draftID = '11111111-1111-4111-8111-111111111111'
const commandID = '22222222-2222-4222-8222-222222222222'
const saved = {
  draft_id: draftID,
  command_id: commandID,
  revision: 1,
  template_id: 'prompt',
  target_version: 'v2',
  source,
  content,
  reason: '修改',
  saved_at: '2026-09-13T00:00:00Z'
}
const ok = (data: unknown) => Promise.resolve([null, { code: 0, data }])
const setupCreate = () => {
  fireEvent.change(screen.getByLabelText('新模板版本'), { target: { value: 'v2' } })
  fireEvent.change(screen.getByLabelText('操作理由'), { target: { value: '修改模板' } })
}
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(commandID).mockReturnValueOnce(draftID)
  ;(api.createPromptDraft as jest.Mock).mockReturnValue(ok(saved))
  ;(api.getPromptDraftLifecycle as jest.Mock).mockReturnValue(ok({ schema_version: 'qs-ai-prompt-lifecycle/v1', draft: saved, status: 'editable' }))
  ;(api.getDraftReceipt as jest.Mock).mockReturnValue(ok(saved))
})
afterEach(() => jest.restoreAllMocks())
it.each([504, 409])(
  'keeps uncertain HTTP %s across refresh and reconciles without another POST',
  async (status) => {
    (api.createPromptDraft as jest.Mock).mockReturnValue(Promise.resolve([{ status }, undefined]))
    const view = render(<PromptDraftWorkspace owner="user-1" source={source} />)
    setupCreate()
    fireEvent.click(screen.getByRole('button', { name: '创建草稿' }))
    await screen.findByText('结果尚未确认，请查询原命令回执；不要重复提交。')
    expect(screen.getByRole('button', { name: '创建草稿' })).toBeDisabled()
    expect(JSON.parse(sessionStorage.getItem(commands.pendingKey('user-1')) || 'null')).toEqual({
      kind: 'create',
      draftID,
      commandID
    })
    expect(sessionStorage.getItem(commands.pendingKey('user-1'))).not.toContain('修改模板')
    view.unmount()
    render(<PromptDraftWorkspace owner="user-1" source={source} />)
    fireEvent.click(screen.getByText('查询原命令回执'))
    await screen.findByDisplayValue('原任务模板')
    expect(api.getDraftReceipt).toHaveBeenCalledWith(commandID)
    expect(api.createPromptDraft).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(commands.pendingKey('user-1'))).toBeNull()
  }
)
it('keeps not-found receipts pending and does not expose another owner journal', async () => {
  sessionStorage.setItem(
    commands.pendingKey('user-1'),
    JSON.stringify({ kind: 'create', draftID, commandID })
  )
  ;(api.getDraftReceipt as jest.Mock).mockReturnValue(Promise.resolve([{ status: 404 }, undefined]))
  const view = render(<PromptDraftWorkspace owner="user-1" source={source} />)
  fireEvent.click(screen.getByText('查询原命令回执'))
  await screen.findByText('尚未取得原回执，请稍后再查或确认原操作账号；暂不重新提交。')
  expect(screen.getByRole('button', { name: '创建草稿' })).toBeDisabled()
  view.unmount()
  render(<PromptDraftWorkspace owner="user-2" source={source} />)
  expect(screen.queryByText('查询原命令回执')).not.toBeInTheDocument()
  expect(api.createPromptDraft).not.toHaveBeenCalled()
})
it('saves the current revision then freezes only the saved content', async () => {
  (api.revisePromptDraft as jest.Mock).mockReturnValue(
    ok({ ...saved, revision: 2, content: { ...content, task_template: '新模板' } })
  )
  ;(api.freezePromptDraft as jest.Mock).mockReturnValue(
    ok({
      command: { command_id: commandID, draft_id: draftID, expected_revision: 2 },
      asset: { ...source, version: 'v2' }
    })
  )
  render(<PromptDraftWorkspace owner="user-1" source={null} />)
  fireEvent.change(screen.getByLabelText('草稿标识'), { target: { value: draftID } })
  fireEvent.click(screen.getByText('打开草稿'))
  await screen.findByDisplayValue('原任务模板')
  fireEvent.change(screen.getByLabelText('任务模板'), { target: { value: '新模板' } })
  fireEvent.change(screen.getByLabelText('操作理由'), { target: { value: '调整模板' } })
  expect(screen.getByRole('button', { name: '校验并冻结当前修订' })).toBeDisabled()
  // This test opens an existing draft; the first generated ID is the save command.
  ;(commands.newCommandID as jest.Mock).mockReset().mockReturnValue(commandID)
  fireEvent.click(screen.getByText('保存新修订'))
  await waitFor(() => expect(screen.getByLabelText('操作理由')).toHaveValue(''))
  expect(api.revisePromptDraft).toHaveBeenCalledWith(
    draftID,
    expect.objectContaining({
      expected_revision: 1,
      command_id: commandID,
      content: { ...content, task_template: '新模板' }
    })
  )
  fireEvent.change(screen.getByLabelText('操作理由'), { target: { value: '校验新修订' } })
  fireEvent.click(screen.getByRole('button', { name: '校验并冻结当前修订' }))
  await screen.findByText('已冻结的模板版本')
  expect(api.freezePromptDraft).toHaveBeenCalledWith(
    draftID,
    expect.objectContaining({ expected_revision: 2 })
  )
  expect(screen.getByLabelText('任务模板')).toBeDisabled()
})
it('guards rapid double submission and never writes if its journal cannot be saved', async () => {
  let finish!: (value: any) => void
  ;(api.createPromptDraft as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  const view = render(<PromptDraftWorkspace owner="user-1" source={source} />)
  setupCreate()
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: '创建草稿' }))
    fireEvent.click(screen.getByRole('button', { name: '创建草稿' }))
  })
  expect(api.createPromptDraft).toHaveBeenCalledTimes(1)
  await act(async () => {
    finish([null, { data: saved }])
  })
  view.unmount()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage denied')
  })
  render(<PromptDraftWorkspace owner="user-1" source={source} />)
  setupCreate()
  fireEvent.click(screen.getByRole('button', { name: '创建草稿' }))
  await screen.findByText('无法保存原命令标识，本次未发送。')
  expect(api.createPromptDraft).toHaveBeenCalledTimes(1)
})
it('treats HTTP rejection as rejected and rejects mismatched successful receipts', async () => {
  (api.createPromptDraft as jest.Mock).mockReturnValue(
    Promise.resolve([{ status: 403 }, undefined])
  )
  const view = render(<PromptDraftWorkspace owner="user-1" source={source} />)
  setupCreate()
  fireEvent.click(screen.getByRole('button', { name: '创建草稿' }))
  await screen.findByText('操作被拒绝，请检查权限、版本和输入后再提交。')
  expect(sessionStorage.getItem(commands.pendingKey('user-1'))).toBeNull()
  view.unmount()
  sessionStorage.setItem(
    commands.pendingKey('user-1'),
    JSON.stringify({ kind: 'create', draftID, commandID })
  )
  ;(api.getDraftReceipt as jest.Mock).mockReturnValue(ok({ ...saved, command_id: draftID }))
  render(<PromptDraftWorkspace owner="user-1" source={source} />)
  fireEvent.click(screen.getByText('查询原命令回执'))
  await screen.findByText('回执查询失败，原命令仍待核对。')
  expect(screen.getByRole('button', { name: '创建草稿' })).toBeDisabled()
})
it('uses the UTF-8 reason limit and keeps malformed journals locked', () => {
  expect(commands.validReason('中'.repeat(333))).toBe(true)
  expect(commands.validReason('中'.repeat(334))).toBe(false)
  expect(commands.validReason('<script>')).toBe(false)
  expect(commands.validReason(String.fromCharCode(0xd800))).toBe(false)
  sessionStorage.setItem(commands.pendingKey('user-1'), '{bad')
  render(<PromptDraftWorkspace owner="user-1" source={source} />)
  setupCreate()
  expect(screen.getByRole('button', { name: '创建草稿' })).toBeDisabled()
})

const frozenLifecycle = () => ({
  schema_version: 'qs-ai-prompt-lifecycle/v1',
  draft: saved,
  status: 'frozen',
  frozen: { asset: { ...source, version: 'v2' }, revision: 1, frozen_at: saved.saved_at }
})
it('reopens a frozen draft read-only using lifecycle, without replaying any write', async () => {
  (api.getPromptDraftLifecycle as jest.Mock).mockReturnValue(ok(frozenLifecycle()))
  render(<PromptDraftWorkspace owner="user-1" source={null} />)
  fireEvent.change(screen.getByLabelText('草稿标识'), { target: { value: draftID } })
  fireEvent.click(screen.getByText('打开草稿'))
  await screen.findByText('已冻结的模板版本')
  expect(screen.getByLabelText('任务模板')).toBeDisabled()
  fireEvent.change(screen.getByLabelText('操作理由'), { target: { value: '不能覆盖冻结版本' } })
  expect(screen.getByRole('button', { name: '保存新修订' })).toBeDisabled()
  expect(screen.getByRole('button', { name: '校验并冻结当前修订' })).toBeDisabled()
  expect(api.getPromptDraftLifecycle).toHaveBeenCalledWith(draftID)
  expect(api.getPromptDraft).not.toHaveBeenCalled()
  expect(api.revisePromptDraft).not.toHaveBeenCalled()
  expect(api.freezePromptDraft).not.toHaveBeenCalled()
})
it.each(['missing', 'unknown', 'revision', 'target', 'time', 'unavailable'])(
  'does not expose an editor for %s lifecycle', async (bad) => {
    const value: any = frozenLifecycle()
    if (bad === 'missing') delete value.frozen
    if (bad === 'unknown') value.status = 'other'
    if (bad === 'revision') value.frozen.revision = 2
    if (bad === 'target') value.frozen.asset.version = 'v3'
    if (bad === 'time') value.frozen.frozen_at = '2020-01-01T00:00:00Z'
    ;(api.getPromptDraftLifecycle as jest.Mock).mockReturnValue(
      bad === 'unavailable' ? Promise.resolve([{ status: 503 }, undefined]) : ok(value)
    )
    render(<PromptDraftWorkspace owner="user-1" source={null} />)
    fireEvent.change(screen.getByLabelText('草稿标识'), { target: { value: draftID } })
    fireEvent.click(screen.getByText('打开草稿'))
    await screen.findByText('无法确认草稿当前状态，请检查权限与服务后重新打开。')
    expect(screen.queryByLabelText('任务模板')).not.toBeInTheDocument()
    expect(api.getPromptDraft).not.toHaveBeenCalled()
  }
)
it('reconciles an older save receipt against current freeze state before unlocking', async () => {
  sessionStorage.setItem(commands.pendingKey('user-1'), JSON.stringify({ kind: 'revise', draftID, commandID }))
  ;(api.getPromptDraftLifecycle as jest.Mock).mockReturnValue(ok(frozenLifecycle()))
  render(<PromptDraftWorkspace owner="user-1" source={null} />)
  fireEvent.click(screen.getByText('查询原命令回执'))
  await screen.findByText('已冻结的模板版本')
  expect(screen.getByLabelText('任务模板')).toBeDisabled()
  expect(api.getDraftReceipt).toHaveBeenCalledWith(commandID)
  expect(api.getPromptDraftLifecycle).toHaveBeenCalledWith(draftID)
  expect(api.revisePromptDraft).not.toHaveBeenCalled()
  expect(sessionStorage.getItem(commands.pendingKey('user-1'))).toBeNull()
})
it('retains the original command lock when lifecycle refresh after a receipt fails', async () => {
  sessionStorage.setItem(commands.pendingKey('user-1'), JSON.stringify({ kind: 'revise', draftID, commandID }))
  ;(api.getPromptDraftLifecycle as jest.Mock).mockReturnValue(Promise.resolve([{ status: 503 }, undefined]))
  render(<PromptDraftWorkspace owner="user-1" source={null} />)
  fireEvent.click(screen.getByText('查询原命令回执'))
  await screen.findByText('回执查询失败，原命令仍待核对。')
  expect(screen.queryByLabelText('任务模板')).not.toBeInTheDocument()
  expect(sessionStorage.getItem(commands.pendingKey('user-1'))).not.toBeNull()
  expect(api.revisePromptDraft).not.toHaveBeenCalled()
})
