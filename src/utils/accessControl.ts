import type { IRoute, RouteCapability } from '@/types/router'

const PLATFORM_ADMIN_ROLES = ['platform_admin']

const ROLE_CAPABILITY_MAP: Record<string, RouteCapability[]> = {
  'qs:assessment_operator': ['read_subjects', 'read_assessment_progress', 'evaluate_assessments'],
  'qs:result_reviewer': ['read_subjects', 'read_assessment_records'],
  'qs:admin': [
    'read_assessment_progress', 'org_admin', 'manage_content', 'manage_evaluation_plans', 'evaluate_assessments',
    'audit_interpretation', 'read_subjects', 'read_assessment_records',
    'read_norm_tables', 'manage_norm_tables'
  ],
  'qs:content_manager': ['manage_content', 'read_norm_tables', 'manage_norm_tables'],
  'qs:evaluation_plan_manager': ['manage_evaluation_plans', 'read_subjects', 'read_assessment_progress'],
}

export interface AccessContext {
  roles: string[]
  hasAnyRole: boolean
  isPlatformAdmin: boolean
  isClinician: boolean
  capabilities: Set<RouteCapability>
}

function deriveCapabilities(roles: string[]): Set<RouteCapability> {
  const capabilities = new Set<RouteCapability>()

  if (roles.some((role) => PLATFORM_ADMIN_ROLES.includes(role))) {
    [
      'read_assessment_progress',
      'platform_admin',
      'org_admin',
      'manage_content',
      'read_norm_tables',
      'manage_norm_tables',
      'manage_evaluation_plans',
      'evaluate_assessments',
      'audit_interpretation',
      'read_subjects',
      'read_assessment_records'
    ].forEach((capability) => capabilities.add(capability as RouteCapability))
    return capabilities
  }

  roles.forEach((role) => {
    (ROLE_CAPABILITY_MAP[role] || []).forEach((capability) => capabilities.add(capability))
  })

  return capabilities
}

export function buildAccessContext(roles: string[] | undefined, isClinician: boolean): AccessContext {
  const normalizedRoles = Array.from(new Set((roles || []).filter(Boolean)))
  const capabilities = deriveCapabilities(normalizedRoles)
  const isPlatformAdmin = normalizedRoles.some((role) => PLATFORM_ADMIN_ROLES.includes(role))

  return {
    roles: normalizedRoles,
    hasAnyRole: normalizedRoles.length > 0,
    isPlatformAdmin,
    isClinician,
    capabilities
  }
}

export function routeAllowsAccess(route: IRoute, access: AccessContext, profileFetchDone: boolean): boolean {
  if (!profileFetchDone) return true
  if (!access.hasAnyRole) return false

  if (route.requiresClinician && !access.isClinician) {
    return false
  }

  const resultRoute = route.requiredCapabilities?.includes('read_assessment_records')
  if (route.allowClinicianAccess && access.isClinician && !resultRoute) {
    return true
  }

  if (route.menuScope === 'platform_admin' && !access.isPlatformAdmin) {
    return false
  }

  if (access.isPlatformAdmin && route.menuScope !== 'clinician') {
    return true
  }

  if (route.requiredRoles?.length) {
    const hasRequiredRole = route.requiredRoles.some((role) => access.roles.includes(role))
    if (!hasRequiredRole) {
      return false
    }
  }

  if (route.requiredCapabilities?.length) {
    const hasRequiredCapability = route.requiredCapabilities.some((capability) => access.capabilities.has(capability))
    if (!hasRequiredCapability) {
      return false
    }
  }

  if (route.menuScope === 'clinician' && !access.isClinician) {
    return false
  }

  return true
}

export function getDefaultLandingPath(access: AccessContext): string {
  void access
  return '/'
}
