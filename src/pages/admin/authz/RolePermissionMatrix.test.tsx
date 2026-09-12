import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import RolePermissionMatrix from './RolePermissionMatrix'
import { loadMatrixData } from './permissionMatrixModel'
import type { MatrixData } from './permissionMatrixModel'
jest.mock('@/api/path/authz', () => ({ authzApi: {} }))
jest.mock('./permissionMatrixModel', () => ({ ...jest.requireActual('./permissionMatrixModel'), loadMatrixData: jest.fn() }))
const fixture = (): MatrixData => ({
  loadedAt: new Date(),
  roles: [{ id: 'r1',
    name: 'qs:assessment_operator',
    display_name: '运营员',
    management_protection: 'standard' },
  { id: 'r2',
    name: 'qs:result_reviewer',
    display_name: '评估员',
    management_protection: 'standard' }],
  resources: [{ id: 'res',
    key: 'qs:evaluation:collection:assessments',
    app_name: 'qs',
    domain: 'evaluation',
    type: 'collection',
    display_name: '测评',
    actions: ['retry',
      'read'],
    attribute_schema: { version: 1,
      attributes: [] } }],
  grants: [{ id: '9007199254740993',
    role_id: 'r1',
    resource_id: 'res',
    resource_pattern: 'qs:evaluation:collection:assessments',
    action: 'retry',
    active: true,
    grant_key: 'key',
    granted_by: 'system',
    constraint_set: { version: 1,
      all_of: [{ key: 'object.origin_type',
        operator: 'eq',
        value: { type: 'string',
          string: 'adhoc' } }] } }]
})
beforeEach(() => { jest.clearAllMocks(); (loadMatrixData as jest.Mock).mockResolvedValue(fixture()) })
it('shows live roles, combined configuration, and exact conditional grant evidence', async () => {
  render(<RolePermissionMatrix />)
  fireEvent.click(await screen.findByRole('tab', { name: '授权明细' }))
  const cell = await screen.findByRole('button', { name: '运营员 · 测评 · retry · 查看授权依据' })
  expect(screen.getByText('所选角色组合')).toBeInTheDocument()
  fireEvent.click(cell)
  expect((await screen.findAllByText(/权限数据待刷新/))[0]).toBeInTheDocument()
  expect(screen.getByText('授权编号：9007199254740993')).toBeInTheDocument()
})
it('filters resource actions and differences, and clears stale data after refresh fails', async () => {
  render(<RolePermissionMatrix />)
  fireEvent.click(await screen.findByRole('tab', { name: '授权明细' }))
  await screen.findByRole('button', { name: '运营员 · 测评 · retry · 查看授权依据' })
  fireEvent.change(screen.getByRole('textbox', { name: '搜索资源或动作' }), { target: { value: '不存在' } })
  expect(screen.getByText('当前筛选下没有资源动作')).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox', { name: '搜索资源或动作' }), { target: { value: '' } })
  fireEvent.click(screen.getByRole('checkbox', { name: '仅看配置差异' }))
  expect(screen.queryByText('查看详情')).not.toBeInTheDocument()
  ;(loadMatrixData as jest.Mock).mockRejectedValue(new Error('读取权限不足'))
  fireEvent.click(screen.getByRole('button', { name: '刷新配置' }))
  await screen.findByText('读取权限不足')
  expect(screen.queryByText('所选角色组合')).not.toBeInTheDocument()
  ;(loadMatrixData as jest.Mock).mockResolvedValue(fixture())
  fireEvent.click(screen.getByRole('button', { name: '刷新配置' }))
  await waitFor(() => expect(screen.getByText('所选角色组合')).toBeInTheDocument())
})

it('surfaces active grants that no longer map to a catalog action', async () => {
  const data = fixture()
  data.grants[0].action = 'retired_action'
  ;(loadMatrixData as jest.Mock).mockResolvedValue(data)
  render(<RolePermissionMatrix />)
  fireEvent.click(await screen.findByRole('tab', { name: '授权明细' }))
  expect(await screen.findByText('存在未能在当前目录展开的授权')).toBeInTheDocument()
  expect(screen.getByText(/retired_action/)).toBeInTheDocument()
})


it('opens on role responsibilities with conditions in business language', async () => {
  render(<RolePermissionMatrix />)
  expect(await screen.findByRole('tab', { name: '角色职责' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getAllByText(/权限数据待刷新/)[0]).toBeInTheDocument()
  expect(screen.queryByText('资源 / 动作')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /评估员 qs:result_reviewer/ }))
  expect(screen.queryByText(/权限数据待刷新/)).not.toBeInTheDocument()
})

it('compares business capabilities and shows configuration added to the baseline role', async () => {
  const data = fixture()
  data.grants[0].role_id = 'r2'
  ;(loadMatrixData as jest.Mock).mockResolvedValue(data)
  render(<RolePermissionMatrix />)
  fireEvent.click(await screen.findByRole('tab', { name: '角色对比' }))
  expect(screen.getByText('相对首个角色补充配置')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '兼岗组合 · 重试测评 · retry · 授权依据' }))
  expect(await screen.findByText('授权编号：9007199254740993')).toBeInTheDocument()
})
