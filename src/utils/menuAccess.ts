import type { IRoute } from '@/types/router'
import type { AccessContext } from './accessControl'
import { routeAllowsAccess } from './accessControl'

export function hasRouteRoleAccess(
  route: IRoute,
  access: AccessContext,
  profileFetchDone: boolean
): boolean {
  return routeAllowsAccess(route, access, profileFetchDone)
}

export function filterRoutesForMenu(
  routes: IRoute[],
  access: AccessContext,
  profileFetchDone: boolean
): IRoute[] {
  const out: IRoute[] = []

  for (const route of routes) {
    if (route.hideInMenu) continue
    if (route.children?.length) {
      const kids = route.children.filter(
        c =>
          !c.hideInMenu &&
          hasRouteRoleAccess(c, access, profileFetchDone)
      )
      if (kids.length === 0) continue
      if (!hasRouteRoleAccess(route, access, profileFetchDone)) continue
      out.push({ ...route, children: kids })
    } else if (hasRouteRoleAccess(route, access, profileFetchDone)) {
      out.push(route)
    }
  }
  return out
}

/** Root is exact-only; nested routes must match at a path segment boundary. */
export function matchesMenuPath(path: string, routePath: string): boolean {
  return path === routePath || (routePath !== '/' && path.startsWith(routePath + '/'))
}
