import { render, screen, waitFor } from '@testing-library/react'
import ClinicianRelationsTab from './ClinicianRelationsTab'
import { clinicianApi } from '@/api/path/clinician'
import { rootStore } from '@/store'

jest.mock('@/store', () => ({ rootStore: { userStore: { accessContext: { capabilities: new Set() } } } }))
jest.mock('@/api/path/clinician', () => ({ clinicianApi: {
  listTesteeClinicianRelations: jest.fn(), listClinicians: jest.fn()
} }))
beforeEach(() => {
  jest.clearAllMocks()
  rootStore.userStore.accessContext.capabilities.clear()
  ;(clinicianApi.listTesteeClinicianRelations as jest.Mock).mockResolvedValue([null, { data: { items: [{
    relation: { id: '1', is_active: true }, clinician: { id: '2', name: '关系医生' }
  }] } }])
  ;(clinicianApi.listClinicians as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
})
it('store users can read relations without requesting the administrator catalogue', async () => {
  render(<ClinicianRelationsTab testeeId="636809251561419310" />)
  expect((await screen.findAllByText('关系医生')).length).toBeGreaterThan(0)
  expect(clinicianApi.listClinicians).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: '分配临床人员' })).not.toBeInTheDocument()
  expect(screen.queryByText('解绑')).not.toBeInTheDocument()
})
it('headquarters retains catalogue and relationship management', async () => {
  rootStore.userStore.accessContext.capabilities.add('org_admin')
  render(<ClinicianRelationsTab testeeId="10" />)
  await waitFor(() => expect(clinicianApi.listClinicians).toHaveBeenCalledTimes(1))
  expect(screen.getByRole('button', { name: '分配临床人员' })).toBeInTheDocument()
})
