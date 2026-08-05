import React from 'react'
import { Redirect, useLocation } from 'react-router-dom'
import { pathForGovernanceView, SystemGovernanceView } from './navigation'

const LEGACY_VIEW_MAP: Record<string, SystemGovernanceView> = {
  'event-governance': 'events-drain',
  'cache-governance': 'cache-runtime',
  'resilience-governance': 'resilience-queues'
}

interface LegacyGovernanceRedirectProps {
  legacyKey: keyof typeof LEGACY_VIEW_MAP
}

export const LegacyGovernanceRedirect: React.FC<LegacyGovernanceRedirectProps> = ({ legacyKey }) => {
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  params.delete('tab')
  const search = params.toString()
  return <Redirect to={`${pathForGovernanceView(LEGACY_VIEW_MAP[legacyKey])}${search ? `?${search}` : ''}`} />
}

export default LegacyGovernanceRedirect
