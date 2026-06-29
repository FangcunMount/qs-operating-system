export type AssessmentModelKind = 'personality' | 'behavior_ability'
export type AssessmentModelStatus = 'draft' | 'published' | 'archived'

export interface AssessmentModelSummary {
  code: string
  title: string
  description: string
  kind: AssessmentModelKind
  sub_kind: string
  algorithm: string
  status: AssessmentModelStatus
  questionnaire_code: string
  questionnaire_version?: string
  category?: string
  tags: string[]
  created_by?: string
  created_at?: string
  updated_by?: string
  updated_at?: string
}

export interface AssessmentModelDetail extends AssessmentModelSummary {
  definition?: AssessmentModelDefinition
}

export interface AssessmentModelDefinition<TPayload = AssessmentModelPayload> {
  kind: AssessmentModelKind
  sub_kind: string
  algorithm: string
  payload_format: 'personality_payload_v1' | 'behavior_ability_payload_v1' | string
  payload: TPayload
}

export type AssessmentModelPayload = PersonalityPayloadV1 | Record<string, unknown>

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

export interface AssessmentModelOptions {
  algorithms: Array<{ value: string; label: string }>
  categories: Array<{ value: string; label: string }>
  sub_kinds: Array<{ value: string; label: string }>
}

export interface AssessmentModelValidationIssue {
  field: string
  message: string
  code?: string
}

export interface AssessmentModelValidationResult {
  passed: boolean
  issues: AssessmentModelValidationIssue[]
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

export const createEmptyPersonalityDefinition = (
  questionnaireCode = '',
  questionnaireVersion?: string
): AssessmentModelDefinition<PersonalityPayloadV1> => ({
  kind: 'personality',
  sub_kind: 'typology',
  algorithm: 'typology_v1',
  payload_format: 'personality_payload_v1',
  payload: createEmptyPersonalityPayload(questionnaireCode, questionnaireVersion)
})

const normalizeTags = (tags?: unknown): string[] => {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
}

export const normalizeAssessmentModelSummary = (raw: Record<string, any>): AssessmentModelSummary => ({
  code: String(raw?.code || ''),
  title: String(raw?.title || ''),
  description: String(raw?.description || raw?.desc || ''),
  kind: (raw?.kind || 'personality') as AssessmentModelKind,
  sub_kind: String(raw?.sub_kind || ''),
  algorithm: String(raw?.algorithm || ''),
  status: (raw?.status || 'draft') as AssessmentModelStatus,
  questionnaire_code: String(raw?.questionnaire_code || raw?.questionnaire?.code || ''),
  questionnaire_version: raw?.questionnaire_version || raw?.questionnaire?.version,
  category: raw?.category,
  tags: normalizeTags(raw?.tags),
  created_by: raw?.created_by,
  created_at: raw?.created_at,
  updated_by: raw?.updated_by,
  updated_at: raw?.updated_at
})

export const normalizeAssessmentModelDetail = (raw: Record<string, any>): AssessmentModelDetail => ({
  ...normalizeAssessmentModelSummary(raw),
  definition: raw?.definition
})

export const normalizeAssessmentModelOptions = (raw: Record<string, any>): AssessmentModelOptions => ({
  algorithms: Array.isArray(raw?.algorithms) ? raw.algorithms : [],
  categories: Array.isArray(raw?.categories) ? raw.categories : [],
  sub_kinds: Array.isArray(raw?.sub_kinds) ? raw.sub_kinds : []
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
