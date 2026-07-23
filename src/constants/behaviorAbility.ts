import type { AssessmentModelKind } from '@/models/assessmentModel'

export type BehaviorAbilityAlgorithm = 'brief2' | 'spm_sensory'

export interface BehaviorAbilityModelProfile {
  key: BehaviorAbilityAlgorithm
  label: string
  kind: Extract<AssessmentModelKind, 'behavioral_rating' | 'cognitive'>
  algorithm: BehaviorAbilityAlgorithm
}

export const BEHAVIOR_ABILITY_MODEL_PROFILES: BehaviorAbilityModelProfile[] = [
  {
    key: 'brief2',
    label: 'BRIEF-2 执行功能行为评定',
    kind: 'behavioral_rating',
    algorithm: 'brief2',
  },
  {
    key: 'spm_sensory',
    label: '感觉统合 SPM',
    kind: 'behavioral_rating',
    algorithm: 'spm_sensory',
  }
]

export const getBehaviorAbilityProfile = (algorithm?: string): BehaviorAbilityModelProfile | undefined =>
  BEHAVIOR_ABILITY_MODEL_PROFILES.find((item) => item.algorithm === algorithm)

export const isBehaviorAbilityModel = (model: { kind?: string; algorithm?: string }): boolean =>
  (model.kind === 'behavioral_rating' || model.kind === 'cognitive') && Boolean(getBehaviorAbilityProfile(model.algorithm))
