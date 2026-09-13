import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getAsset, listAssets, getProfileLifecycle, listProfileLifecycles } from '@/api/path/aiWorkflow'
import { AssetCatalogWorkspace } from './AssetCatalogWorkspace'
jest.mock('@/api/path/aiWorkflow', () => ({
  getAsset: jest.fn(), listAssets: jest.fn(), getProfileLifecycle: jest.fn(), listProfileLifecycles: jest.fn()
}))
const item = (version: string) => ({
  kind: 'prompt',
  reference: {
    identity: 'prompt/中文',
    version,
    fingerprint: `sha256:${version}`,
    content_sha256: version
  }
})
const ok = (data: any) => Promise.resolve([null, { data }])
beforeEach(() => jest.clearAllMocks())
it('selects generation and semantic routes separately from the loaded asset', async () => {
  const routeItem = { ...item('v2'), kind: 'route' as const }
  const detail = { item: routeItem, definition_json: '{}' }
  ;(listAssets as jest.Mock).mockReturnValue(ok({ items: [routeItem], next_cursor: '' }))
  ;(getAsset as jest.Mock).mockReturnValue(ok(detail))
  const select = jest.fn()
  render(<AssetCatalogWorkspace onDraft={jest.fn()} onEvaluationAsset={select} />)
  expect(screen.queryByText('用于语义评测')).not.toBeInTheDocument()
  fireEvent.click(await screen.findByText('查看正文'))
  fireEvent.click(await screen.findByText('用于评测生成'))
  fireEvent.click(screen.getByText('用于语义评测'))
  expect(select.mock.calls).toEqual([
    ['generation_route', routeItem.reference],
    ['semantic_route', routeItem.reference]
  ])
})
it('shows unknown on denied catalog without implying an empty usable inventory', async () => {
  (listAssets as jest.Mock).mockReturnValue(Promise.resolve([{ status: 403 }, undefined]))
  render(<AssetCatalogWorkspace onDraft={jest.fn()} />)
  await screen.findByText('目录状态未知')
  expect(screen.queryByText('从此版本新建草稿')).not.toBeInTheDocument()
})
it('pages versions and ignores a stale detail after another version is selected', async () => {
  (listAssets as jest.Mock)
    .mockReturnValueOnce(ok({ items: [item('v1')], next_cursor: 'next' }))
    .mockReturnValueOnce(ok({ items: [item('v2')], next_cursor: '' }))
  let finish!: (value: any) => void
  ;(getAsset as jest.Mock)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    .mockReturnValueOnce(ok({ item: item('v2'), definition_json: '新版正文' }))
  const select = jest.fn()
  render(<AssetCatalogWorkspace onDraft={select} />)
  fireEvent.click(await screen.findByText('加载更多版本'))
  await screen.findByText('v2')
  expect(listAssets).toHaveBeenLastCalledWith('prompt', '', 'next')
  fireEvent.click(screen.getAllByText('查看正文')[0])
  fireEvent.click(screen.getAllByText('查看正文')[1])
  await screen.findByText('新版正文')
  await act(async () => {
    finish([null, { data: { item: item('v1'), definition_json: '过期正文' } }])
  })
  expect(screen.queryByText('过期正文')).not.toBeInTheDocument()
  fireEvent.click(screen.getByText('从此版本新建草稿'))
  expect(select).toHaveBeenCalledWith(item('v2').reference)
})
it('discards an earlier page when a new exact search finishes first', async () => {
  let finish!: (value: any) => void
  ;(listAssets as jest.Mock)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve
      })
    )
    .mockReturnValueOnce(ok({ items: [item('v2')], next_cursor: '' }))
  render(<AssetCatalogWorkspace onDraft={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('精确配置标识'), { target: { value: 'prompt/中文' } })
  fireEvent.click(screen.getByRole('button', { name: /查\s*询/ }))
  await screen.findByText('v2')
  await act(async () => {
    finish([null, { data: { items: [item('v1')], next_cursor: '' } }])
  })
  await waitFor(() => expect(screen.queryByText('v1')).not.toBeInTheDocument())
})
it('passes only a loaded matching asset detail to Profile registration', async () => {
  const detail = { item: item('v2'), definition_json: '模板正文' }
  ;(listAssets as jest.Mock).mockReturnValue(ok({ items: [item('v2')], next_cursor: '' }))
  ;(getAsset as jest.Mock).mockReturnValue(ok(detail))
  const draft = jest.fn()
  const register = jest.fn()
  render(<AssetCatalogWorkspace onDraft={draft} onRegisterAsset={register} />)
  expect(screen.queryByText('用于注册策略版本')).not.toBeInTheDocument()
  fireEvent.click(await screen.findByText('查看正文'))
  fireEvent.click(await screen.findByText('用于注册策略版本'))
  expect(register).toHaveBeenCalledWith(detail)
  expect(draft).not.toHaveBeenCalled()
})
it('passes the displayed suite detail without triggering another registration flow', async () => {
  const suiteItem = { ...item('v2'), kind: 'suite' as const }
  const detail = { item: suiteItem, definition_json: '{"cases":[]}' }
  ;(listAssets as jest.Mock).mockReturnValue(ok({ items: [suiteItem], next_cursor: '' }))
  ;(getAsset as jest.Mock).mockReturnValue(ok(detail))
  const draft = jest.fn()
  const register = jest.fn()
  const suite = jest.fn()
  render(<AssetCatalogWorkspace onDraft={draft} onRegisterAsset={register} onSuiteAsset={suite} />)
  expect(screen.queryByText('用于绑定评测套件')).not.toBeInTheDocument()
  fireEvent.click(await screen.findByText('查看正文'))
  fireEvent.click(await screen.findByText('用于绑定评测套件'))
  expect(suite).toHaveBeenCalledWith(detail)
  expect(register).not.toHaveBeenCalled()
  expect(draft).not.toHaveBeenCalled()
})

