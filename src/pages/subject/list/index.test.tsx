import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SubjectList from './index'
import { loadStoreOptions } from '@/api/path/store'
import { clinicianApi } from '@/api/path/clinician'
import { testeeApi } from '@/api/path/subject'
import { identityApi } from '@/api/path/identity'
import { rootStore } from '@/store'

jest.mock('@/store', () => ({ rootStore: { userStore: { accessContext: { capabilities: new Set() } } } }))
jest.mock('@/api/path/subject', () => ({ testeeApi: { listTestees: jest.fn() } }))
jest.mock('@/api/path/identity', () => ({ identityApi: { suggestChild: jest.fn() } }))
jest.mock('@/api/path/store', () => ({ loadStoreOptions: jest.fn().mockResolvedValue([]) }))
jest.mock('@/api/path/clinician', () => ({ clinicianApi: { listClinicians: jest.fn().mockResolvedValue([null, { data: { items: [] } }]) } }))
jest.mock('../detail/components/StoreOwnershipPanel', () => function MockOwnership() { return <div>配置</div> })
jest.mock('@/components/lazyTable', () => ({ LazyTable: function MockTable({ dataSource }: any) { return <div>
  {dataSource.map((row: any) => <span key={row.id}>{row.name} {row.id}</span>)}
</div> } }))
beforeEach(() => {
  jest.clearAllMocks()
  ;(loadStoreOptions as jest.Mock).mockResolvedValue([])
  ;(clinicianApi.listClinicians as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
  rootStore.userStore.accessContext.capabilities.clear()
  ;(testeeApi.listTestees as jest.Mock).mockResolvedValue([null, { data: { items: [], total: 0 } }])
  ;(identityApi.suggestChild as jest.Mock).mockResolvedValue([null, { data: [] }])
})
it('headquarters searches names and explicitly switches to unassigned inventory without losing the search', async () => {
  rootStore.userStore.accessContext.capabilities.add('org_admin')
  ;(testeeApi.listTestees as jest.Mock).mockImplementation(async (query) => [null, { data: query.unassigned_store
    ? { items: [{ id: '632367179051840046', name: '舒杰', store_id: null }], total: 1 }
    : { items: [], total: 0 } }])
  render(<MemoryRouter><SubjectList /></MemoryRouter>)
  const input = screen.getByPlaceholderText('搜索姓名 / 档案ID / 手机号')
  fireEvent.change(input, { target: { value: '舒杰' } })
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })
  expect(await screen.findByText('找到 1 位未归属门店的受试者')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '查看未归属清单' }))
  expect(await screen.findByText('舒杰 632367179051840046')).toBeInTheDocument()
  expect(testeeApi.listTestees).toHaveBeenLastCalledWith(expect.objectContaining({ name: '舒杰', unassigned_store: true, page: 1 }))
})
it('store search stays in its authorized QS list without querying global profiles or unassigned inventory', async () => {
  render(<MemoryRouter><SubjectList /></MemoryRouter>)
  const input = screen.getByPlaceholderText('搜索本范围内受试者姓名')
  fireEvent.change(input, { target: { value: '测试' } })
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })
  await waitFor(() => expect(testeeApi.listTestees).toHaveBeenLastCalledWith(expect.objectContaining({ name: '测试' })))
  expect(identityApi.suggestChild).not.toHaveBeenCalled()
  expect((testeeApi.listTestees as jest.Mock).mock.calls.every(([query]) => !query.unassigned_store)).toBe(true)
})
it('selecting a suggested profile preserves its string ID when checking unassigned matches', async () => {
  rootStore.userStore.accessContext.capabilities.add('org_admin')
  ;(identityApi.suggestChild as jest.Mock).mockResolvedValue([null, { data: [{ id: '632367179001508398', name: '匹配档案' }] }])
  render(<MemoryRouter><SubjectList /></MemoryRouter>)
  const input = screen.getByPlaceholderText('搜索姓名 / 档案ID / 手机号')
  fireEvent.focus(input)
  fireEvent.change(input, { target: { value: '匹配' } })
  fireEvent.click(await screen.findByText('匹配档案', { selector: 'span' }))
  await waitFor(() => expect(testeeApi.listTestees).toHaveBeenLastCalledWith(expect.objectContaining({
    profile_id: '632367179001508398', name: undefined, unassigned_store: true
  })))
})
