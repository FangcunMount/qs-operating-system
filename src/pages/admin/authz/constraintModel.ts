import type {
  IAttributeDefinition,
  IConstraintSet,
  IConstraintValue
} from '@/api/path/authz'

export type AuthorizationMode = 'UNCONDITIONAL' | 'OBJECT_CHECK_REQUIRED'
export type ConstraintFormValues = Record<string, unknown>

const isEmpty = (value: unknown) => value === undefined || value === null || value === ''

const buildTypedValue = (definition: IAttributeDefinition, input: unknown): IConstraintValue => {
  switch (definition.type) {
  case 'string':
    if (definition.allowed_string_values?.length
      && !definition.allowed_string_values.includes(String(input))) {
      throw new Error(`${definition.key} 不是 Schema 允许的值`)
    }
    return { type: 'string', string: String(input) }
  case 'int64': {
    const value = typeof input === 'number' ? input : Number(input)
    if (!Number.isSafeInteger(value)) {
      throw new Error(`${definition.key} 必须是整数`)
    }
    return { type: 'int64', int64: value }
  }
  case 'bool':
    if (input !== true && input !== false && input !== 'true' && input !== 'false') {
      throw new Error(`${definition.key} 必须是 true 或 false`)
    }
    return { type: 'bool', bool: input === true || input === 'true' }
  default:
    throw new Error(`${definition.key} 使用了不支持的属性类型`)
  }
}

export const buildConstraintSet = (
  definitions: IAttributeDefinition[],
  values: ConstraintFormValues
): IConstraintSet => {
  const allOf = definitions
    .filter(definition => !isEmpty(values[definition.key]))
    .map(definition => ({
      key: definition.key,
      operator: 'eq' as const,
      value: buildTypedValue(definition, values[definition.key])
    }))
  if (allOf.length > 8) {
    throw new Error('单条 Grant 最多支持 8 个对象属性条件')
  }
  return { version: 1, all_of: allOf }
}

const describeValue = (value: IConstraintValue) => {
  if (value.type === 'string') return value.string ?? ''
  if (value.type === 'int64') return String(value.int64 ?? '')
  if (value.type === 'bool') return String(value.bool ?? '')
  return ''
}

export const describeConstraintSet = (constraintSet: IConstraintSet): string => {
  if (!constraintSet.all_of.length) return '无条件'
  return constraintSet.all_of
    .map(predicate => `${predicate.key} = ${describeValue(predicate.value)}`)
    .join(' 且 ')
}

export const getAuthorizationMode = (constraintSet: IConstraintSet): AuthorizationMode => (
  constraintSet.all_of.length > 0 ? 'OBJECT_CHECK_REQUIRED' : 'UNCONDITIONAL'
)
