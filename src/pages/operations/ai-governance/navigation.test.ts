import {
  pathForAIGovernanceView,
  viewFromAIGovernancePath
} from './navigation'

describe('AI governance navigation', () => {
  it('maps all five workspaces to stable deep routes', () => {
    expect(pathForAIGovernanceView('overview')).toBe('/operations/ai-governance')
    expect(pathForAIGovernanceView('evaluations')).toBe('/operations/ai-governance/evaluations')
    expect(pathForAIGovernanceView('reviews')).toBe('/operations/ai-governance/reviews')
    expect(pathForAIGovernanceView('profiles')).toBe('/operations/ai-governance/profiles')
    expect(pathForAIGovernanceView('runtime')).toBe('/operations/ai-governance/runtime')
  })

  it('uses the governance overview as the safe default workspace', () => {
    expect(viewFromAIGovernancePath('/operations/ai-governance')).toBe('overview')
    expect(viewFromAIGovernancePath('/operations/ai-governance/reviews')).toBe('reviews')
    expect(viewFromAIGovernancePath('/operations/ai-governance/unknown')).toBe('overview')
  })
})
