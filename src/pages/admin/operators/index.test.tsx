import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import OperatorManagement from './index'
import { rootStore } from '@/store'

jest.mock('mobx-react-lite', () => ({ observer: (component: unknown) => component }))
jest.mock('@/store', () => ({ rootStore: {
  operatorStore: { operatorList: [], loading: false, pageInfo: { current: 1, pageSize: 20, total: 1 },
    fetchOperatorList: jest.fn(), updateOperator: jest.fn(), createOperator: jest.fn() },
  authStore: { fetchRoleList: jest.fn() }
} }))
jest.mock('./scope', () => () => null)
jest.mock('./retirement', () => () => null)

it.each([{ roles: [] }, { roles: ['qs:assessment_operator'] }])('edits only profile fields with $roles', async ({ roles }) => {
  Object.assign(rootStore.operatorStore, {
    operatorList: [{ id: '636880423783248430', user_id: '17', name: '测试运营员', roles, is_active: true, authz_policy_version: 12 }]
  })
  ;(rootStore.operatorStore.updateOperator as jest.Mock).mockResolvedValue(true)
  render(<OperatorManagement />)
  fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }))
  fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '更新姓名' } })
  fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }))
  await waitFor(() => expect(rootStore.operatorStore.updateOperator).toHaveBeenCalledWith('636880423783248430', {
    name: '更新姓名', phone: undefined, email: undefined, is_active: true
  }))
  expect((rootStore.operatorStore.updateOperator as jest.Mock).mock.calls[0][1]).not.toHaveProperty('roles')
})
beforeEach(() => jest.clearAllMocks())

it('creates membership without default role grants and explains the separate scope step', async () => {
  (rootStore.operatorStore.createOperator as jest.Mock).mockResolvedValue(true)
  render(<OperatorManagement />)
  fireEvent.click(screen.getByRole('button', { name: /添加运营人员/ }))
  fireEvent.click(screen.getByLabelText('已有账号'))
  fireEvent.change(screen.getByLabelText('姓名'), { target: { value: '新运营员' } })
  fireEvent.change(screen.getByLabelText('用户ID'), { target: { value: '636880423783248430' } })
  expect(screen.getByText(/本次仅创建运营人员身份，不授予角色/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /确\s*定/ }))
  await waitFor(() => expect(rootStore.operatorStore.createOperator).toHaveBeenCalledWith(expect.objectContaining({
    user_id: '636880423783248430', roles: [], name: '新运营员'
  })))
})
