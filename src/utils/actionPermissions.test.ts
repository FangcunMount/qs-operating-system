import { hasActionPermission, hasRetiredActionPermission } from './actionPermissions'
const resource = 'qs:evaluation:collection:assessments'
it('requires actual action facts and rejects retired conditional modes', () => {
  expect(hasActionPermission(undefined, resource, 'retry')).toBe(false)
  const permissions = [{ resource, action: 'retry', mode: 'OBJECT_CHECK_REQUIRED' }]
  expect(hasActionPermission(permissions, resource, 'retry')).toBe(false)
  expect(hasRetiredActionPermission(permissions, resource, 'retry')).toBe(true)
  permissions.push({ resource, action: 'retry', mode: 'UNCONDITIONAL' })
  expect(hasActionPermission(permissions, resource, 'retry')).toBe(true)
  expect(hasActionPermission(permissions, resource, 'force_retry')).toBe(false)
  expect(hasRetiredActionPermission(permissions, resource, 'retry')).toBe(false)
})
it('preserves exact and whole-segment wildcard matching', () => {
  expect(hasActionPermission([{ resource: 'qs:*:*:*', action: '*', mode: 'UNCONDITIONAL' }], resource, 'retry')).toBe(true)
  expect(hasActionPermission([{ resource: 'qs:eval*:collection:assessments', action: '*', mode: 'UNCONDITIONAL' }], resource, 'retry')).toBe(false)
})
