import type { AssessmentModelKind, AssessmentModelSubKind } from '@/models/assessmentModel'

export const PERSONALITY_KIND: AssessmentModelKind = 'personality'
export const PERSONALITY_SUB_KIND: AssessmentModelSubKind = 'typology'

export const PERSONALITY_TYPOLOGY_ALGORITHMS = [
  'mbti',
  'sbti',
  'bigfive',
  'custom_typology'
] as const

export type PersonalityTypologyAlgorithm = typeof PERSONALITY_TYPOLOGY_ALGORITHMS[number]

export const DEFAULT_PERSONALITY_ALGORITHM_OPTIONS: Array<{ value: PersonalityTypologyAlgorithm; label: string }> = [
  { value: 'mbti', label: 'MBTI' },
  { value: 'sbti', label: 'SBTI' },
  { value: 'bigfive', label: 'Big Five' },
  { value: 'custom_typology', label: '自定义类型' }
]

export const ALGORITHM_TO_DECISION_KIND: Record<PersonalityTypologyAlgorithm, string> = {
  mbti: 'pole_composition',
  sbti: 'nearest_pattern',
  bigfive: 'trait_profile',
  custom_typology: 'custom_typology'
}

const CANONICAL_DECISION_KINDS = new Set(Object.values(ALGORITHM_TO_DECISION_KIND))

export const PERSONALITY_DECISION_OPTIONS: Record<
  PersonalityTypologyAlgorithm,
  Array<{ value: string; label: string }>
> = {
  mbti: [{ value: 'pole_composition', label: 'MBTI 极性组合' }],
  sbti: [{ value: 'nearest_pattern', label: 'SBTI 最近模式' }],
  bigfive: [{ value: 'trait_profile', label: 'BigFive 特质画像' }],
  custom_typology: [{ value: 'custom_typology', label: '自定义类型' }]
}

export const normalizeLegacyDecisionKind = (decisionKind?: string): string | undefined => {
  if (!decisionKind) return decisionKind
  if (CANONICAL_DECISION_KINDS.has(decisionKind)) return decisionKind
  if (isPersonalityTypologyAlgorithm(decisionKind)) {
    return ALGORITHM_TO_DECISION_KIND[decisionKind]
  }
  return decisionKind
}

export const getDecisionKindForAlgorithm = (algorithm?: string): string => {
  const normalized = normalizePersonalityAlgorithm(algorithm)
  return ALGORITHM_TO_DECISION_KIND[normalized]
}

export const normalizeDecisionKindForAlgorithm = (
  algorithm?: string,
  decisionKind?: string
): string => {
  const normalizedAlgorithm = normalizePersonalityAlgorithm(algorithm)
  const expectedKind = ALGORITHM_TO_DECISION_KIND[normalizedAlgorithm]
  const normalizedKind = normalizeLegacyDecisionKind(decisionKind)
  if (!normalizedKind || normalizedKind === 'custom_typology') {
    return normalizedKind || expectedKind
  }
  if (normalizedKind === expectedKind) return normalizedKind
  if (normalizedAlgorithm === 'custom_typology') return normalizedKind
  return expectedKind
}

export const isPersonalityTypologyAlgorithm = (
  value?: string
): value is PersonalityTypologyAlgorithm => (
  PERSONALITY_TYPOLOGY_ALGORITHMS.includes(value as PersonalityTypologyAlgorithm)
)

export const normalizePersonalityAlgorithm = (value?: string): PersonalityTypologyAlgorithm => (
  isPersonalityTypologyAlgorithm(value) ? value : 'mbti'
)

export const filterPersonalityAlgorithmOptions = (
  options: Array<{ value: string; label: string }> = []
): Array<{ value: PersonalityTypologyAlgorithm; label: string }> => {
  const filtered = options.filter((item) => isPersonalityTypologyAlgorithm(item.value))
  if (filtered.length > 0) {
    return filtered as Array<{ value: PersonalityTypologyAlgorithm; label: string }>
  }
  return DEFAULT_PERSONALITY_ALGORITHM_OPTIONS
}

export const getPersonalityDecisionOptions = (
  algorithm?: string
): Array<{ value: string; label: string }> => {
  const normalized = normalizePersonalityAlgorithm(algorithm)
  return PERSONALITY_DECISION_OPTIONS[normalized]
}

export const isPersonalityTypologyScopeModel = (model: {
  kind?: string
  sub_kind?: string
}): boolean => model.kind === PERSONALITY_KIND && model.sub_kind === PERSONALITY_SUB_KIND

export const assertPersonalityTypologyScopeModel = (model: {
  kind?: string
  sub_kind?: string
  code?: string
}): void => {
  if (!isPersonalityTypologyScopeModel(model)) {
    throw new Error('当前模块仅支持人格探索 / 类型模型（typology），行为能力模型请使用对应入口')
  }
}
