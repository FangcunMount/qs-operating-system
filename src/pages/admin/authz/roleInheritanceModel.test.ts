import { resolveEffectiveRoleNames, wouldCreateRoleInheritanceCycle } from './roleInheritanceModel'

const roles = [
  { id: '1', name: 'qs:admin', display_name: '管理员' },
  { id: '2', name: 'qs:evaluator', display_name: '评估员' },
  { id: '3', name: 'qs:staff', display_name: '员工' }
]
const edges = [
  { id: 'e1', tenant_id: 'fangcun', role_id: '1', inherited_role_id: '2', granted_by: 'system', granted_at: '', active: true },
  { id: 'e2', tenant_id: 'fangcun', role_id: '2', inherited_role_id: '3', granted_by: 'system', granted_at: '', active: true }
]

test('resolves effective roles and rejects a cycle', () => {
  expect(resolveEffectiveRoleNames(['qs:admin'], roles, edges)).toEqual(['qs:admin', 'qs:evaluator', 'qs:staff'])
  expect(wouldCreateRoleInheritanceCycle('3', '1', edges)).toBe(true)
  expect(wouldCreateRoleInheritanceCycle('1', '3', edges)).toBe(false)
})
