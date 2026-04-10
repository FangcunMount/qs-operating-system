import type { IRoute } from '@/types/router'

/**
 * profileFetchDone 前不收紧；完成后若用户无角色（缺失或空数组）则无任何权限；
 * 用户有角色时：路由未配置 roles 则均可访问；配置了则需命中其一。
 */
export function hasRouteRoleAccess(
  route: IRoute,
  userRoles: string[] | undefined,
  profileFetchDone: boolean
): boolean {
  if (!profileFetchDone) return true
  const r = userRoles ?? []
  if (r.length === 0) return false
  const need = route.roles
  if (!need?.length) return true
  return need.some(role => r.includes(role))
}

/** 侧栏菜单：按权限过滤；带子路由时会先过滤子项，无可见子项则整组不展示 */
export function filterRoutesForMenu(
  routes: IRoute[],
  userRoles: string[] | undefined,
  profileFetchDone: boolean
): IRoute[] {
  const out: IRoute[] = []
  for (const route of routes) {
    if (route.hideInMenu) continue
    if (route.children?.length) {
      const kids = route.children.filter(
        c => !c.hideInMenu && hasRouteRoleAccess(c, userRoles, profileFetchDone)
      )
      if (kids.length === 0) continue
      if (!hasRouteRoleAccess(route, userRoles, profileFetchDone)) continue
      out.push({ ...route, children: kids })
    } else if (hasRouteRoleAccess(route, userRoles, profileFetchDone)) {
      out.push(route)
    }
  }
  return out
}
