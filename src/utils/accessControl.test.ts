import { buildAccessContext, routeAllowsAccess } from './accessControl'
import type { IRoute } from '@/types/router'

describe('assessment interpretation audit access', () => {
  it('exposes the audit drawer to qs admins and platform admins', () => {
    expect(buildAccessContext(['qs:admin'], false).capabilities.has('audit_interpretation')).toBe(true)
    expect(buildAccessContext(['platform_admin'], false).capabilities.has('audit_interpretation')).toBe(true)
  })

  it('does not expose the audit drawer to process-only operators', () => {
    expect(buildAccessContext(['qs:assessment_operator'], false).capabilities.has('audit_interpretation')).toBe(false)
  })
})

describe('norm-table access', () => {
  it('allows content managers to read and import norm tables', () => {
    const access = buildAccessContext(['qs:content_manager'], false)
    expect(access.capabilities.has('read_norm_tables')).toBe(true)
    expect(access.capabilities.has('manage_norm_tables')).toBe(true)
  })

  it('does not expose norm-table administration to result reviewers', () => {
    const access = buildAccessContext(['qs:result_reviewer'], false)
    expect(access.capabilities.has('read_norm_tables')).toBe(false)
    expect(access.capabilities.has('manage_norm_tables')).toBe(false)
  })
})

describe('independent business roles', () => {
  it('combines independent jobs without granting audit capability', () => {
    const access = buildAccessContext(['qs:assessment_operator', 'qs:result_reviewer'], true)
    expect(access.capabilities.has('read_assessment_progress')).toBe(true)
    expect(access.capabilities.has('read_assessment_records')).toBe(true)
    expect(access.capabilities.has('evaluate_assessments')).toBe(true)
    expect(access.capabilities.has('audit_interpretation')).toBe(false)
  })
  it('separates process operations from professional results', () => {
    const ops = buildAccessContext(['qs:assessment_operator'], false)
    expect(ops.capabilities.has('read_assessment_progress')).toBe(true)
    expect(ops.capabilities.has('evaluate_assessments')).toBe(true)
    expect(ops.capabilities.has('read_assessment_records')).toBe(false)
    const reviewer = buildAccessContext(['qs:result_reviewer'], false)
    expect(reviewer.capabilities.has('read_assessment_records')).toBe(true)
    expect(reviewer.capabilities.has('evaluate_assessments')).toBe(false)
  })

  it('requires result capability even when the user is a clinician', () => {
    const resultRoute: IRoute = {
      title: '测评记录',
      name: 'assessment-records',
      path: '/assessment/list',
      requiredCapabilities: ['read_assessment_records'],
      allowClinicianAccess: true
    }
    const clinicianOperator = buildAccessContext(['qs:assessment_operator'], true)
    expect(routeAllowsAccess(resultRoute, clinicianOperator, true)).toBe(false)

    const clinicianReviewer = buildAccessContext(['qs:result_reviewer'], true)
    expect(routeAllowsAccess(resultRoute, clinicianReviewer, true)).toBe(true)
  })
})
