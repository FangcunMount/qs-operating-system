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
  const isClinicianWorkbenchPrimary =
    access.isClinician && !access.isPlatformAdmin && access.capabilities.size === 0

  for (const route of routes) {
    if (route.hideInMenu) continue
    if (route.hideForClinicianOnly && isClinicianWorkbenchPrimary) continue
    if (route.children?.length) {
      const kids = route.children.filter(
        c =>
          !c.hideInMenu &&
          !(c.hideForClinicianOnly && isClinicianWorkbenchPrimary) &&
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
