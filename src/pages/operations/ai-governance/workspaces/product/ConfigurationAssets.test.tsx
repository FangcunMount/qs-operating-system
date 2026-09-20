import { fireEvent, render, screen } from '@testing-library/react'
import { ConfigurationAssets } from './ConfigurationAssets'
jest.mock('../native/AssetCatalogWorkspace', () => ({
  AssetCatalogWorkspace: function Catalog({ onEvaluationAsset, onDraft }: any) {
    return <><button onClick={() => onEvaluationAsset('semantic_route', { identity: 'judge', version: 'v5', fingerprint: 'hash' })}>选择裁判路线</button>
      <button onClick={() => onDraft({ identity: 'prompt', version: 'v6' })}>修改模板</button></>
  }
}))
jest.mock('../native/PromptDraftWorkspace', () => ({
  PromptDraftWorkspace: function Draft({ source, onContinue }: any) {
    return <button onClick={() => onContinue({ ...source, version: 'v7' })}>冻结模板 {source?.version}</button>
  }
}))
jest.mock('./PrepareSolution', () => ({
  PrepareSolution: function Prepare({ selection, semantic, onReady }: any) {
    return <button onClick={() => onReady({ suite: { id: 'suite', version: 'v7', fingerprint: 'suite-hash' }, manifest: {
      generation_route: { identity: 'generator', version: 'v8', fingerprint: 'model-hash' }
    } })}>准备 {selection.prompt?.version} {semantic?.version}</button>
  }
}))
jest.mock('../native/ProfileRegistrationWorkspace', () => ({ ProfileRegistrationWorkspace: () => null }))
jest.mock('../native/SuiteRegistrationWorkspace', () => ({ SuiteRegistrationWorkspace: () => null }))
it('hands exact frozen references to the single evaluation workspace', () => {
  const next = jest.fn()
  render(<ConfigurationAssets owner="42" onEvaluate={next} />)
  fireEvent.click(screen.getByText('选择裁判路线'))
  fireEvent.click(screen.getByText('修改模板'))
  fireEvent.click(screen.getByText('冻结模板 v6'))
  fireEvent.click(screen.getByText('准备 v7 v5'))
  expect(next).toHaveBeenCalledWith({
    suite: { id: 'suite', version: 'v7', fingerprint: 'suite-hash' },
    generation_route: { id: 'generator', version: 'v8', fingerprint: 'model-hash' },
    semantic_route: { id: 'judge', version: 'v5', fingerprint: 'hash' }
  })
  expect(screen.queryByText('人工审核')).not.toBeInTheDocument()
  expect(screen.queryByText('发布与回退')).not.toBeInTheDocument()
})
