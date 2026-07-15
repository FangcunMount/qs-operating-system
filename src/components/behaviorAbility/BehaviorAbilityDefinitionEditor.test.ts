import { normalizeBehaviorAbilityDefinitionTab } from './BehaviorAbilityDefinitionEditor'

describe('behavior ability definition tab compatibility', () => {
  it('keeps legacy issue links pointing to their replacement configuration tabs', () => {
    expect(normalizeBehaviorAbilityDefinitionTab('measure')).toBe('factor_graph')
    expect(normalizeBehaviorAbilityDefinitionTab('norm')).toBe('interpretation')
    expect(normalizeBehaviorAbilityDefinitionTab('question_mapping')).toBe('question_mapping')
    expect(normalizeBehaviorAbilityDefinitionTab('unknown')).toBeUndefined()
  })
})
