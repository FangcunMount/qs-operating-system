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
