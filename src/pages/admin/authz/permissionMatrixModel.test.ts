import { authzApi } from '@/api/path/authz'
import type { IPermissionGrant, IResource } from '@/api/path/authz'
import { coversResource, matrixCell, readAll, loadMatrixData, cellSignature } from './permissionMatrixModel'

jest.mock('@/api/path/authz', () => ({ authzApi: { listRoles: jest.fn(), listResources: jest.fn(), listPermissionGrants: jest.fn() } }))
const resource: IResource = { id: '9007199254740993',
  key: 'qs:evaluation:collection:assessments',
  app_name: 'qs',
  domain: 'evaluation',
  type: 'collection',
  actions: ['retry'],
  display_name: '测评',
  attribute_schema: { version: 1,
    attributes: [] } }
const row = { key: 'retry', resource, action: 'retry' }
const grant = (overrides: Partial<IPermissionGrant> = {}): IPermissionGrant => ({ id: 'g1',
  role_id: 'r1',
  resource_id: resource.id,
  resource_pattern: resource.key,
  action: 'retry',
  active: true,
  grant_key: 'k',
  granted_by: 'system',
  constraint_set: { version: 1,
    all_of: [] },
  ...overrides })
const condition = (value: string) => ({ version: 1 as const,
  all_of: [{ key: 'object.origin_type',
    operator: 'eq' as const,
    value: { type: 'string' as const,
      string: value } }] })

it('matches four-segment scopes, never shorthand or prefix patterns', () => {
  expect(coversResource('qs:*:*:*', resource.key)).toBe(true)
  expect(coversResource('*:*:*:*', resource.key)).toBe(true)
  expect(coversResource('iam:*:*:*', resource.key)).toBe(false)
  expect(coversResource('qs:*', resource.key)).toBe(false)
  expect(coversResource('qs:evaluation:collection:assessment*', resource.key)).toBe(false)
})
it('uses actual grants, not role names, and ignores revoked grants', () => {
  expect(matrixCell(row, [], ['platform_admin'], [resource]).state).toBe('none')
  expect(matrixCell(row, [grant({ active: false })], ['r1'], [resource]).state).toBe('none')
  expect(matrixCell(row, [grant({ action: 'read' })], ['r1'], [resource]).state).toBe('none')
  expect(matrixCell(row, [grant()], ['r1'], [resource]).state).toBe('direct')
  expect(matrixCell(row, [grant({ resource_pattern: 'qs:*:*:*', action: '*' })], ['r1'], [resource]).state).toBe('wildcard')
})
it('preserves conditional OR alternatives for combined roles', () => {
  const grants = [grant({ constraint_set: condition('adhoc') }), grant({ id: 'g2', role_id: 'r2', constraint_set: condition('plan') })]
  const first = matrixCell(row, grants, ['r1'], [resource])
  const second = matrixCell(row, grants, ['r2'], [resource])
  expect(cellSignature(first)).not.toBe(cellSignature(second))
  const combined = matrixCell(row, grants, ['r1', 'r2'], [resource])
  expect(combined.state).toBe('conditional')
  expect(combined.grants).toHaveLength(2)
  expect(matrixCell(row, [...grants, grant({ id: 'g3' })], ['r1', 'r2'], [resource]).state).toBe('direct')
})
it('reads every catalog page and refuses missing or repeated pages', async () => {
  const fetch = jest.fn().mockResolvedValueOnce([null,
    { data: [{ id: '1' }],
      total: 2 }]).mockResolvedValueOnce([null,
    { data: [{ id: '2' }],
      total: 2 }])
  expect(await readAll(fetch)).toHaveLength(2)
  expect(fetch).toHaveBeenLastCalledWith({ offset: 1, limit: 100 })
  await expect(readAll(jest.fn().mockResolvedValue([null, { data: [], total: 1 }]))).rejects.toThrow('不完整')
  await expect(readAll(jest.fn().mockResolvedValue([null, { data: [{ id: '1' }], total: 2 }]))).rejects.toThrow('分页重复')
})
it('does not present a failed role as an empty permission set', async () => {
  (authzApi.listRoles as jest.Mock).mockResolvedValue([null, { data: [{ id: 'r1', display_name: '运营员' }], total: 1 }])
  ;(authzApi.listResources as jest.Mock).mockResolvedValue([null, { data: [resource], total: 1 }])
  ;(authzApi.listPermissionGrants as jest.Mock).mockResolvedValue([{ status: 403 }, undefined])
  await expect(loadMatrixData()).rejects.toThrow('无法读取「运营员」')
})
