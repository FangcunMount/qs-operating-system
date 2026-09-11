import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import StoreOwnershipPanel from './StoreOwnershipPanel'
import { loadStoreOptions } from '@/api/path/store'
import { testeeStoreApi } from '@/api/path/testeeStore'

jest.mock('@/api/path/store', () => ({ loadStoreOptions: jest.fn() }))
jest.mock('@/api/path/testeeStore', () => ({ testeeStoreApi: {
  get: jest.fn(), history: jest.fn(), assign: jest.fn(), transfer: jest.fn()
} }))
beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'crypto', { configurable: true, value: { getRandomValues: (v: Uint8Array) => v.fill(1) } })
  ;(loadStoreOptions as jest.Mock).mockResolvedValue([
    { id: '1', code: 'A', name: 'A店', is_active: true },
    { id: '2', code: 'B', name: 'B店', is_active: true },
    { id: '3', code: 'C', name: '停用店', is_active: false }
  ])
  ;(testeeStoreApi.get as jest.Mock).mockResolvedValue([null, { data: { id: '10', store_id: null, store_version: 1 } }])
  ;(testeeStoreApi.history as jest.Mock).mockResolvedValue([null, { data: [] }])
  ;(testeeStoreApi.assign as jest.Mock).mockResolvedValue([null, { data: { id: '100', version: 2 } }])
  ;(testeeStoreApi.transfer as jest.Mock).mockResolvedValue([null, { data: { id: '101', version: 3 } }])
})
async function begin(label: string) {
  const name = new RegExp(label.split('').join('\\s*'))
  await waitFor(() => expect(screen.getByRole('button', { name })).not.toBeDisabled())
  fireEvent.click(screen.getByRole('button', { name }))
  fireEvent.mouseDown(await screen.findByLabelText('目标门店'))
  fireEvent.click(await screen.findByText('B店（B）'))
  fireEvent.change(screen.getByLabelText('原因'), { target: { value: '服务安排调整' } })
}
it('initial ownership uses its own endpoint and preserves the request ID', async () => {
  render(<StoreOwnershipPanel testeeId="10" />)
  await begin('首次配置')
  fireEvent.click(screen.getByRole('button', { name: /确.*定|OK/ }))
  await waitFor(() => expect(testeeStoreApi.assign).toHaveBeenCalledWith('10', expect.objectContaining({
    store_id: '2', expected_version: 1, reason: '服务安排调整', request_id: expect.any(String)
  })))
  expect(testeeStoreApi.transfer).not.toHaveBeenCalled()
})
it('uses an explicit transfer and excludes current and inactive stores', async () => {
  (testeeStoreApi.get as jest.Mock).mockResolvedValue([null, { data: { id: '10', store_id: '1', store_version: 2 } }])
  render(<StoreOwnershipPanel testeeId="10" />)
  await begin('转店')
  expect(screen.queryByText('A店（A）')).not.toBeInTheDocument()
  expect(screen.queryByText('停用店（C）')).not.toBeInTheDocument()
  expect(screen.getAllByText(/保留完整测评历史/).length).toBeGreaterThan(0)
  fireEvent.click(screen.getByRole('button', { name: /确.*定|OK/ }))
  await waitFor(() => expect(testeeStoreApi.transfer).toHaveBeenCalledWith('10', expect.objectContaining({ expected_version: 2 })))
  expect(testeeStoreApi.assign).not.toHaveBeenCalled()
})
it('does not submit when ownership cannot be read', async () => {
  (testeeStoreApi.get as jest.Mock).mockResolvedValue([new Error('权限不足'), null])
  render(<StoreOwnershipPanel testeeId="10" />)
  expect(await screen.findByText('权限不足')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '首次配置' })).toBeDisabled()
  expect(testeeStoreApi.assign).not.toHaveBeenCalled()
})
it('keeps a conflict visible without automatic retry or overwriting the version', async () => {
  (testeeStoreApi.assign as jest.Mock).mockResolvedValue([new Error('归属已变化，请刷新'), null])
  render(<StoreOwnershipPanel testeeId="10" />)
  await begin('首次配置')
  fireEvent.click(screen.getByRole('button', { name: /确.*定|OK/ }))
  expect(await screen.findByText('归属已变化，请刷新')).toBeInTheDocument()
  expect(testeeStoreApi.assign).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('原因')).toHaveValue('服务安排调整')
})
