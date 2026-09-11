export interface ActionPermission { resource: string; action: string; mode: string }
const matches = (permission: ActionPermission, resource: string, action: string): boolean => {
  const pattern = permission.resource.split(':')
  const target = resource.split(':')
  return pattern.length === 4 && target.length === 4
    && pattern.every((part, index) => Boolean(part) && (part === '*' || part === target[index]))
    && (permission.action === action || permission.action === '*')
}
export const hasActionPermission = (permissions: ActionPermission[] | undefined, resource: string, action: string): boolean =>
  Boolean(permissions?.some(permission => permission.mode === 'UNCONDITIONAL' && matches(permission, resource, action)))
export const hasRetiredActionPermission = (permissions: ActionPermission[] | undefined, resource: string, action: string): boolean =>
  !hasActionPermission(permissions, resource, action)
    && Boolean(permissions?.some(permission => permission.mode !== 'UNCONDITIONAL' && matches(permission, resource, action)))
