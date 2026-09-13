import { act, fireEvent, render, screen } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import * as commands from './commands'
import { ProfileRegistrationWorkspace } from './ProfileRegistrationWorkspace'
import { profileDefinition } from './profileRegistration'
import { profileJournalKey } from './useProfileRegistration'

jest.mock('@/api/path/aiWorkflow', () => ({
  registerProfile: jest.fn(),
  getProfileReceipt: jest.fn()
}))
const id = '22222222-2222-4222-8222-222222222222'
const ref = (identity: string, version: string) => ({
  identity,
  version,
  fingerprint: 'sha256:' + 'a'.repeat(64),
  content_sha256: 'b'.repeat(64)
})
const original = {
  profile_id: '原策略',
  version: 'v1',
  schema_version: 'ai-explanation-profile/v1',
  eligibility: { max_input_dimensions: 12 },
  input_policy: {
    context_scope: 'current_assessment_only',
    hierarchy_policy: { allow_parent_child_in_same_insight: false }
  },
  safety_policy: { forbidden_claims: ['diagnosis'] },
  generation_policy: {
    prompt_template_id: 'p',
    prompt_version: 'v1',
    provider_route: 'r',
    input_schema_version: 'input/v1'
  }
}
const selection = {
  profile: {
    item: { kind: 'profile' as const, reference: ref('原策略', 'v1') },
    definition_json: JSON.stringify(original)
  },
  prompt: ref('p', 'v2'),
  route: ref('r', 'v8')
}
const receipt = (command: api.RegisterProfile) => ({
  command,
  registered_at: '2026-09-13T00:00:00Z',
  manifest: {
    profile: ref('原策略', 'v2'),
    prompt: command.prompt,
    generation_route: command.generation_route,
    input_schema: ref('input', 'v1'),
    output_schema: ref('output', 'v1')
  }
})
const setup = () => {
  fireEvent.change(screen.getByLabelText('新策略版本'), { target: { value: 'v2' } })
  fireEvent.change(screen.getByLabelText('注册理由'), { target: { value: '使用新冻结模板' } })
}
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(id)
  ;(api.registerProfile as jest.Mock).mockImplementation((command) =>
    Promise.resolve([null, { data: receipt(command) }])
  )
})
afterEach(() => jest.restoreAllMocks())
it('preserves the original policy while binding selected immutable prompt and route', async () => {
  const before = selection.profile.definition_json
  const result = JSON.parse(
    profileDefinition(selection.profile, 'v2', selection.prompt, selection.route)
  )
  expect(result).toEqual({
    ...original,
    version: 'v2',
    generation_policy: { ...original.generation_policy, prompt_version: 'v2' }
  })
  expect(selection.profile.definition_json).toBe(before)
  render(<ProfileRegistrationWorkspace owner="user-1" selection={selection} />)
  setup()
  fireEvent.click(screen.getByRole('button', { name: '注册新策略版本' }))
  await screen.findByText('已注册的策略版本')
  expect(screen.getByRole('button', { name: '注册新策略版本' })).toBeDisabled()
  expect(api.registerProfile).toHaveBeenCalledWith({
    command_id: id,
    source: selection.profile.item.reference,
    definition_json: JSON.stringify(result),
    prompt: selection.prompt,
    generation_route: selection.route,
    reason: '使用新冻结模板'
  })
  expect(sessionStorage.getItem(profileJournalKey('user-1'))).toBeNull()
})
it.each([409, 504])(
  'keeps HTTP %s unknown and restores original receipt without another write',
  async (status) => {
    (api.registerProfile as jest.Mock).mockResolvedValue([{ status }, undefined])
    const view = render(<ProfileRegistrationWorkspace owner="user-1" selection={selection} />)
    setup()
    fireEvent.click(screen.getByRole('button', { name: '注册新策略版本' }))
    await screen.findByText('注册结果尚未确认，请查询原命令回执。')
    expect(sessionStorage.getItem(profileJournalKey('user-1'))).toBe(id)
    expect(screen.getByRole('button', { name: '注册新策略版本' })).toBeDisabled()
    const command = (api.registerProfile as jest.Mock).mock.calls[0][0]
    view.unmount()
    ;(api.getProfileReceipt as jest.Mock).mockResolvedValue([null, { data: receipt(command) }])
    render(<ProfileRegistrationWorkspace owner="user-1" selection={{}} />)
    fireEvent.click(screen.getByText('查询注册回执'))
    await screen.findByText('已注册的策略版本')
    expect(api.getProfileReceipt).toHaveBeenCalledWith(id)
    expect(api.registerProfile).toHaveBeenCalledTimes(1)
  }
)
it('retains missing receipts and isolates the original owner journal', async () => {
  sessionStorage.setItem(profileJournalKey('user-1'), id)
  ;(api.getProfileReceipt as jest.Mock).mockResolvedValue([{ status: 404 }, undefined])
  const view = render(<ProfileRegistrationWorkspace owner="user-1" selection={selection} />)
  fireEvent.click(screen.getByText('查询注册回执'))
  await screen.findByText('尚未取得注册回执，原命令继续保留；请稍后再查。')
  expect(sessionStorage.getItem(profileJournalKey('user-1'))).toBe(id)
  view.unmount()
  render(<ProfileRegistrationWorkspace owner="user-2" selection={selection} />)
  setup()
  expect(screen.queryByText('查询注册回执')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '注册新策略版本' })).toBeEnabled()
})
it('never accepts a mismatched registration receipt as success', async () => {
  (api.registerProfile as jest.Mock).mockImplementation((command) => {
    const value = receipt(command)
    value.manifest.profile.version = 'wrong'
    return Promise.resolve([null, { data: value }])
  })
  render(<ProfileRegistrationWorkspace owner="user-1" selection={selection} />)
  setup()
  fireEvent.click(screen.getByRole('button', { name: '注册新策略版本' }))
  await screen.findByText('注册结果尚未确认，请查询原命令回执。')
  expect(screen.queryByText('已注册的策略版本')).not.toBeInTheDocument()
  expect(sessionStorage.getItem(profileJournalKey('user-1'))).toBe(id)
})
it('requires a complete selection/new version and journals before sending', async () => {
  const view = render(
    <ProfileRegistrationWorkspace owner="user-1" selection={{ profile: selection.profile }} />
  )
  setup()
  expect(screen.getByRole('button', { name: '注册新策略版本' })).toBeDisabled()
  view.rerender(<ProfileRegistrationWorkspace owner="user-1" selection={selection} />)
  fireEvent.change(screen.getByLabelText('新策略版本'), { target: { value: 'v1' } })
  expect(screen.getByRole('button', { name: '注册新策略版本' })).toBeDisabled()
  setup()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage denied')
  })
  fireEvent.click(screen.getByRole('button', { name: '注册新策略版本' }))
  await screen.findByText('无法保存注册命令标识，本次未发送。')
  expect(api.registerProfile).not.toHaveBeenCalled()
})
it('prevents two writes while the first is still running', async () => {
  let finish!: (value: unknown) => void
  ;(api.registerProfile as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  render(<ProfileRegistrationWorkspace owner="user-1" selection={selection} />)
  setup()
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: '注册新策略版本' }))
    fireEvent.click(screen.getByRole('button', { name: '注册新策略版本' }))
  })
  expect(api.registerProfile).toHaveBeenCalledTimes(1)
  await act(async () => {
    finish([null, { data: receipt((api.registerProfile as jest.Mock).mock.calls[0][0]) }])
  })
  await screen.findByText('已注册的策略版本')
})
