import { BEHAVIOR_ABILITY_MODEL_PROFILES, COGNITIVE_MODEL_PROFILES } from '@/constants/behaviorAbility'
import type { BehaviorAbilityModelProfile } from '@/constants/behaviorAbility'
import { behaviorAbilityStore, cognitiveAbilityStore } from '@/store/behaviorAbility'
import type { BehaviorAbilityStore } from '@/store/behaviorAbility'
import { behaviorAbilityEditorFlowConfig, cognitiveEditorFlowConfig } from '@/utils/behaviorAbilityFlow'
import type { EditorFlowConfig } from '@/utils/editorFlow'

export interface AbilityEditorProduct {
  kind: 'behavioral_rating' | 'cognitive'
  basePath: '/behavioral-rating' | '/cognitive'
  title: string
  description: string
  newLabel: string
  profiles: BehaviorAbilityModelProfile[]
  store: BehaviorAbilityStore
  flow: EditorFlowConfig
}

const BEHAVIORAL_RATING_PRODUCT: AbilityEditorProduct = {
  kind: 'behavioral_rating',
  basePath: '/behavioral-rating',
  title: '行为评分模型',
  description: '管理 BRIEF-2 与感觉统合 SPM 的模型、问卷、常模和发布状态',
  newLabel: '新建行为评分模型',
  profiles: BEHAVIOR_ABILITY_MODEL_PROFILES,
  store: behaviorAbilityStore,
  flow: behaviorAbilityEditorFlowConfig
}

const COGNITIVE_PRODUCT: AbilityEditorProduct = {
  kind: 'cognitive',
  basePath: '/cognitive',
  title: '认知测评模型',
  description: '管理 SPM 认知推理模型、题组、计分、解释和发布状态',
  newLabel: '新建认知测评模型',
  profiles: COGNITIVE_MODEL_PROFILES,
  store: cognitiveAbilityStore,
  flow: cognitiveEditorFlowConfig
}

export const getAbilityEditorProduct = (pathname: string): AbilityEditorProduct =>
  pathname.startsWith('/cognitive') ? COGNITIVE_PRODUCT : BEHAVIORAL_RATING_PRODUCT
