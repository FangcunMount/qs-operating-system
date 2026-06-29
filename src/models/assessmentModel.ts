export type AssessmentModelKind = 'personality' | 'behavior_ability'
export type AssessmentModelStatus = 'draft' | 'published' | 'archived'
export type AssessmentModelSubKind = 'typology' | 'dimension_score'
export type AssessmentModelAlgorithm =
  | 'mbti'
  | 'sbti'
  | 'bigfive'
  | 'custom_typology'
  | 'score_range'
  | string

export const PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT = 'assessmentmodel.personality.typology.v1'
export const LEGACY_PERSONALITY_PAYLOAD_FORMAT = 'personality_payload_v1'

export interface AssessmentModelSummary {
  code: string
  kind: AssessmentModelKind
  sub_kind: AssessmentModelSubKind | string
  algorithm: AssessmentModelAlgorithm
  title: string
  description: string
  status: AssessmentModelStatus
  category?: string
  tags: string[]
  questionnaire_code?: string
  questionnaire_version?: string
  created_at?: string
  updated_at?: string
  published_at?: string
  archived_at?: string
  created_by?: string
  updated_by?: string
}

export interface AssessmentModelDetail extends AssessmentModelSummary {
  definition?: AssessmentModelDefinition
}

export interface AssessmentModelDefinition<TPayload = AssessmentModelPayload> {
  kind: AssessmentModelKind
  sub_kind: AssessmentModelSubKind | string
  algorithm: AssessmentModelAlgorithm
  payload_format: typeof PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT | typeof LEGACY_PERSONALITY_PAYLOAD_FORMAT | string
  payload: TPayload
}

export type AssessmentModelPayload = PersonalityTypologyRuntimeSpec | PersonalityPayloadV1 | Record<string, unknown>

// --- Legacy simple payload (backward compat) ---

export interface PersonalityDimension {
  code: string
  title: string
  left_pole?: string
  right_pole?: string
  description?: string
}

export interface PersonalityOutcome {
  code: string
  title: string
  summary?: string
  description?: string
  suggestions?: string[]
  rarity_label?: string
  percentile?: string
}

export interface PersonalityQuestionnaireBinding {
  questionnaire_code: string
  questionnaire_version?: string
}

export interface PersonalityPayloadV1 {
  dimensions: PersonalityDimension[]
  outcomes: PersonalityOutcome[]
  questionnaire_binding: PersonalityQuestionnaireBinding
  scoring_rules: Record<string, unknown>
}

// --- RuntimeSpec (backend authoritative) ---

export interface PersonalityFactorSpec {
  code: string
  name: string
  kind: 'leaf' | 'composite'
  children?: string[]
  aggregation?: 'sum' | 'avg' | 'weighted_avg'
  is_root?: boolean
}

export interface PersonalityQuestionMapping {
  question_code: string
  factor_code: string
  option_scores?: Record<string, number>
  sign?: 1 | -1
}

export interface PersonalityFactorGraphSpec {
  dimension_order?: string[]
  dimensions?: Record<string, PersonalityDimension>
  question_mappings?: PersonalityQuestionMapping[]
  factors?: Record<string, PersonalityFactorSpec>
  roots?: string[]
}

export interface PersonalityDecisionSpec {
  kind: string
  fallback_similarity_threshold?: number
  fallback_code?: string
  level_rule?: Record<string, unknown>
  [key: string]: unknown
}

export interface PersonalitySpecialRuleSpec {
  code: string
  kind: string
  config?: Record<string, unknown>
}

export interface PersonalityOutcomeMappingSpec {
  outcomes: PersonalityOutcome[]
  mapping_rules?: Record<string, unknown>
}

export interface PersonalityReportSpec {
  kind: string
  adapter_key?: string
  template_id?: string
  category_label?: string
  [key: string]: unknown
}

export interface PersonalityTypologyRuntimeSpec {
  factor_graph: PersonalityFactorGraphSpec
  decision: PersonalityDecisionSpec
  special_rules?: PersonalitySpecialRuleSpec[]
  outcome_mapping: PersonalityOutcomeMappingSpec
  report: PersonalityReportSpec
  questionnaire_binding?: PersonalityQuestionnaireBinding
}

export interface AssessmentModelOptions {
  algorithms: Array<{ value: string; label: string }>
  categories: Array<{ value: string; label: string }>
  sub_kinds: Array<{ value: string; label: string }>
}

