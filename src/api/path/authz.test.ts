import {
  createPermissionGrant,
  createResource,
  createRoleInheritance,
  listRoleInheritances,
  listPermissionGrants,
  listResources,
  revokePermissionGrant,
  revokeRoleInheritance,
  updateResource
} from './authz'
import { iamV3Del, iamV3Get, iamV3Post, iamV3Put } from '../iamV3Server'

jest.mock('../iamV3Server', () => ({
  iamV3Del: jest.fn(() => Promise.resolve([null, { code: 200, message: 'success' }])),
  iamV3Get: jest.fn(() => Promise.resolve([null, { code: 200, message: 'success', data: [] }])),
  iamV3Post: jest.fn(() => Promise.resolve([null, { code: 200, message: 'success', data: {} }])),
  iamV3Put: jest.fn(() => Promise.resolve([null, { code: 200, message: 'success', data: {} }]))
}))

const delMock = iamV3Del as jest.Mock
const getMock = iamV3Get as jest.Mock
const postMock = iamV3Post as jest.Mock
const putMock = iamV3Put as jest.Mock

describe('AuthZ v3 API contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delMock.mockResolvedValue([null, { code: 200, message: 'success' }])
    getMock.mockResolvedValue([null, { code: 200, message: 'success', data: [] }])
    postMock.mockResolvedValue([null, { code: 200, message: 'success', data: {} }])
    putMock.mockResolvedValue([null, { code: 200, message: 'success', data: {} }])
  })

  it('uses PermissionGrant endpoints and never projects legacy scope fields', async () => {
    const constraintSet = {
      version: 1 as const,
      all_of: [{
        key: 'object.origin_type',
        operator: 'eq' as const,
        value: { type: 'string' as const, string: 'adhoc' }
      }]
    }

    await listPermissionGrants('role-1')
    await createPermissionGrant({
      role_id: 'role-1',
      resource_id: 'resource-1',
      action: 'retry',
      constraint_set: constraintSet
    })
    await revokePermissionGrant('grant-1', '权限调整')

    expect(getMock).toHaveBeenCalledWith('/authz/roles/role-1/grants')
    expect(postMock).toHaveBeenCalledWith('/authz/grants', {
      role_id: 'role-1',
      resource_id: 'resource-1',
      action: 'retry',
      constraint_set: constraintSet
    })
    expect(delMock).toHaveBeenCalledWith('/authz/grants/grant-1', { reason: '权限调整' })
    expect(JSON.stringify(postMock.mock.calls)).not.toContain('scope_type')
    expect(JSON.stringify(postMock.mock.calls)).not.toContain('scope_value')
  })

  it('normalizes v3 list metadata and preserves resource attribute schema', async () => {
    getMock.mockResolvedValueOnce([null, {
      code: 200,
      message: 'success',
      data: [{
        id: 'resource-1',
        key: 'qs:evaluation:collection:assessments',
        display_name: '测评',
        app_name: 'qs',
        domain: 'fangcun',
        type: 'collection',
        actions: ['retry'],
        attribute_schema: {
          version: 1,
          attributes: [{
            key: 'object.origin_type',
            type: 'string',
            allowed_string_values: ['adhoc', 'plan']
          }]
        }
      }],
      total: 1,
      offset: 0,
      limit: 20
    }])

    const [, response] = await listResources({ limit: 20, offset: 0 })

    expect(getMock).toHaveBeenCalledWith('/authz/resources', { limit: 20, offset: 0 })
    expect(response).toMatchObject({ total: 1, offset: 0, limit: 20 })
    expect(response?.data[0].attribute_schema.attributes[0]).toEqual({
      key: 'object.origin_type',
      type: 'string',
      allowed_string_values: ['adhoc', 'plan']
    })
  })

  it('writes attribute_schema instead of retired scope_kinds', async () => {
    const resource = {
      key: 'qs:evaluation:collection:assessments',
      display_name: '测评',
      app_name: 'qs',
      domain: 'fangcun',
      type: 'collection',
      actions: ['retry'],
      attribute_schema: {
        version: 1 as const,
        attributes: [{
          key: 'object.origin_type',
          type: 'string' as const,
          allowed_string_values: ['adhoc', 'plan']
        }]
      }
    }

    await createResource(resource)
    await updateResource('resource-1', {
      display_name: resource.display_name,
      actions: resource.actions,
      attribute_schema: resource.attribute_schema
    })

    expect(postMock).toHaveBeenCalledWith('/authz/resources', resource)
    expect(putMock).toHaveBeenCalledWith('/authz/resources/resource-1', {
      display_name: resource.display_name,
      actions: resource.actions,
      attribute_schema: resource.attribute_schema
    })
    expect(JSON.stringify([...postMock.mock.calls, ...putMock.mock.calls])).not.toContain('scope_kinds')
  })

  it('uses first-class RoleInheritance endpoints', async () => {
    await listRoleInheritances()
    await createRoleInheritance('role-admin', 'role-evaluator')
    await revokeRoleInheritance('inheritance-1', '角色图调整')

    expect(getMock).toHaveBeenCalledWith('/authz/role-inheritances', undefined)
    expect(postMock).toHaveBeenCalledWith('/authz/role-inheritances', {
      role_id: 'role-admin',
      inherited_role_id: 'role-evaluator'
    })
    expect(delMock).toHaveBeenCalledWith('/authz/role-inheritances/inheritance-1', { reason: '角色图调整' })
  })
})
