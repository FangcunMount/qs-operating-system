import {
  buildConstraintSet,
  describeConstraintSet,
  getAuthorizationMode
} from './constraintModel'
import type { IAttributeDefinition } from '@/api/path/authz'

describe('PermissionGrant constraint model', () => {
  const definitions: IAttributeDefinition[] = [
    {
      key: 'object.origin_type',
      type: 'string',
      allowed_string_values: ['adhoc', 'plan']
    },
    { key: 'object.retry_count', type: 'int64' },
    { key: 'object.locked', type: 'bool' }
  ]

  it('builds typed EQ predicates in schema order', () => {
    expect(buildConstraintSet(definitions, {
      'object.origin_type': 'plan',
      'object.retry_count': '3',
      'object.locked': 'false'
    })).toEqual({
      version: 1,
      all_of: [
        {
          key: 'object.origin_type',
          operator: 'eq',
          value: { type: 'string', string: 'plan' }
        },
        {
          key: 'object.retry_count',
          operator: 'eq',
          value: { type: 'int64', int64: 3 }
        },
        {
          key: 'object.locked',
          operator: 'eq',
          value: { type: 'bool', bool: false }
        }
      ]
    })
  })

  it('treats an empty selection as unconditional and describes conditions', () => {
    const unconditional = buildConstraintSet(definitions, {})
    const conditional = buildConstraintSet(definitions, { 'object.origin_type': 'adhoc' })

    expect(unconditional).toEqual({ version: 1, all_of: [] })
    expect(getAuthorizationMode(unconditional)).toBe('UNCONDITIONAL')
    expect(getAuthorizationMode(conditional)).toBe('OBJECT_CHECK_REQUIRED')
    expect(describeConstraintSet(conditional)).toBe('object.origin_type = adhoc')
  })

  it('rejects invalid typed input instead of guessing', () => {
    expect(() => buildConstraintSet(definitions, { 'object.retry_count': '3.2' })).toThrow('必须是整数')
    expect(() => buildConstraintSet(definitions, { 'object.locked': 'yes' })).toThrow('必须是 true 或 false')
    expect(() => buildConstraintSet(definitions, { 'object.origin_type': 'unknown' })).toThrow('不是 Schema 允许的值')
  })

  it('rejects more than eight predicates in one Grant', () => {
    const manyDefinitions: IAttributeDefinition[] = Array.from({ length: 9 }, (_, index) => ({
      key: `object.value_${index}`,
      type: 'string'
    }))
    const values = Object.fromEntries(manyDefinitions.map(definition => [definition.key, 'set']))

    expect(() => buildConstraintSet(manyDefinitions, values)).toThrow('最多支持 8 个')
  })
})
