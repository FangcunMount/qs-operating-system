import type {
  GovernanceHealth,
  MetricEvidence,
  RawSystemGovernanceSignal,
  Signal
} from './types.shared'

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
  healthy: 2,
  info: 3
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const normalizeMetricEvidence = (items: unknown): MetricEvidence[] =>
  Array.isArray(items) ? items as MetricEvidence[] : []

export const dedupeMetricEvidence = (items: MetricEvidence[]): MetricEvidence[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.name}:${item.window}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const stringifyEvidenceValue = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return ''
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch (_error) {
      return String(value)
    }
  }
  return String(value)
}

export const normalizeSignalEvidence = (evidence: unknown): string[] => {
  if (Array.isArray(evidence)) {
    return evidence.map((line) => String(line)).filter((line) => line.length > 0)
  }
  if (typeof evidence === 'string') {
    const trimmed = evidence.trim()
    return trimmed ? [trimmed] : []
  }
  if (isRecord(evidence)) {
    return Object.keys(evidence)
      .sort()
      .map((key) => {
        const value = stringifyEvidenceValue(evidence[key])
        return value ? `${key}: ${value}` : key
      })
      .filter((line) => line.length > 0)
  }
  return []
}

export const normalizeSignals = (signals: RawSystemGovernanceSignal[] = []): Signal[] =>
  signals.map((signal) => ({
    ...signal,
    evidence: normalizeSignalEvidence(signal.evidence),
    metric_evidence: normalizeMetricEvidence(signal.metric_evidence)
  }))

export const sortSignalsBySeverity = (signals: Signal[] = []): Signal[] =>
  [...signals].sort((left, right) => {
    const leftOrder = SEVERITY_ORDER[left.severity] ?? 99
    const rightOrder = SEVERITY_ORDER[right.severity] ?? 99
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder
    }
    return left.title.localeCompare(right.title)
  })

export const severityToHealth = (severity?: string): GovernanceHealth => {
  if (severity === 'critical') {
    return 'critical'
  }
  if (severity === 'warning' || severity === 'degraded') {
    return 'degraded'
  }
  return 'healthy'
}

export const numberFrom = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export const stringFrom = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback
