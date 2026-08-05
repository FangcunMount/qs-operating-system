export const SYSTEM_GOVERNANCE_BASE_PATH = '/operations/system-governance'

export type SystemGovernanceDataTab = 'overview' | 'events' | 'cache' | 'resilience' | 'recovery' | 'actions' | 'raw'

export type SystemGovernanceView =
  | 'overview'
  | 'issues'
  | 'events-drain'
  | 'events-retry'
  | 'events-runtime'
  | 'cache-runtime'
  | 'cache-policies'
  | 'cache-warmup'
  | 'resilience-queues'
  | 'resilience-dependencies'
  | 'resilience-capabilities'
  | 'recovery'
  | 'actions'
  | 'diagnostics'

export type SystemGovernanceSection = 'overview' | 'issues' | 'events' | 'cache' | 'resilience' | 'recovery' | 'actions' | 'diagnostics'

const VIEW_PATHS: Record<SystemGovernanceView, string> = {
  overview: SYSTEM_GOVERNANCE_BASE_PATH,
  issues: `${SYSTEM_GOVERNANCE_BASE_PATH}/issues`,
  'events-drain': `${SYSTEM_GOVERNANCE_BASE_PATH}/events/drain`,
  'events-retry': `${SYSTEM_GOVERNANCE_BASE_PATH}/events/retry`,
  'events-runtime': `${SYSTEM_GOVERNANCE_BASE_PATH}/events/runtime`,
  'cache-runtime': `${SYSTEM_GOVERNANCE_BASE_PATH}/cache/runtime`,
  'cache-policies': `${SYSTEM_GOVERNANCE_BASE_PATH}/cache/policies`,
  'cache-warmup': `${SYSTEM_GOVERNANCE_BASE_PATH}/cache/warmup`,
  'resilience-queues': `${SYSTEM_GOVERNANCE_BASE_PATH}/resilience/queues`,
  'resilience-dependencies': `${SYSTEM_GOVERNANCE_BASE_PATH}/resilience/dependencies`,
  'resilience-capabilities': `${SYSTEM_GOVERNANCE_BASE_PATH}/resilience/capabilities`,
  recovery: `${SYSTEM_GOVERNANCE_BASE_PATH}/recovery`,
  actions: `${SYSTEM_GOVERNANCE_BASE_PATH}/actions`,
  diagnostics: `${SYSTEM_GOVERNANCE_BASE_PATH}/diagnostics`
}

const PATH_VIEWS = Object.entries(VIEW_PATHS).reduce<Record<string, SystemGovernanceView>>(
  (result, [view, path]) => ({ ...result, [path]: view as SystemGovernanceView }),
  {}
)

const LEGACY_TAB_VIEWS: Record<string, SystemGovernanceView> = {
  overview: 'overview',
  events: 'events-drain',
  cache: 'cache-runtime',
  resilience: 'resilience-queues',
  recovery: 'recovery',
  actions: 'actions',
  raw: 'diagnostics'
}

export const pathForGovernanceView = (view: SystemGovernanceView): string => VIEW_PATHS[view]

export const viewFromGovernanceLocation = (pathname: string, search: string): SystemGovernanceView => {
  const normalizedPath = pathname.replace(/\/$/, '') || '/'
  if (normalizedPath === SYSTEM_GOVERNANCE_BASE_PATH) {
    const legacyTab = new URLSearchParams(search).get('tab')
    if (legacyTab && LEGACY_TAB_VIEWS[legacyTab]) return LEGACY_TAB_VIEWS[legacyTab]
  }
  const pathView = PATH_VIEWS[normalizedPath]
  if (pathView) return pathView
  return 'overview'
}

export const dataTabForView = (view: SystemGovernanceView): SystemGovernanceDataTab => {
  if (view.startsWith('events-')) return 'events'
  if (view.startsWith('cache-')) return 'cache'
  if (view.startsWith('resilience-')) return 'resilience'
  if (view === 'recovery') return 'recovery'
  if (view === 'actions') return 'actions'
  if (view === 'diagnostics') return 'raw'
  return 'overview'
}

export const sectionForGovernanceView = (view: SystemGovernanceView): SystemGovernanceSection => {
  if (view.startsWith('events-')) return 'events'
  if (view.startsWith('cache-')) return 'cache'
  if (view.startsWith('resilience-')) return 'resilience'
  return view as SystemGovernanceSection
}

export const defaultViewForDomain = (domain: string): SystemGovernanceView => {
  if (domain === 'events') return 'events-drain'
  if (domain === 'cache') return 'cache-runtime'
  if (domain === 'resilience') return 'resilience-queues'
  if (domain === 'checkpoint') return 'recovery'
  if (domain === 'actions') return 'actions'
  return 'issues'
}

export const legacyTabForLocation = (pathname: string, search: string): SystemGovernanceView | null => {
  if (pathname.replace(/\/$/, '') !== SYSTEM_GOVERNANCE_BASE_PATH) return null
  const tab = new URLSearchParams(search).get('tab')
  return tab ? LEGACY_TAB_VIEWS[tab] || null : null
}

export interface GovernanceNavigationItem {
  view: SystemGovernanceView
  label: string
}

export const PRIMARY_GOVERNANCE_NAVIGATION: GovernanceNavigationItem[] = [
  { view: 'overview', label: '治理总览' },
  { view: 'issues', label: '问题中心' },
  { view: 'events-drain', label: '事件投递' },
  { view: 'cache-runtime', label: '缓存运行' },
  { view: 'resilience-queues', label: '容量保护' },
  { view: 'recovery', label: '任务与恢复' },
  { view: 'actions', label: '操作中心' }
]

export const SECONDARY_GOVERNANCE_NAVIGATION: Partial<Record<SystemGovernanceSection, GovernanceNavigationItem[]>> = {
  events: [
    { view: 'events-drain', label: '排队与失败' },
    { view: 'events-retry', label: '重试候选' },
    { view: 'events-runtime', label: '运行拓扑与契约' }
  ],
  cache: [
    { view: 'cache-runtime', label: '运行状态' },
    { view: 'cache-policies', label: '策略中心' },
    { view: 'cache-warmup', label: '预热中心' }
  ],
  resilience: [
    { view: 'resilience-queues', label: '队列压力' },
    { view: 'resilience-dependencies', label: '依赖并发' },
    { view: 'resilience-capabilities', label: '保护能力' }
  ]
}
