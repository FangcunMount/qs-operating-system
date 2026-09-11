import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ClinicianManager, { loadClinicians } from './clinician-manager'
import { clinicianApi } from '@/api/path/clinician'
import { IStore, storeApi } from '@/api/path/store'
jest.mock('@/api/path/clinician', () => ({ clinicianApi: { listClinicians: jest.fn() } }))
jest.mock('@/api/path/store', () => ({ storeApi: { assign: jest.fn() } }))
const store = { id: '2', name: 'B店', code: 'B', is_active: true } as IStore
const doctors = [
  { id: '11', name: '未配置医生', version: 3, is_active: true },
  { id: '12', name: '调店医生', version: 5, store_id: '1', store_name: 'A店', is_active: false },
  { id: '13', name: '已有医生', version: 2, store_id: '2', store_name: 'B店', is_active: true }
]
beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'crypto', { configurable: true, value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(9) } })
  ;(clinicianApi.listClinicians as jest.Mock).mockResolvedValue([null, { data: { items: doctors, total: 3 } }])
  ;(storeApi.assign as jest.Mock).mockResolvedValue([null, { data: { invalidated_count: 0 } }])
})
const open = (target = store) => render(<MemoryRouter><ClinicianManager store={target} onClose={jest.fn()} onChanged={jest.fn()} /></MemoryRouter>)
it('previews initial and transfer assignments, preserves versions and reports partial failure', async () => {
  (storeApi.assign as jest.Mock).mockResolvedValueOnce([null, { data: { invalidated_count: 0 } }])
    .mockResolvedValueOnce([new Error('配置冲突，请刷新'), null])
  open()
  await screen.findByText('未配置医生')
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  fireEvent.click(screen.getByText('从其他门店调入'))
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  fireEvent.click(screen.getByRole('button', { name: '预览变更（2 人）' }))
  expect(screen.getByText(/首次配置 1 人，调店 1 人/)).toBeInTheDocument()
  expect(screen.getByText(/已有受试者、测评和计划不会随医生迁移/)).toBeInTheDocument()
  expect(storeApi.assign).not.toHaveBeenCalled()
  const confirm = screen.getByRole('button', { name: '确认批量调入并使旧码失效' })
  expect(confirm).toBeDisabled()
  fireEvent.change(screen.getByLabelText('配置原因（本次每位医生均记录）'), { target: { value: '总部整理' } })
  fireEvent.click(confirm)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/成功 1 人，\s*未确认成功 1 人/))
  expect(storeApi.assign).toHaveBeenNthCalledWith(1, '11', expect.objectContaining({ store_id: '2', expected_version: 3, reason: '总部整理' }))
  expect(storeApi.assign).toHaveBeenNthCalledWith(2, '12', expect.objectContaining({ expected_version: 5 }))
  expect(screen.getByText('配置冲突，请刷新')).toBeInTheDocument()
})
it('disables current members and all assignments to an inactive store', async () => {
  open({ ...store, is_active: false })
  await screen.findByText('未配置医生')
  expect(screen.getAllByRole('checkbox')[1]).toBeDisabled()
  fireEvent.click(screen.getByText('本门店医生'))
  expect(screen.getByText('已有医生')).toBeInTheDocument()
  expect(screen.getAllByRole('checkbox')[1]).toBeDisabled()
  expect(storeApi.assign).not.toHaveBeenCalled()
})
it('loads every page and refuses an incomplete list', async () => {
  (clinicianApi.listClinicians as jest.Mock).mockResolvedValueOnce([null, { data: { items: [doctors[0]], total: 2 } }])
    .mockResolvedValueOnce([null, { data: { items: [doctors[1]], total: 2 } }])
  expect(await loadClinicians()).toHaveLength(2)
  expect(clinicianApi.listClinicians).toHaveBeenLastCalledWith({ page: 2, page_size: 100 })
  ;(clinicianApi.listClinicians as jest.Mock).mockResolvedValueOnce([null, { data: { items: [], total: 2 } }])
  await expect(loadClinicians()).rejects.toThrow('医生列表不完整')
})
