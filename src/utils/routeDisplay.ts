import type { AccessContext } from './accessControl'

export function getRouteDisplayTitle(
  routeName: string,
  routeTitle: string,
  access: AccessContext
): string {
  if (access.isClinician && (routeName === 'subject' || routeName === 'subject-list')) {
    return '我的受试者'
  }

  return routeTitle
}
