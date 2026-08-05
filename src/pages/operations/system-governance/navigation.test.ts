import {
  dataTabForView,
  pathForGovernanceView,
  viewFromGovernanceLocation
} from './navigation'

describe('system governance navigation', () => {
  it('maps product routes to independently addressable views', () => {
    expect(viewFromGovernanceLocation('/operations/system-governance/events/retry', '')).toBe('events-retry')
    expect(viewFromGovernanceLocation('/operations/system-governance/cache/policies', '')).toBe('cache-policies')
    expect(viewFromGovernanceLocation('/operations/system-governance/resilience/dependencies', '')).toBe('resilience-dependencies')
    expect(pathForGovernanceView('cache-warmup')).toBe('/operations/system-governance/cache/warmup')
  })

  it('keeps legacy tab query links readable during the route migration', () => {
    expect(viewFromGovernanceLocation('/operations/system-governance', '?tab=events')).toBe('events-drain')
    expect(viewFromGovernanceLocation('/operations/system-governance', '?tab=raw')).toBe('diagnostics')
    expect(dataTabForView('events-runtime')).toBe('events')
    expect(dataTabForView('issues')).toBe('overview')
  })
})
