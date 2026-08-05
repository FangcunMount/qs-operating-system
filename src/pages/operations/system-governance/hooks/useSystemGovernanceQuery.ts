import { useCallback, useEffect, useMemo } from 'react'
import { useHistory, useLocation } from 'react-router-dom'
import { GovernanceWindow } from '@/api/path/systemGovernance'
import {
  dataTabForView,
  legacyTabForLocation,
  pathForGovernanceView,
  SystemGovernanceDataTab,
  SystemGovernanceView,
  viewFromGovernanceLocation
} from '../navigation'

export type SystemGovernanceTab = SystemGovernanceDataTab

export const parseSystemGovernanceTab = (value?: string | null): SystemGovernanceTab =>
  dataTabForView(viewFromGovernanceLocation('/operations/system-governance', value ? `?tab=${value}` : ''))

export const parseSystemGovernanceWindow = (value?: string | null): GovernanceWindow => {
  if (value === '15m' || value === '1h') {
    return value
  }
  return '5m'
}

interface UseSystemGovernanceQueryResult {
  activeView: SystemGovernanceView
  activeTab: SystemGovernanceTab
  window: GovernanceWindow
  setQuery: (patch: { view?: SystemGovernanceView; window?: GovernanceWindow }) => void
}

export const useSystemGovernanceQuery = (): UseSystemGovernanceQueryResult => {
  const location = useLocation()
  const history = useHistory()
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeView = viewFromGovernanceLocation(location.pathname, location.search)
  const activeTab = dataTabForView(activeView)
  const window = parseSystemGovernanceWindow(searchParams.get('window'))

  useEffect(() => {
    const legacyView = legacyTabForLocation(location.pathname, location.search)
    if (!legacyView) return
    const next = new URLSearchParams(location.search)
    next.delete('tab')
    history.replace({ pathname: pathForGovernanceView(legacyView), search: next.toString() })
  }, [history, location.pathname, location.search])

  const setQuery = useCallback((patch: { view?: SystemGovernanceView; window?: GovernanceWindow }) => {
    const next = new URLSearchParams(location.search)
    next.delete('tab')
    if (patch.window) {
      next.set('window', patch.window)
    }
    history.push({ pathname: pathForGovernanceView(patch.view || activeView), search: next.toString() })
  }, [activeView, history, location.search])

  return {
    activeView,
    activeTab,
    window,
    setQuery
  }
}
