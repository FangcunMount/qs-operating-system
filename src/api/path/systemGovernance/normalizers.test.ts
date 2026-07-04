import healthyFixture from '../__fixtures__/systemGovernance.healthy.json'
import {
  normalizeSignalEvidence,
  normalizeSystemGovernanceOverview
} from './normalizers'

describe('systemGovernance normalizers barrel', () => {
  it('re-exports shared helpers and domain normalizers', () => {
    expect(normalizeSignalEvidence({ count: 3, store: 'mysql' })).toEqual(['count: 3', 'store: mysql'])
    expect(normalizeSystemGovernanceOverview(healthyFixture).health).toBe('healthy')
  })
})
