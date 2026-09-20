import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PrepareSolution } from './PrepareSolution'
import { useProfileRegistration } from '../native/useProfileRegistration'
import { useSuiteRegistration } from '../native/useSuiteRegistration'
jest.mock('../native/useProfileRegistration')
jest.mock('../native/useSuiteRegistration')
const ref = (identity: string, version = 'v2') => ({ identity, version, fingerprint: 'sha256:' + 'a'.repeat(64), content_sha256: 'b'.repeat(64) })
const selection = { profile: { item: { kind: 'profile' as const, reference: ref('profile', 'v1') },
  definition_json: JSON.stringify({ profile_id: 'profile', version: 'v1', generation_policy: {}, safety_policy: { unchanged: true } }) },
prompt: ref('prompt'), route: ref('route') }
const semantic = { id: 'judge', version: 'v1', fingerprint: 'sha256:' + 'a'.repeat(64) }
const makeController = () => ({ pending: null, receipt: null, error: '', busy: false, locked: false, submit: jest.fn(), reconcile: jest.fn() })
it('registers no configuration until explicit intent and preserves source policy', () => {
  const profile = makeController(), suite = makeController()
  ;(useProfileRegistration as jest.Mock).mockReturnValue(profile)
  ;(useSuiteRegistration as jest.Mock).mockReturnValue(suite)
  render(<PrepareSolution owner="42" selection={selection} semantic={semantic} onReady={jest.fn()} />)
  expect(profile.submit).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('准备测试理由'), { target: { value: '调整说明后完整评测' } })
  fireEvent.click(screen.getByText('确认方案并准备测试'))
  expect(JSON.parse(profile.submit.mock.calls[0][0].definition_json).safety_policy).toEqual({ unchanged: true })
  expect(suite.submit).not.toHaveBeenCalled()
})
it('only binds the suite after a matching profile receipt, and does not duplicate it on rerender', async () => {
  const profile = makeController(), suite = makeController()
  ;(useProfileRegistration as jest.Mock).mockReturnValue(profile)
  ;(useSuiteRegistration as jest.Mock).mockReturnValue(suite)
  const props = { owner: '42', selection, semantic, onReady: jest.fn() }
  const view = render(<PrepareSolution {...props} />)
  fireEvent.change(screen.getByLabelText('准备测试理由'), { target: { value: '完整评测' } })
  fireEvent.click(screen.getByText('确认方案并准备测试'))
  const receipt = { command: { command_id: 'command', source: selection.profile.item.reference, reason: '完整评测' },
    manifest: { profile: ref('profile'), prompt: selection.prompt, generation_route: selection.route } }
  ;(useProfileRegistration as jest.Mock).mockReturnValue({ ...profile, receipt })
  view.rerender(<PrepareSolution {...props} />)
  await waitFor(() => expect(suite.submit).toHaveBeenCalledTimes(1))
  view.rerender(<PrepareSolution {...props} />)
  expect(suite.submit).toHaveBeenCalledTimes(1)
})
it('does not proceed with an unrelated recovered receipt', () => {
  const profile = makeController(), suite = makeController()
  ;(useProfileRegistration as jest.Mock).mockReturnValue({ ...profile, receipt: {
    command: { source: ref('other') }, manifest: { profile: ref('other'), prompt: ref('prompt'), generation_route: ref('route') }
  } })
  ;(useSuiteRegistration as jest.Mock).mockReturnValue(suite)
  render(<PrepareSolution owner="42" selection={selection} semantic={semantic} onReady={jest.fn()} />)
  expect(suite.submit).not.toHaveBeenCalled()
})
