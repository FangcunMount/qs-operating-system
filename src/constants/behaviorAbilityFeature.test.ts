import { isBehaviorAbilityPublishingEnabled } from './behaviorAbilityFeature'

describe('behavior ability publishing feature', () => {
  const original = process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED

  afterEach(() => {
    if (typeof original === 'undefined') delete process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED
    else process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED = original
  })

  it('is enabled by default after the norm-table rollout', () => {
    delete process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED
    expect(isBehaviorAbilityPublishingEnabled()).toBe(true)
  })

  it('retains an explicit rollback switch', () => {
    process.env.REACT_APP_BEHAVIOR_ABILITY_PUBLISH_ENABLED = 'false'
    expect(isBehaviorAbilityPublishingEnabled()).toBe(false)
  })
})
