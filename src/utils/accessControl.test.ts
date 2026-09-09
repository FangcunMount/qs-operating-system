import { buildAccessContext } from './accessControl'

describe('assessment interpretation audit access', () => {
  it('exposes the audit drawer to qs admins and platform admins', () => {
    expect(buildAccessContext(['qs:admin'], false).capabilities.has('audit_interpretation')).toBe(true)
    expect(buildAccessContext(['platform_admin'], false).capabilities.has('audit_interpretation')).toBe(true)
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


describe('independent business roles', () => {
  it('separates process operations from professional results', () => {
    const ops = buildAccessContext(['qs:assessment_operator'], false)
    expect(ops.capabilities.has('read_assessment_progress')).toBe(true)
    expect(ops.capabilities.has('evaluate_assessments')).toBe(true)
    expect(ops.capabilities.has('read_assessment_records')).toBe(false)
    const reviewer = buildAccessContext(['qs:result_reviewer'], false)
    expect(reviewer.capabilities.has('read_assessment_records')).toBe(true)
    expect(reviewer.capabilities.has('evaluate_assessments')).toBe(false)
  })
})
