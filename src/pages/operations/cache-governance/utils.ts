import {
  CACHE_GOVERNANCE_WARMUP_KINDS,
  CacheGovernanceWarmupKind,
  ICacheGovernanceManualWarmupTarget
} from '@/api/path/cacheGovernance'

export const DEFAULT_MANUAL_WARMUP_TARGET: ICacheGovernanceManualWarmupTarget = {
  kind: 'static.scale',
  scope: ''
}

export const getWarmupScopePlaceholder = (kind: CacheGovernanceWarmupKind, orgId?: number): string => {
  switch (kind) {
  case 'static.scale':
    return 'scale:S-001'
  case 'static.questionnaire':
    return 'questionnaire:Q-001'
  case 'static.scale_list':
    return 'published'
  case 'query.stats_system':
    return `org:${orgId || 1}`
  case 'query.stats_questionnaire':
    return `org:${orgId || 1}:questionnaire:Q-001`
  case 'query.stats_plan':
    return `org:${orgId || 1}:plan:123`
  default:
    return ''
  }
}

const getScopeOrgId = (kind: CacheGovernanceWarmupKind, scope: string): number | undefined => {
  let match: RegExpMatchArray | null = null
  if (kind === 'query.stats_system') {
    match = scope.match(/^org:(\d+)$/)
  }
  if (kind === 'query.stats_questionnaire') {
    match = scope.match(/^org:(\d+):questionnaire:[^:\s]+$/)
  }
  if (kind === 'query.stats_plan') {
    match = scope.match(/^org:(\d+):plan:[^:\s]+$/)
  }
  if (!match) {
    return undefined
  }
  const orgId = Number(match[1])
  return Number.isSafeInteger(orgId) ? orgId : undefined
}

export const validateManualWarmupTargets = (
  targets: ICacheGovernanceManualWarmupTarget[],
  currentOrgId?: number
): { validTargets?: ICacheGovernanceManualWarmupTarget[]; message?: string } => {
  if (!targets.length) {
    return { message: '至少添加一个预热目标' }
  }

  const validTargets = targets.map((item) => ({
    kind: item.kind,
    scope: item.scope.trim()
  }))

  for (let index = 0; index < validTargets.length; index += 1) {
    const item = validTargets[index]
    const prefix = `第 ${index + 1} 个目标`

    if (!CACHE_GOVERNANCE_WARMUP_KINDS.includes(item.kind)) {
      return { message: `${prefix} 的预热类型不受支持` }
    }

    if (!item.scope) {
      return { message: `${prefix} 的 scope 不能为空` }
    }

    switch (item.kind) {
    case 'static.scale':
      if (!/^scale:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 scale:S-001` }
      }
      break
    case 'static.questionnaire':
      if (!/^questionnaire:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 questionnaire:Q-001` }
      }
      break
    case 'static.scale_list':
      if (item.scope !== 'published') {
        return { message: `${prefix} 的 scope 目前只支持 published` }
      }
      break
    case 'query.stats_system':
      if (!/^org:(\d+)$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 org:1` }
      }
      break
    case 'query.stats_questionnaire':
      if (!/^org:(\d+):questionnaire:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 org:1:questionnaire:Q-001` }
      }
      break
    case 'query.stats_plan':
      if (!/^org:(\d+):plan:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 org:1:plan:123` }
      }
      break
    default:
      return { message: `${prefix} 的预热类型不受支持` }
    }

    if (item.kind.startsWith('query.')) {
      const scopeOrgId = getScopeOrgId(item.kind, item.scope)
      if (!currentOrgId) {
        return { message: `${prefix} 需要当前登录态具备受保护组织上下文` }
      }
      if (!scopeOrgId || scopeOrgId !== currentOrgId) {
        return { message: `${prefix} 的 org 必须与当前组织 ${currentOrgId} 完全一致` }
      }
    }
  }

  return { validTargets }
}
