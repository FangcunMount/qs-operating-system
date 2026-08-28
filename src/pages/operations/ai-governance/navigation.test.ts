import {
  AI_GOVERNANCE_NAVIGATION,
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

  it('states that semantic judging is conditional rather than an unconditional 35 calls', () => {
    const evaluations = AI_GOVERNANCE_NAVIGATION.find((item) => item.view === 'evaluations')
    expect(evaluations?.description).toBe('冻结发布身份，执行 35 次生成与最多 35 次独立模型裁判并完成终审。')
  })
})
