import { fireEvent, render, screen } from '@testing-library/react'
import { NativeConfigurationWorkspace } from './NativeConfigurationWorkspace'
import { rootStore } from '@/store'

jest.mock('@/store', () => ({ rootStore: { userStore: { currentUser: { id: '42' } } } }))
jest.mock('mobx-react-lite', () => ({ observer: (component: unknown) => component }))
jest.mock('./AssetCatalogWorkspace', () => ({ AssetCatalogWorkspace: () => null }))
jest.mock('./ProfileRegistrationWorkspace', () => ({ ProfileRegistrationWorkspace: () => null }))
jest.mock('./SuiteRegistrationWorkspace', () => ({ SuiteRegistrationWorkspace: () => null }))
jest.mock('./NativeParticipantWorkspace', () => ({ NativeParticipantWorkspace: () => null }))
jest.mock('./NativeParticipantRetryWorkspace', () => ({ NativeParticipantRetryWorkspace: () => null }))
jest.mock('./NativePublicationWorkspace', () => ({ NativePublicationWorkspace: () => null }))
jest.mock('../product/SolutionHome', () => ({
  SolutionHome: function MockSolutionHome({ onEdit }: any) {
    return <button onClick={() => onEdit({
      profile: { item: { reference: { identity: 'profile', version: 'v6' } } },
      prompt: { identity: 'prompt', version: 'v6' }, route: { identity: 'model', version: 'v8' },
      suite: { identity: 'cases', version: 'v1' }, semantic: { id: 'judge', version: 'v5', fingerprint: 'judge-hash' }
    })}>复制线上方案</button>
  }
}))
jest.mock('./PromptDraftWorkspace', () => ({
  PromptDraftWorkspace: function MockPromptDraft({ onContinue }: any) {
    return <button onClick={() => onContinue({ identity: 'prompt', version: 'v7' })}>冻结并继续</button>
  }
}))
jest.mock('../product/PrepareSolution', () => ({
  PrepareSolution: function MockPrepare({ selection, semantic, onReady }: any) {
    return <button onClick={() => onReady({ suite: { id: 'suite', version: 'v7', fingerprint: 'suite-hash' },
      manifest: { generation_route: selection.route } })}>
      准备 {selection.prompt?.version} {semantic?.version}
    </button>
  }
}))
jest.mock('./NativeEvaluationWorkspace', () => ({
  NativeEvaluationWorkspace: function MockEvaluation({ selection }: any) {
    return <div>测试配置 {selection.suite?.version} {selection.generation_route?.version} {selection.semantic_route?.version}</div>
  }
}))

it('carries the frozen prompt and inherited semantic route through the whole preparation handoff', () => {
  render(<NativeConfigurationWorkspace />)
  fireEvent.click(screen.getByText('复制线上方案'))
  fireEvent.click(screen.getByText('冻结并继续'))
  fireEvent.click(screen.getByText('准备 v7 v5'))
  expect(screen.getByText('测试配置 v7 v8 v5')).toBeInTheDocument()
})
it('does not expose the prior owner selection after an account change', () => {
  const view = render(<NativeConfigurationWorkspace />)
  fireEvent.click(screen.getByText('复制线上方案'))
  fireEvent.click(screen.getByText('冻结并继续'))
  rootStore.userStore.currentUser = { id: '10002' } as any
  view.rerender(<NativeConfigurationWorkspace />)
  expect(screen.getByText('复制线上方案')).toBeInTheDocument()
  expect(screen.queryByText('准备 v7 v5')).not.toBeInTheDocument()
  rootStore.userStore.currentUser = { id: '42' } as any
})
