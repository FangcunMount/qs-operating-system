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

export const LEGACY_DECISION_KIND_ALIASES: Record<string, PersonalityTypologyAlgorithm> = {
  pole_composition: 'mbti',
  nearest_pattern: 'sbti',
  trait_profile: 'bigfive'
}

export const PERSONALITY_DECISION_OPTIONS: Record<
  PersonalityTypologyAlgorithm,
  Array<{ value: string; label: string }>
> = {
  mbti: [{ value: 'mbti', label: 'MBTI 极性组合' }],
  sbti: [{ value: 'sbti', label: 'SBTI 最近模式' }],
  bigfive: [{ value: 'bigfive', label: 'BigFive 特质画像' }],
  custom_typology: [{ value: 'custom_typology', label: '自定义类型' }]
}

export const normalizeLegacyDecisionKind = (decisionKind?: string): string | undefined => {
  if (!decisionKind) return decisionKind
  return LEGACY_DECISION_KIND_ALIASES[decisionKind] || decisionKind
}

export const normalizeDecisionKindForAlgorithm = (
  algorithm?: string,
  decisionKind?: string
): string => {
  const normalizedAlgorithm = normalizePersonalityAlgorithm(algorithm)
  const normalizedKind = normalizeLegacyDecisionKind(decisionKind)
  if (!normalizedKind || normalizedKind === 'custom_typology') return normalizedKind || normalizedAlgorithm
  if (normalizedKind === normalizedAlgorithm) return normalizedKind
  if (normalizedAlgorithm === 'custom_typology') return normalizedKind
  return normalizedAlgorithm
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