const profile = {
  reference: item('v6').reference, status: 'draft', source_ref: 'qs-server:baseline',
  imported_at: '2026-09-13T00:00:00Z', active_publication_id: '', active_run_id: '',
  selector_version: 0, selector_changed_at: '', inactive_reason: ''
}
const chooseProfiles = async () => {
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '配置种类' }))
  fireEvent.click(await screen.findByText('解读策略'))
}
it('shows imported Profile as unpublished and resets pagination when status changes', async () => {
  (listAssets as jest.Mock).mockReturnValue(ok({ items: [], next_cursor: '' }))
  ;(listProfileLifecycles as jest.Mock)
    .mockReturnValueOnce(ok({ items: [profile], next_cursor: 'draft-next' }))
    .mockReturnValueOnce(ok({ items: [], next_cursor: '' }))
  render(<AssetCatalogWorkspace onDraft={jest.fn()} />)
  await chooseProfiles()
  await screen.findByText('qs-server:baseline')
  expect(screen.getByText('未在 qs-ai 发布')).toBeInTheDocument()
  expect(screen.getByText('加载更多版本')).toBeInTheDocument()
  fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Profile 发布状态' }))
  fireEvent.click(await screen.findByText('当前已发布'))
  await waitFor(() => expect(listProfileLifecycles).toHaveBeenLastCalledWith('', 'published', ''))
  expect(screen.queryByText('加载更多版本')).not.toBeInTheDocument()
  expect(screen.queryByText('qs-server:baseline')).not.toBeInTheDocument()
})
it('rejects Profile state from another immutable version before allowing configuration actions', async () => {
  (listAssets as jest.Mock).mockReturnValue(ok({ items: [], next_cursor: '' }))
  ;(listProfileLifecycles as jest.Mock).mockReturnValue(ok({ items: [profile], next_cursor: '' }))
  ;(getAsset as jest.Mock).mockReturnValue(ok({ item: { kind: 'profile', reference: profile.reference }, definition_json: '完整策略正文' }))
  ;(getProfileLifecycle as jest.Mock).mockReturnValue(ok({ ...profile, reference: item('v5').reference }))
  render(<AssetCatalogWorkspace onDraft={jest.fn()} onRegisterAsset={jest.fn()} />)
  await chooseProfiles()
  fireEvent.click(await screen.findByText('查看正文'))
  await screen.findByText('版本引用已变化，请刷新目录后重试。')
  expect(screen.queryByText('用于注册策略版本')).not.toBeInTheDocument()
  expect(screen.queryByText('完整策略正文')).not.toBeInTheDocument()
})
it('clears Profile metadata and body when authority is denied on a later page', async () => {
  (listAssets as jest.Mock).mockReturnValue(ok({ items: [], next_cursor: '' }))
  ;(listProfileLifecycles as jest.Mock)
    .mockReturnValueOnce(ok({ items: [profile], next_cursor: 'next' }))
    .mockReturnValueOnce(Promise.resolve([{ status: 403 }, undefined]))
  ;(getAsset as jest.Mock).mockReturnValue(ok({ item: { kind: 'profile', reference: profile.reference }, definition_json: '完整策略正文' }))
  ;(getProfileLifecycle as jest.Mock).mockReturnValue(ok(profile))
  render(<AssetCatalogWorkspace onDraft={jest.fn()} onRegisterAsset={jest.fn()} />)
  await chooseProfiles()
  fireEvent.click(await screen.findByText('查看正文'))
  await screen.findByText('完整策略正文')
  expect(screen.getByText('当前状态：未在 qs-ai 发布')).toBeInTheDocument()
  fireEvent.click(screen.getByText('加载更多版本'))
  await screen.findByText('目录状态未知')
  expect(listProfileLifecycles).toHaveBeenLastCalledWith('', '', 'next')
  expect(screen.queryByText('qs-server:baseline')).not.toBeInTheDocument()
  expect(screen.queryByText('完整策略正文')).not.toBeInTheDocument()
  expect(screen.queryByText('用于注册策略版本')).not.toBeInTheDocument()
})
