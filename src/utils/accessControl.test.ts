import { buildAccessContext } from './accessControl'

describe('assessment interpretation audit access', () => {
  it('exposes the audit drawer to qs admins and platform admins', () => {
    expect(buildAccessContext(['qs:admin'], false).capabilities.has('audit_interpretation')).toBe(true)
    expect(buildAccessContext(['platform:admin'], false).capabilities.has('audit_interpretation')).toBe(true)
  })

  it('does not expose the audit drawer to an evaluator-only role', () => {
    expect(buildAccessContext(['qs:evaluator'], false).capabilities.has('audit_interpretation')).toBe(false)
  })
})

describe('norm-table access', () => {
  it('allows content managers to read and import norm tables', () => {
    const access = buildAccessContext(['qs:content_manager'], false)
    expect(access.capabilities.has('read_norm_tables')).toBe(true)
    expect(access.capabilities.has('manage_norm_tables')).toBe(true)
  })

  it('does not expose norm-table administration to evaluators', () => {
    const access = buildAccessContext(['qs:evaluator'], false)
    expect(access.capabilities.has('read_norm_tables')).toBe(false)
    expect(access.capabilities.has('manage_norm_tables')).toBe(false)
  })
})
