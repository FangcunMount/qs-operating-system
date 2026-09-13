import { act, fireEvent, render, screen } from '@testing-library/react'
import * as api from '@/api/path/aiWorkflow'
import * as commands from './commands'
import { SuiteRegistrationWorkspace } from './SuiteRegistrationWorkspace'
import { publishedCaseSource } from './suiteRegistration'
import { suiteJournalKey } from './useSuiteRegistration'

jest.mock('@/api/path/aiWorkflow', () => ({ registerSuite: jest.fn(), getSuiteReceipt: jest.fn() }))
const id = '33333333-3333-4333-8333-333333333333'
const ref = (identity: string) => ({
  identity,
  version: 'v2',
  fingerprint: 'sha256:' + 'a'.repeat(64),
  content_sha256: 'b'.repeat(64)
})
const selection = {
  suite: {
    ...ref(publishedCaseSource.id),
    version: publishedCaseSource.version,
    fingerprint: publishedCaseSource.fingerprint
  },
  profile: ref('profile'),
  prompt: ref('prompt'),
  route: ref('route')
}
const receipt = (command: api.RegisterSuite): api.SuiteRegistrationReceipt => ({
  command,
  suite: {
    id: command.suite_id,
    version: command.suite_version,
    fingerprint: 'sha256:' + 'c'.repeat(64)
  },
  manifest: {
    profile: command.profile,
    prompt: command.prompt,
    generation_route: command.generation_route,
    input_schema: ref('input'),
    output_schema: ref('output')
  },
  registered_at: '2026-09-13T00:00:00Z'
})
const fill = () => {
  fireEvent.change(screen.getByLabelText('新套件标识'), { target: { value: 'native-suite' } })
  fireEvent.change(screen.getByLabelText('新套件版本'), { target: { value: 'v2' } })
  fireEvent.change(screen.getByLabelText('套件注册理由'), { target: { value: '评测新策略版本' } })
}
beforeEach(() => {
  jest.clearAllMocks()
  sessionStorage.clear()
  jest.spyOn(commands, 'newCommandID').mockReturnValue(id)
  ;(api.registerSuite as jest.Mock).mockImplementation((command) =>
    Promise.resolve([null, { data: receipt(command) }])
  )
})
afterEach(() => jest.restoreAllMocks())
it('registers only the confirmed baseline and exact selected asset bindings without approval reuse', async () => {
  render(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
  fill()
  fireEvent.click(screen.getByRole('button', { name: '注册评测套件' }))
  await screen.findByText('已注册的评测套件')
  expect(api.registerSuite).toHaveBeenCalledWith({
    source: publishedCaseSource,
    suite_id: 'native-suite',
    suite_version: 'v2',
    profile: selection.profile,
    prompt: selection.prompt,
    generation_route: selection.route,
    command_id: id,
    reason: '评测新策略版本'
  })
  expect(
    screen.getByText('案例绑定已保存。下一步需要执行独立评测和审核，当前尚未发布。')
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '注册评测套件' })).toBeDisabled()
  expect(sessionStorage.getItem(suiteJournalKey('u1'))).toBeNull()
})
it.each([409, 504])(
  'keeps %s locked across reload and queries only the original receipt',
  async (status) => {
    (api.registerSuite as jest.Mock).mockResolvedValue([{ status }, undefined])
    const view = render(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: '注册评测套件' }))
    await screen.findByText('注册结果尚未确认，请查询原命令回执。')
    expect(sessionStorage.getItem(suiteJournalKey('u1'))).toBe(id)
    const sent = (api.registerSuite as jest.Mock).mock.calls[0][0]
    view.unmount()
    ;(api.getSuiteReceipt as jest.Mock).mockResolvedValue([null, { data: receipt(sent) }])
    render(<SuiteRegistrationWorkspace owner="u1" selection={{}} />)
    fireEvent.click(screen.getByText('查询套件注册回执'))
    await screen.findByText('已注册的评测套件')
    expect(api.getSuiteReceipt).toHaveBeenCalledWith(id)
    expect(api.registerSuite).toHaveBeenCalledTimes(1)
  }
)
it('keeps missing receipts locked and does not inherit another owner journal', async () => {
  sessionStorage.setItem(suiteJournalKey('u1'), id)
  ;(api.getSuiteReceipt as jest.Mock).mockResolvedValue([{ status: 404 }, undefined])
  const view = render(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
  fireEvent.click(screen.getByText('查询套件注册回执'))
  await screen.findByText('尚未取得注册回执，原命令继续保留；请稍后再查。')
  expect(screen.getByRole('button', { name: '注册评测套件' })).toBeDisabled()
  expect(sessionStorage.getItem(suiteJournalKey('u1'))).toBe(id)
  view.unmount()
  render(<SuiteRegistrationWorkspace owner="u2" selection={selection} />)
  fill()
  expect(screen.getByRole('button', { name: '注册评测套件' })).toBeEnabled()
})
it.each(['target', 'source', 'binding', 'schema', 'command'])(
  'does not accept a mismatched %s receipt',
  async (field) => {
    (api.registerSuite as jest.Mock).mockImplementation((command) => {
      const value = JSON.parse(JSON.stringify(receipt(command)))
      if (field === 'target') value.suite.version = 'wrong'
      if (field === 'source') value.command.source.fingerprint = 'sha256:' + 'd'.repeat(64)
      if (field === 'binding') value.manifest.profile.version = 'wrong'
      if (field === 'schema') delete value.manifest.input_schema
      if (field === 'command') value.command.reason = 'not submitted'
      return Promise.resolve([null, { data: value }])
    })
    render(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: '注册评测套件' }))
    await screen.findByText('注册结果尚未确认，请查询原命令回执。')
    expect(screen.queryByText('已注册的评测套件')).not.toBeInTheDocument()
    expect(sessionStorage.getItem(suiteJournalKey('u1'))).toBe(id)
  }
)
it('rejects unsupported sources, incomplete bindings and reuse of the source version before sending', () => {
  const view = render(
    <SuiteRegistrationWorkspace
      owner="u1"
      selection={{ ...selection, suite: ref('unsupported') }}
    />
  )
  fill()
  expect(
    screen.getByText('此套件当前不能作为复用来源，请从目录选择上述发布输入案例版本。')
  ).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '注册评测套件' })).toBeDisabled()
  view.rerender(
    <SuiteRegistrationWorkspace owner="u1" selection={{ ...selection, route: undefined }} />
  )
  fill()
  expect(screen.getByRole('button', { name: '注册评测套件' })).toBeDisabled()
  view.rerender(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
  fireEvent.change(screen.getByLabelText('新套件标识'), {
    target: { value: publishedCaseSource.id }
  })
  fireEvent.change(screen.getByLabelText('新套件版本'), {
    target: { value: publishedCaseSource.version }
  })
  expect(screen.getByRole('button', { name: '注册评测套件' })).toBeDisabled()
  expect(api.registerSuite).not.toHaveBeenCalled()
})
it('does not send when command journaling fails', async () => {
  render(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
  fill()
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('storage denied')
  })
  fireEvent.click(screen.getByRole('button', { name: '注册评测套件' }))
  await screen.findByText('无法保存注册命令标识，本次未发送。')
  expect(api.registerSuite).not.toHaveBeenCalled()
})
it('does not send a second registration while the first request is running', async () => {
  let finish!: (value: unknown) => void
  ;(api.registerSuite as jest.Mock).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    })
  )
  render(<SuiteRegistrationWorkspace owner="u1" selection={selection} />)
  fill()
  act(() => {
    fireEvent.click(screen.getByRole('button', { name: '注册评测套件' }))
    fireEvent.click(screen.getByRole('button', { name: '注册评测套件' }))
  })
  expect(api.registerSuite).toHaveBeenCalledTimes(1)
  await act(async () => {
    finish([null, { data: receipt((api.registerSuite as jest.Mock).mock.calls[0][0]) }])
  })
  await screen.findByText('已注册的评测套件')
})
