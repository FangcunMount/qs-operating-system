import {
  getMatrixCell,
  getRolePermissionProfile,
  ROLE_PERMISSION_PROFILES
} from './rolePermissionMatrix'

describe('role permission matrix', () => {
  it('keeps process and result roles separated', () => {
    const operator = getRolePermissionProfile('qs:assessment_operator')
    const reviewer = getRolePermissionProfile('qs:result_reviewer')

    expect(operator?.uiCapabilities).toEqual([
      'read_subjects',
      'read_assessment_progress',
      'evaluate_assessments'
    ])
    expect(reviewer?.uiCapabilities).toEqual(['read_subjects', 'read_assessment_records'])
    expect(getMatrixCell('qs:assessment_operator', 'reports')).toBe('—')
    expect(getMatrixCell('qs:result_reviewer', 'batch_evaluate')).toBe('—')
    expect(getMatrixCell('qs:assessment_operator', 'retry_adhoc')).toBe('允许')
    expect(getMatrixCell('qs:evaluation_plan_manager', 'retry_plan')).toBe('允许')
  })

  it('covers the independent role dictionary', () => {
    expect(ROLE_PERMISSION_PROFILES.map((item) => item.key)).toEqual([
      'platform_admin',
      'iam_admin',
      'qs:admin',
      'qs:content_manager',
      'qs:assessment_operator',
      'qs:evaluation_plan_manager',
      'qs:result_reviewer'
    ])
  })
})
