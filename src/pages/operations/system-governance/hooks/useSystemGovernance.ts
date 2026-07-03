import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import {
  ActionDescriptor,
  GovernanceCacheResponse,
  GovernanceEventsResponse,
  GovernanceOverviewResponse,
  GovernanceResilienceResponse,
  GovernanceWindow,
  Signal,
  getSystemGovernanceActions,
  getSystemGovernanceCache,
  getSystemGovernanceEvents,
  getSystemGovernanceOverview,
  getSystemGovernanceResilience,
  sortSignalsBySeverity,
  normalizeSignals
} from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'

export type SystemGovernanceTab = 'events' | 'cache' | 'resilience' | 'actions' | 'raw'

const TAB_VALUES: SystemGovernanceTab[] = ['events', 'cache', 'resilience', 'actions', 'raw']

export const parseSystemGovernanceTab = (value?: string | null): SystemGovernanceTab =>
  TAB_VALUES.includes(value as SystemGovernanceTab) ? value as SystemGovernanceTab : 'events'

export const parseSystemGovernanceWindow = (value?: string | null): GovernanceWindow => {
  if (value === '15m' || value === '1h') {
    return value
  }
  return '5m'
}

interface UseSystemGovernanceResult {
  activeTab: SystemGovernanceTab
  window: GovernanceWindow
  overview: GovernanceOverviewResponse | null
  actions: ActionDescriptor[]
  events: GovernanceEventsResponse | null
  cache: GovernanceCacheResponse | null
  resilience: GovernanceResilienceResponse | null
  signals: Signal[]
  loading: boolean
  error: string
  setQuery: (patch: { tab?: SystemGovernanceTab; window?: GovernanceWindow }) => void
  reload: () => void
}

export const useSystemGovernance = (): UseSystemGovernanceResult => {
  const location = useLocation()
  const history = useHistory()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeTab = parseSystemGovernanceTab(searchParams.get('tab'))
  const window = parseSystemGovernanceWindow(searchParams.get('window'))

  const [overview, setOverview] = useState<GovernanceOverviewResponse | null>(null)
  const [actions, setActions] = useState<ActionDescriptor[]>([])
  const [events, setEvents] = useState<GovernanceEventsResponse | null>(null)
  const [cache, setCache] = useState<GovernanceCacheResponse | null>(null)
  const [resilience, setResilience] = useState<GovernanceResilienceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const setQuery = useCallback((patch: { tab?: SystemGovernanceTab; window?: GovernanceWindow }) => {
    const next = new URLSearchParams(location.search)
    if (patch.tab) {
      next.set('tab', patch.tab)
    }
    if (patch.window) {
      next.set('window', patch.window)
    }
    history.replace({ pathname: location.pathname, search: next.toString() })
  }, [history, location.pathname, location.search])

  const loadCore = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    const [overviewResult, actionsResult] = await Promise.all([
      getSystemGovernanceOverview(window),
      getSystemGovernanceActions()
    ])
    const [overviewError, overviewResponse] = overviewResult
    const [, actionsResponse] = actionsResult
    if (overviewError || !overviewResponse?.data) {
      setError(extractErrorMessage(overviewError, '获取系统治理概览失败'))
      if (!silent) {
        setLoading(false)
      }
      return
    }
    setOverview(overviewResponse.data)
    setActions(actionsResponse?.data?.actions || [])
    setError('')
    if (!silent) {
      setLoading(false)
    }
  }, [window])

  const loadTabData = useCallback(async () => {
    if (activeTab === 'events') {
      const [, response] = await getSystemGovernanceEvents(window)
      setEvents(response?.data || null)
      return
    }
    if (activeTab === 'cache') {
      const [, response] = await getSystemGovernanceCache(window)
      setCache(response?.data || null)
      return
    }
    if (activeTab === 'resilience') {
      const [, response] = await getSystemGovernanceResilience(window)
      setResilience(response?.data || null)
    }
  }, [activeTab, window])

  useEffect(() => {
    void loadCore()
  }, [loadCore])

  useEffect(() => {
    void loadTabData()
  }, [loadTabData])

  const signals = useMemo(
    () => sortSignalsBySeverity(normalizeSignals(overview?.signals || [])),
    [overview?.signals]
  )

  return {
    activeTab,
    window,
    overview,
    actions,
    events,
    cache,
    resilience,
    signals,
    loading,
    error,
    setQuery,
    reload: () => {
      void loadCore(true)
      void loadTabData()
    }
  }
}
