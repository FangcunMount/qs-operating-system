import { useCallback, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { GovernanceWindow } from '@/api/path/systemGovernance'

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

interface UseSystemGovernanceQueryResult {
  activeTab: SystemGovernanceTab
  window: GovernanceWindow
  setQuery: (patch: { tab?: SystemGovernanceTab; window?: GovernanceWindow }) => void
}

export const useSystemGovernanceQuery = (): UseSystemGovernanceQueryResult => {
  const location = useLocation()
  const history = useHistory()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeTab = parseSystemGovernanceTab(searchParams.get('tab'))
  const window = parseSystemGovernanceWindow(searchParams.get('window'))

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

  return {
    activeTab,
    window,
    setQuery
  }
}
