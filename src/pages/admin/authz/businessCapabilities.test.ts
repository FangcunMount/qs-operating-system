import { BUSINESS_CAPABILITIES, capabilityResult, conditionSummary } from './businessCapabilities'
import type { MatrixData } from './permissionMatrixModel'
const progress = BUSINESS_CAPABILITIES[0]
const data: MatrixData = {
  roles: [], loadedAt: new Date(),
  resources: [{ id: 'res', key: progress.resource, app_name: 'qs', domain: 'evaluation', type: 'collection',
    display_name: '测评', actions: ['read_progress', 'list_progress'], attribute_schema: { version: 1, attributes: [] } }],
  grants: [{ id: 'g', role_id: 'r1', resource_id: 'res', resource_pattern: progress.resource, action: 'read_progress',
    active: true, grant_key: 'g', granted_by: 'system', constraint_set: { version: 1, all_of: [] } }]
}
it('distinguishes partial configuration from a complete business capability', () => {
  expect(capabilityResult(progress, data, ['r1']).state).toBe('partial')
  expect(capabilityResult(progress, data, ['r2']).state).toBe('none')
  const combined = { ...data, grants: [...data.grants, { ...data.grants[0], id: 'g2', role_id: 'r2', action: 'list_progress' }] }
  expect(capabilityResult(progress, combined, ['r1', 'r2']).state).toBe('complete')
})
it('does not classify a missing catalog action as unconfigured or complete', () => {
  const incomplete = { ...data, resources: [{ ...data.resources[0], actions: ['read_progress'] }] }
  expect(capabilityResult(progress, incomplete, ['r1']).state).toBe('unknown')
})
it('keeps whole-capability status conditional and explains OR alternatives', () => {
  const grants = ['adhoc', 'plan'].map((origin, index) => ({ ...data.grants[0], id: String(index), action: '*',
    constraint_set: { version: 1 as const, all_of: [{ key: 'object.origin_type', operator: 'eq' as const,
      value: { type: 'string' as const, string: origin } }] } }))
  const result = capabilityResult(progress, { ...data, grants }, ['r1'])
  const cell = result.items[0]?.cell
  expect(result.state).toBe('stale')
  expect(cell).toBeDefined()
  if (!cell) throw new Error('expected conditional cell')
  expect(conditionSummary(cell)).toBe('权限数据待刷新')
})
