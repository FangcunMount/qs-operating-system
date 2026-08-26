import type { IRole, IRoleInheritance } from '@/api/path/authz'

export const wouldCreateRoleInheritanceCycle = (
  roleId: string,
  inheritedRoleId: string,
  edges: IRoleInheritance[]
): boolean => {
  if (!roleId || roleId === inheritedRoleId) return true
  const parents = new Map<string, string[]>()
  edges.filter(edge => edge.active !== false).forEach((edge) => {
    parents.set(edge.role_id, [...(parents.get(edge.role_id) || []), edge.inherited_role_id])
  })
  const pending = [inheritedRoleId]
  const visited = new Set<string>()
  while (pending.length > 0) {
    const current = pending.pop() as string
    if (current === roleId) return true
    if (visited.has(current)) continue
    visited.add(current)
    pending.push(...(parents.get(current) || []))
  }
  return false
}

export const resolveEffectiveRoleNames = (
  directRoleNames: string[],
  roles: IRole[],
  edges: IRoleInheritance[]
): string[] => {
  const byName = new Map(roles.map(role => [role.name, role]))
  const byId = new Map(roles.map(role => [String(role.id), role]))
  const parents = new Map<string, string[]>()
  edges.filter(edge => edge.active !== false).forEach((edge) => {
    parents.set(String(edge.role_id), [...(parents.get(String(edge.role_id)) || []), String(edge.inherited_role_id)])
  })
  const result = new Set(directRoleNames)
  const pending = directRoleNames.map(name => byName.get(name)?.id).filter(Boolean).map(String)
  const visited = new Set<string>()
  while (pending.length > 0) {
    const current = pending.pop() as string
    if (visited.has(current)) continue
    visited.add(current)
    ;(parents.get(current) || []).forEach((parentId) => {
      const parent = byId.get(parentId)
      if (parent) result.add(parent.name)
      pending.push(parentId)
    })
  }
  return Array.from(result).sort()
}
