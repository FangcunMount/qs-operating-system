import {
  normalizeSignalEvidence,
  normalizeSignals,
  sortSignalsBySeverity
} from './normalizers.shared'

describe('systemGovernance shared normalizers', () => {
  it('normalizes string and object evidence into display lines', () => {
    expect(normalizeSignalEvidence('queue depth high')).toEqual(['queue depth high'])
    expect(normalizeSignalEvidence(['a', 'b'])).toEqual(['a', 'b'])
    expect(normalizeSignalEvidence({ count: 3, store: 'mysql' })).toEqual(['count: 3', 'store: mysql'])
    expect(normalizeSignalEvidence(null)).toEqual([])
  })

  it('normalizes signals from API drift', () => {
    const normalized = normalizeSignals([
      {
        id: '1',
        domain: 'events',
        severity: 'warning',
        status: 'warn',
        title: 'backlog',
        evidence: 'single line' as unknown as string[]
      }
    ])
    expect(normalized[0].evidence).toEqual(['single line'])
  })

  it('sorts signals by severity', () => {
    const sorted = sortSignalsBySeverity([
      { id: '1', domain: 'system', severity: 'info', status: 'ok', title: 'b', evidence: [] },
      { id: '2', domain: 'system', severity: 'critical', status: 'bad', title: 'a', evidence: [] },
      { id: '3', domain: 'system', severity: 'warning', status: 'warn', title: 'c', evidence: [] }
    ])
    expect(sorted.map((item) => item.severity)).toEqual(['critical', 'warning', 'info'])
  })
})
