import { useCallback, useEffect, useState } from 'react'
import {
  ActionDescriptor,
  GovernanceCacheResponse,
  GovernanceEventsResponse,
  GovernanceOverviewResponse,
  GovernanceResilienceResponse,
  GovernanceWindow,
  getSystemGovernanceActions,
  getSystemGovernanceCache,
  getSystemGovernanceEvents,
  getSystemGovernanceOverview,
  getSystemGovernanceResilience
} from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { SystemGovernanceView } from '../navigation'

interface UseSystemGovernanceLoaderResult {
  overview: GovernanceOverviewResponse | null
  actions: ActionDescriptor[]
  events: GovernanceEventsResponse | null
  cache: GovernanceCacheResponse | null
  resilience: GovernanceResilienceResponse | null
  loading: boolean
  error: string
  reload: () => void
}

export const useSystemGovernanceLoader = (
  activeView: SystemGovernanceView,
  window: GovernanceWindow
): UseSystemGovernanceLoaderResult => {
  const [overview, setOverview] = useState<GovernanceOverviewResponse | null>(null)
  const [actions, setActions] = useState<ActionDescriptor[]>([])
  const [events, setEvents] = useState<GovernanceEventsResponse | null>(null)
  const [cache, setCache] = useState<GovernanceCacheResponse | null>(null)
  const [resilience, setResilience] = useState<GovernanceResilienceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    if (activeView === 'events-drain' || activeView === 'events-runtime') {
      const [, response] = await getSystemGovernanceEvents(window)
      setEvents(response?.data || null)
      return
    }
    if (activeView.startsWith('cache-')) {
      const [, response] = await getSystemGovernanceCache(window)
      setCache(response?.data || null)
      return
    }
    if (activeView.startsWith('resilience-')) {
      const [, response] = await getSystemGovernanceResilience(window)
      setResilience(response?.data || null)
      return
    }
    if (activeView === 'diagnostics') {
      const [eventsResult, cacheResult, resilienceResult] = await Promise.all([
        getSystemGovernanceEvents(window),
        getSystemGovernanceCache(window),
        getSystemGovernanceResilience(window)
      ])
      setEvents(eventsResult[1]?.data || null)
      setCache(cacheResult[1]?.data || null)
      setResilience(resilienceResult[1]?.data || null)
    }
  }, [activeView, window])

  useEffect(() => {
    void loadCore()
  }, [loadCore])

  useEffect(() => {
    void loadTabData()
  }, [loadTabData])

  const reload = useCallback(() => {
    void loadCore(true)
    void loadTabData()
  }, [loadCore, loadTabData])

  return {
    overview,
    actions,
    events,
    cache,
    resilience,
    loading,
    error,
    reload
  }
}
