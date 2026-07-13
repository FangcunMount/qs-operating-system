import { resolveBehaviorAbilityIssueTab } from './behaviorAbilityIssueRouter'

describe('behavior ability DefinitionV2 issue routing', () => {
  it('routes execution and norm validation fields to their dedicated tabs', () => {
    expect(resolveBehaviorAbilityIssueTab({ field: 'execution.spm.item_sets', code: 'spm.question.duplicate', message: 'duplicate' })).toBe(
      'execution'
    )
    expect(resolveBehaviorAbilityIssueTab({ field: 'calibration.norm_refs', code: 'norm.not_found', message: 'missing' })).toBe('norm')
    expect(resolveBehaviorAbilityIssueTab({ field: 'Measure.Scoring', message: 'invalid' })).toBe('measure')
    expect(resolveBehaviorAbilityIssueTab({ field: 'future.server_field', message: 'unknown' })).toBe('json')
  })
})
