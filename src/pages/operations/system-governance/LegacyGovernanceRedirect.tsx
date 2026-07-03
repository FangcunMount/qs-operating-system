import React from 'react'
import { Redirect, useLocation } from 'react-router-dom'

const LEGACY_TAB_MAP: Record<string, string> = {
  'event-governance': 'events',
  'cache-governance': 'cache',
  'resilience-governance': 'resilience'
}

interface LegacyGovernanceRedirectProps {
  legacyKey: keyof typeof LEGACY_TAB_MAP
}

export const LegacyGovernanceRedirect: React.FC<LegacyGovernanceRedirectProps> = ({ legacyKey }) => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  if (!params.get('tab')) {
    params.set('tab', LEGACY_TAB_MAP[legacyKey])
  }
  const search = params.toString()
  return <Redirect to={`/operations/system-governance${search ? `?${search}` : ''}`} />
}

export default LegacyGovernanceRedirect
