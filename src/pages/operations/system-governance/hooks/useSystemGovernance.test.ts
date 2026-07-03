import { sortSignalsBySeverity } from '@/api/path/systemGovernance'
import eventBacklogFixture from '@/api/path/__fixtures__/systemGovernance.event-backlog.json'

describe('systemGovernance signal helpers', () => {
  it('sorts fixture signals by severity', () => {
    const sorted = sortSignalsBySeverity([
      ...eventBacklogFixture.signals,
      {
        id: 'system.info',
        domain: 'system',
        severity: 'info',
        status: 'ok',
        title: 'info',
        evidence: []
      }
    ])
    expect(sorted[0].severity).toBe('warning')
    expect(sorted[sorted.length - 1].severity).toBe('info')
  })
})
