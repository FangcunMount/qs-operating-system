import type {
  GovernanceOverviewResponse,
  RawSystemGovernanceOverviewResponse
} from './types.overview'
import {
  normalizeSignals,
  severityToHealth,
  sortSignalsBySeverity
} from './normalizers.shared'

export const normalizeSystemGovernanceOverview = (
  raw: RawSystemGovernanceOverviewResponse = {}
): GovernanceOverviewResponse => {
  const overallSeverity = raw.overall_severity || raw.health || 'healthy'
  return {
    generated_at: raw.generated_at,
    window: raw.window,
    overall_severity: overallSeverity,
    health: severityToHealth(overallSeverity),
    signals: sortSignalsBySeverity(normalizeSignals(raw.signals || [])),
    metrics: raw.metrics || { available: false, reason: 'metrics metadata unavailable' },
    domains: raw.domains
  }
}
