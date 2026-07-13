import type { AssessmentModelKind, AssessmentModelSubKind } from '@/models/assessmentModel'

/** "人格" remains the business-facing label. ModelCatalog persists it as typology. */
export const PERSONALITY_KIND: AssessmentModelKind = 'typology'
export const PERSONALITY_SUB_KIND: AssessmentModelSubKind = 'typology'

/** New drafts always use one configured factor-classification runtime. */
export const PERSONALITY_RUNTIME_ALGORITHM = 'personality_typology' as const
export const PERSONALITY_TYPOLOGY_ALGORITHMS = [PERSONALITY_RUNTIME_ALGORITHM] as const
export type PersonalityTypologyAlgorithm = typeof PERSONALITY_RUNTIME_ALGORITHM

export const DEFAULT_PERSONALITY_ALGORITHM_OPTIONS = [
  { value: PERSONALITY_RUNTIME_ALGORITHM, label: '统一人格类型运行时' }
]

export const PERSONALITY_DECISION_OPTIONS = [
  { value: 'pole_composition', label: '极性组合（如 MBTI）' },
  { value: 'nearest_pattern', label: '最近模式（如 SBTI/九型模式）' },
  { value: 'trait_profile', label: '连续特质画像（如 Big Five）' },
  { value: 'dominant_factor', label: '主导因子 / Top K' }
]

const LEGACY_ALGORITHM_DECISIONS: Record<string, string> = {
  mbti: 'pole_composition',
  sbti: 'nearest_pattern',
  bigfive: 'trait_profile',
  custom_typology: 'pole_composition'
}
const CANONICAL_DECISION_KINDS = new Set(PERSONALITY_DECISION_OPTIONS.map((item) => item.value))

export const normalizeLegacyDecisionKind = (decisionKind?: string): string | undefined => {
  if (!decisionKind) return decisionKind
  if (CANONICAL_DECISION_KINDS.has(decisionKind)) return decisionKind
  return LEGACY_ALGORITHM_DECISIONS[decisionKind] || decisionKind
}

/** Compatibility helper for loading old models; algorithm no longer constrains the decision. */
export const getDecisionKindForAlgorithm = (algorithm?: string): string => (
  LEGACY_ALGORITHM_DECISIONS[algorithm || ''] || 'pole_composition'
)

export const normalizeDecisionKindForAlgorithm = (
  algorithm?: string,
  decisionKind?: string
): string => normalizeLegacyDecisionKind(decisionKind) || getDecisionKindForAlgorithm(algorithm)

export const isPersonalityTypologyAlgorithm = (value?: string): value is PersonalityTypologyAlgorithm => (
  value === PERSONALITY_RUNTIME_ALGORITHM
)

/** Legacy identities are read-compatible, but every subsequent save writes the generic identity. */
export const normalizePersonalityAlgorithm = (value?: string): PersonalityTypologyAlgorithm => {
  void value
  return PERSONALITY_RUNTIME_ALGORITHM
}

export const filterPersonalityAlgorithmOptions = (
  options: Array<{ value: string; label: string }> = []
): Array<{ value: PersonalityTypologyAlgorithm; label: string }> => {
  const configured = options.find((item) => item.value === PERSONALITY_RUNTIME_ALGORITHM)
  return configured ? [configured as { value: PersonalityTypologyAlgorithm; label: string }] : DEFAULT_PERSONALITY_ALGORITHM_OPTIONS
}

export const getPersonalityDecisionOptions = (
  algorithm?: string
): Array<{ value: string; label: string }> => {
  void algorithm
  return PERSONALITY_DECISION_OPTIONS
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
