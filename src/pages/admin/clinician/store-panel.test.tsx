import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import ClinicianStorePanel from './store-panel'
import { clinicianApi, IClinician } from '@/api/path/clinician'
import { loadEnabledStores, loadStoreOptions, storeApi } from '@/api/path/store'

jest.mock('@/api/path/store', () => ({
  loadEnabledStores: jest.fn(), loadStoreOptions: jest.fn(), storeApi: { history: jest.fn(), assign: jest.fn() }
}))
jest.mock('@/api/path/clinician', () => ({ clinicianApi: { getClinician: jest.fn() } }))
const clinician: IClinician = {
  id: '10', org_id: '7', name: '测试医生', clinician_type: 'doctor', is_active: true,
  assigned_testee_count: 0, assessment_entry_count: 1, version: 2, store_id: '1', store_name: 'A店'
}
beforeEach(() => {
  jest.clearAllMocks()
  Object.defineProperty(window, 'crypto', { configurable: true, value: { getRandomValues: (bytes: Uint8Array) => bytes.fill(7) } })
  ;(storeApi.history as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
  ;(loadStoreOptions as jest.Mock).mockResolvedValue([{ id: '1', name: 'A店' }, { id: '2', name: 'B店' }])
  ;(loadEnabledStores as jest.Mock).mockResolvedValue([{ id: '2', code: 'B', name: 'B店' }])
  ;(clinicianApi.getClinician as jest.Mock).mockResolvedValue([null, { data: clinician }])
  ;(storeApi.assign as jest.Mock).mockResolvedValue([null, { data: { invalidated_count: 1 } }])
})
it('requires an explicit transfer with latest version and warns about permanent QR invalidation', async () => {
  const changed = jest.fn()
  render(<ClinicianStorePanel clinician={clinician} onChanged={changed} />)
  fireEvent.click(screen.getByRole('button', { name: '调整门店' }))
  const select = await screen.findByLabelText('目标门店')
  fireEvent.mouseDown(select)
  fireEvent.click(await screen.findByText('B店（B）'))
  expect(await screen.findByText(/原有二维码将永久失效/)).toHaveTextContent('已有受试者不会随之迁移')
  fireEvent.change(screen.getByLabelText('配置原因'), { target: { value: '服务调整' } })
  fireEvent.click(screen.getByRole('button', { name: '确认调店并使旧码失效' }))
  await waitFor(() => expect(storeApi.assign).toHaveBeenCalledWith('10', expect.objectContaining({
    store_id: '2', expected_version: 2, reason: '服务调整', request_id: expect.any(String)
  })))
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1))
})
it('shows unconfigured for legacy responses and explains preservation of old QR codes', async () => {
  const legacy = { ...clinician, store_id: undefined, store_name: undefined }
  ;(clinicianApi.getClinician as jest.Mock).mockResolvedValue([null, { data: legacy }])
  render(<ClinicianStorePanel clinician={legacy} onChanged={jest.fn()} />)
  expect(screen.getByText('服务门店：未配置')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '配置门店' }))
  expect(await screen.findByText('首次补配门店将保留医生已有二维码。')).toBeInTheDocument()
  expect(storeApi.assign).not.toHaveBeenCalled()
})
it('does not submit on denied configuration loading', async () => {
  (loadEnabledStores as jest.Mock).mockRejectedValue(new Error('没有总部管理权限'))
  render(<ClinicianStorePanel clinician={clinician} onChanged={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: '调整门店' }))
  expect(await screen.findByText('没有总部管理权限')).toBeInTheDocument()
  expect(storeApi.assign).not.toHaveBeenCalled()
})
