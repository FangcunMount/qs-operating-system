import type { AssessmentModelKind } from '@/models/assessmentModel'

export const BEHAVIOR_ABILITY_PRODUCT_CHANNEL = 'behavior_ability'

export type BehaviorAbilityAlgorithm = 'brief2' | 'spm_sensory'

export interface BehaviorAbilityModelProfile {
  key: BehaviorAbilityAlgorithm
  label: string
  kind: Extract<AssessmentModelKind, 'behavioral_rating' | 'cognitive'>
  algorithm: BehaviorAbilityAlgorithm
  productChannel: typeof BEHAVIOR_ABILITY_PRODUCT_CHANNEL
}

export const BEHAVIOR_ABILITY_MODEL_PROFILES: BehaviorAbilityModelProfile[] = [
  {
    key: 'brief2',
    label: 'BRIEF-2 执行功能行为评定',
    kind: 'behavioral_rating',
    algorithm: 'brief2',
    productChannel: BEHAVIOR_ABILITY_PRODUCT_CHANNEL
  },
  {
    key: 'spm_sensory',
    label: '感觉统合 SPM',
    kind: 'behavioral_rating',
    algorithm: 'spm_sensory',
    productChannel: BEHAVIOR_ABILITY_PRODUCT_CHANNEL
  }
]

export const getBehaviorAbilityProfile = (algorithm?: string): BehaviorAbilityModelProfile | undefined =>
  BEHAVIOR_ABILITY_MODEL_PROFILES.find((item) => item.algorithm === algorithm)

export const isBehaviorAbilityModel = (model: { kind?: string; algorithm?: string; product_channel?: string }): boolean =>
  model.product_channel === BEHAVIOR_ABILITY_PRODUCT_CHANNEL && Boolean(getBehaviorAbilityProfile(model.algorithm))
