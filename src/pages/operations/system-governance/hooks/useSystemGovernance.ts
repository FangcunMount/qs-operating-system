import { useMemo } from 'react'
import {
  ActionDescriptor,
  GovernanceCacheResponse,
  GovernanceEventsResponse,
  GovernanceOverviewResponse,
  GovernanceResilienceResponse,
  GovernanceWindow,
  Signal,
  sortSignalsBySeverity,
  normalizeSignals
} from '@/api/path/systemGovernance'
import {
  SystemGovernanceTab,
  parseSystemGovernanceTab,
  parseSystemGovernanceWindow,
  useSystemGovernanceQuery
} from './useSystemGovernanceQuery'
import { useSystemGovernanceLoader } from './useSystemGovernanceLoader'
import type { SystemGovernanceView } from '../navigation'

export type { SystemGovernanceTab }
export { parseSystemGovernanceTab, parseSystemGovernanceWindow }

interface UseSystemGovernanceResult {
  activeView: SystemGovernanceView
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
  setQuery: (patch: { view?: SystemGovernanceView; window?: GovernanceWindow }) => void
  reload: () => void
}

export const useSystemGovernance = (): UseSystemGovernanceResult => {
  const { activeView, activeTab, window, setQuery } = useSystemGovernanceQuery()
  const {
    overview,
    actions,
    events,
    cache,
    resilience,
    loading,
    error,
    reload
  } = useSystemGovernanceLoader(activeView, window)

  const signals = useMemo(
    () => sortSignalsBySeverity(normalizeSignals(overview?.signals || [])),
    [overview?.signals]
  )

  return {
    activeView,
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
    reload
  }
}
