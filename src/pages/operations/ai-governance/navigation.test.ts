import {
  pathForAIGovernanceView,
  viewFromAIGovernancePath
} from './navigation'

describe('AI governance navigation', () => {
  it('maps all four workspaces to stable deep routes', () => {
    expect(pathForAIGovernanceView('evaluations')).toBe('/operations/ai-governance/evaluations')
    expect(pathForAIGovernanceView('reviews')).toBe('/operations/ai-governance/reviews')
    expect(pathForAIGovernanceView('profiles')).toBe('/operations/ai-governance/profiles')
    expect(pathForAIGovernanceView('runtime')).toBe('/operations/ai-governance/runtime')
  })

  it('uses evaluation release as the safe default workspace', () => {
    expect(viewFromAIGovernancePath('/operations/ai-governance')).toBe('evaluations')
    expect(viewFromAIGovernancePath('/operations/ai-governance/reviews')).toBe('reviews')
    expect(viewFromAIGovernancePath('/operations/ai-governance/unknown')).toBe('evaluations')
  })
})