export interface AssessmentModelValidationIssue {
  field: string
  message: string
  code?: string
  level?: 'error' | 'warning'
}

export interface AssessmentModelValidationResult {
  passed: boolean
  issues: AssessmentModelValidationIssue[]
}

export interface AssessmentQRCodeResponse {
  code: string
  qrcode_url: string
  entry_url: string
}

export interface PersonalityDraftSnapshot {
  modelCode: string
  title: string
  desc: string
  category: string
  tags: string[]
  algorithm: string
  subKind: string
  status: AssessmentModelStatus
  questionnaireCode: string
  questionnaireVersion?: string
  questionnaireStrategy?: 'create' | 'bind' | 'copy'
  bindQuestionnaireCode?: string
  currentStep: string
  timestamp: number
}

export const createEmptyPersonalityPayload = (
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityPayloadV1 => ({
  dimensions: [],
  outcomes: [],
  questionnaire_binding: {
    questionnaire_code: questionnaireCode,
    questionnaire_version: questionnaireVersion
  },
  scoring_rules: {}
})

export const createEmptyRuntimeSpec = (
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityTypologyRuntimeSpec => ({
  factor_graph: {
    dimension_order: [],
    dimensions: {},
    question_mappings: [],
    factors: {},
    roots: []
  },
  decision: { kind: 'custom_typology' },
  special_rules: [],
  outcome_mapping: { outcomes: [] },
  report: { kind: 'default' },
  questionnaire_binding: questionnaireCode
    ? { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion }
    : undefined
})

export const createEmptyPersonalityDefinition = (
  questionnaireCode = '',
  questionnaireVersion?: string
): AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> => ({
  kind: 'personality',
  sub_kind: 'typology',
  algorithm: 'mbti',
  payload_format: PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
  payload: createEmptyRuntimeSpec(questionnaireCode, questionnaireVersion)
})

export const validatePersonalityPayload = (
  payload: PersonalityPayloadV1,
  scoringRulesSource?: string
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []

  if (payload.dimensions.length === 0) {
    issues.push({ field: 'dimensions', message: '至少需要配置一个维度' })
  }

  if (payload.outcomes.length === 0) {
    issues.push({ field: 'outcomes', message: '至少需要配置一个结果类型' })
  }

  const dimensionCodes = payload.dimensions.map((item) => item.code).filter(Boolean)
  const outcomeCodes = payload.outcomes.map((item) => item.code).filter(Boolean)

  if (new Set(dimensionCodes).size !== dimensionCodes.length) {
    issues.push({ field: 'dimensions.code', message: '维度 code 不能重复' })
  }

  if (new Set(outcomeCodes).size !== outcomeCodes.length) {
    issues.push({ field: 'outcomes.code', message: '结果类型 code 不能重复' })
  }

  if (payload.dimensions.some((item) => !item.code || !item.title)) {
    issues.push({ field: 'dimensions', message: '维度 code 和名称不能为空' })
  }

  if (payload.outcomes.some((item) => !item.code || !item.title)) {
    issues.push({ field: 'outcomes', message: '结果类型 code 和名称不能为空' })
  }

  if (scoringRulesSource !== undefined) {
    try {
      JSON.parse(scoringRulesSource || '{}')
    } catch {
      issues.push({ field: 'scoring_rules', message: '计分规则 JSON 格式不正确' })
    }
  }

  return issues
}

export const validateRuntimeSpec = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const factors = spec.factor_graph?.factors || {}
  const factorCodes = Object.keys(factors)

  if (factorCodes.length === 0) {
    issues.push({ field: 'factor_graph', message: '至少需要配置一个因子' })
  }

  if ((spec.outcome_mapping?.outcomes || []).length === 0) {
    issues.push({ field: 'outcome_mapping', message: '至少需要配置一个结果类型' })
  }

  if (!spec.decision?.kind) {
    issues.push({ field: 'decision', message: '决策规则不能为空' })
  }

  if (!spec.report?.kind) {
    issues.push({ field: 'report', message: '报告配置不能为空' })
  }

  const outcomes = spec.outcome_mapping?.outcomes || []
  if (outcomes.some((item) => !item.code || !item.title)) {
    issues.push({ field: 'outcome_mapping', message: '结果类型 code 和名称不能为空' })
  }

  return issues
}
