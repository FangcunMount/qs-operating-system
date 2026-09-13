import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { getAsset, listAssets } from '@/api/path/aiWorkflow'
import { AssetCatalogWorkspace } from './AssetCatalogWorkspace'
jest.mock('@/api/path/aiWorkflow', () => ({ getAsset: jest.fn(), listAssets: jest.fn() }))
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
