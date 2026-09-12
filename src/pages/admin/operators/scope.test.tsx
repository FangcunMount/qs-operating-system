import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Modal } from 'antd'
import OperatorScopeEditor from './scope'
import { operatorScopeApi, OperatorScopeConfiguration } from '@/api/path/operatorScope'
import { loadStoreOptions } from '@/api/path/store'

jest.mock('@/api/path/operatorScope', () => ({ operatorScopeApi: { get: jest.fn(), replace: jest.fn() } }))
jest.mock('@/api/path/store', () => ({ loadStoreOptions: jest.fn() }))

const id = '636880423783248430'
const storeID = '636880423783313966'
const version = '9007199254740993'
const configuration = (): OperatorScopeConfiguration => ({
  operator_id: id, policy_version: version, protected_access: false, unconfigured_assignments: [],
  assignments: [{ assignment_id: '201', role_id: '301', role_name: 'qs:assessment_operator', management_protection: 'standard',
    scope: { org_id: '1', kind: 'stores', store_ids: [storeID] } }]
})
const load = (facts = configuration()) => (operatorScopeApi.get as jest.Mock).mockResolvedValue([null, { data: facts }])
const saveButton = () => screen.getByRole('button', { name: /OK|确\s*定/ })
const show = () => {
  const onSaved = jest.fn()
  const onClose = jest.fn()
  render(<OperatorScopeEditor id={id} name="测试运营员" onSaved={onSaved} onClose={onClose} />)
  return { onSaved, onClose }
}

beforeEach(() => {
  jest.clearAllMocks()
  load()
  ;(loadStoreOptions as jest.Mock).mockResolvedValue([{ id: storeID, code: 'B', name: '测试门店', is_active: true }])
  ;(operatorScopeApi.replace as jest.Mock).mockResolvedValue([null, { data: { policy_version: '9007199254740994', projection_pending: true } }])
  jest.spyOn(Modal, 'info').mockImplementation(jest.fn())
})
afterEach(() => jest.restoreAllMocks())

it('submits the loaded version and exact store IDs without an implicit company scope', async () => {
  const callbacks = show()
  await waitFor(() => expect(saveButton()).not.toBeDisabled())
  fireEvent.change(screen.getByLabelText('调整原因'), { target: { value: '配置测试门店' } })
  fireEvent.click(saveButton())
  await waitFor(() => expect(operatorScopeApi.replace).toHaveBeenCalledWith(id, {
    expected_policy_version: version, reason: '配置测试门店',
    roles: [{ role_name: 'qs:assessment_operator', kind: 'stores', store_ids: [storeID] }]
  }))
  await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledTimes(1))
  expect(callbacks.onClose).toHaveBeenCalledTimes(1)
})

it.each(['protected', 'unconfigured'])('blocks %s facts without submitting a replacement', async (kind) => {
  const facts = configuration()
  if (kind === 'protected') facts.protected_access = true
  else facts.unconfigured_assignments = [{ ...facts.assignments[0], scope: null }]
  load(facts)
  show()
  await screen.findByText(kind === 'protected' ? /此人员包含受保护授权/ : /存在尚未迁移的数据范围/)
  expect(saveButton()).toBeDisabled()
  expect(screen.getByRole('button', { name: '添加角色' })).toBeDisabled()
  expect(operatorScopeApi.replace).not.toHaveBeenCalled()
})

it('requires reopening after a conflict and never fetches a new version to silently retry', async () => {
  (operatorScopeApi.replace as jest.Mock).mockResolvedValue([{ message: '授权版本已变化', status: 409 }, null])
  const callbacks = show()
  await waitFor(() => expect(saveButton()).not.toBeDisabled())
  fireEvent.change(screen.getByLabelText('调整原因'), { target: { value: '调整测试范围' } })
  fireEvent.click(saveButton())
  await screen.findByText('授权版本已变化')
  expect(await screen.findByText(/请关闭后重新打开，核对当前授权/)).toBeInTheDocument()
  expect(saveButton()).toBeDisabled()
  fireEvent.click(saveButton())
  expect(operatorScopeApi.replace).toHaveBeenCalledTimes(1)
  expect(operatorScopeApi.get).toHaveBeenCalledTimes(1)
  expect(callbacks.onSaved).not.toHaveBeenCalled()
})

it('keeps the editor blocked when the authoritative configuration cannot be loaded', async () => {
  (operatorScopeApi.get as jest.Mock).mockResolvedValue([{ message: '无权读取配置' }, null])
  show()
  await screen.findByText('无权读取配置')
  expect(saveButton()).toBeDisabled()
  expect(operatorScopeApi.replace).not.toHaveBeenCalled()
})

it('preserves each role range independently, including company scope without selected stores', async () => {
  const facts = configuration()
  facts.assignments.push({ assignment_id: '202', role_id: '302', role_name: 'qs:result_reviewer', management_protection: 'standard',
    scope: { org_id: '1', kind: 'all_stores', store_ids: [] } })
  load(facts)
  show()
  await waitFor(() => expect(saveButton()).not.toBeDisabled())
  fireEvent.change(screen.getByLabelText('调整原因'), { target: { value: '核对兼岗范围' } })
  fireEvent.click(saveButton())
  await waitFor(() => expect(operatorScopeApi.replace).toHaveBeenCalledWith(id, {
    expected_policy_version: version, reason: '核对兼岗范围', roles: [
      { role_name: 'qs:assessment_operator', kind: 'stores', store_ids: [storeID] },
      { role_name: 'qs:result_reviewer', kind: 'all_stores', store_ids: [] }
    ]
  }))
})

it.each(['missing response', 'transport failure'])('blocks another submission after %s', async kind => {
  const replace = operatorScopeApi.replace as jest.Mock
  if (kind === 'missing response') replace.mockResolvedValue([null, null])
  else replace.mockRejectedValue(new Error('连接中断，提交结果未知'))
  const callbacks = show()
  await waitFor(() => expect(saveButton()).not.toBeDisabled())
  fireEvent.change(screen.getByLabelText('调整原因'), { target: { value: '调整测试范围' } })
  fireEvent.click(saveButton())
  await screen.findByText(/请关闭后重新打开，核对当前授权/)
  expect(saveButton()).toBeDisabled()
  fireEvent.click(saveButton())
  expect(replace).toHaveBeenCalledTimes(1)
  expect(operatorScopeApi.get).toHaveBeenCalledTimes(1)
  expect(callbacks.onSaved).not.toHaveBeenCalled()
  expect(callbacks.onClose).not.toHaveBeenCalled()
})

it('does not enable replacement when the company store catalog cannot be loaded', async () => {
  (loadStoreOptions as jest.Mock).mockRejectedValue(new Error('门店列表暂不可用'))
  show()
  await screen.findByText('门店列表暂不可用')
  expect(saveButton()).toBeDisabled()
  expect(screen.getByRole('button', { name: '添加角色' })).toBeDisabled()
  expect(operatorScopeApi.replace).not.toHaveBeenCalled()
})
