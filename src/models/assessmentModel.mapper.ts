import {
  AssessmentModelDefinition,
  AssessmentModelDetail,
  AssessmentModelKind,
  AssessmentModelOptions,
  AssessmentModelPreviewReportResponse,
  AssessmentModelPreviewReportSection,
  AssessmentModelStatus,
  AssessmentModelSubKind,
  AssessmentModelSummary,
  AssessmentModelValidationIssue,
  AssessmentModelValidationResult,
  AssessmentQRCodeResponse,
  PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
  PersonalityDimension,
  PersonalityPayloadV1,
  PersonalityTypologyRuntimeSpec
} from './assessmentModel'
import { normalizePreviewAnswersInput } from './assessmentModel.preview'
import {
  buildDefinitionForSave,
  normalizeAssessmentModelDefinitionPayload,
  normalizeRuntimeSpecForEdit
} from './personalityRuntimeSpec.mapper'

export {
  buildDefinitionForSave,
  createEmptyRuntimeSpec,
  isLegacyPayload,
  isRuntimeSpecPayload,
  mapSimplePayloadToRuntimeSpec,
  normalizeRuntimeSpecForEdit,
  normalizeRuntimeSpecForSave,
  syncContributionsToQuestionMappings,
  syncQuestionMappingsToContributions
} from './personalityRuntimeSpec.mapper'
export { normalizePreviewAnswersInput } from './assessmentModel.preview'

const normalizeTags = (tags?: unknown): string[] => {
  if (!Array.isArray(tags)) return []
  return tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
}

export const normalizeAssessmentModelSummary = (raw: Record<string, any>): AssessmentModelSummary => ({
  code: String(raw?.code || ''),
  kind: (raw?.kind || 'personality') as AssessmentModelKind,
  sub_kind: (raw?.sub_kind || 'typology') as AssessmentModelSubKind,
  algorithm: String(raw?.algorithm || 'mbti'),
  title: String(raw?.title || ''),
  description: String(raw?.description || raw?.desc || ''),
  status: (raw?.status || 'draft') as AssessmentModelStatus,
  category: raw?.category,
  tags: normalizeTags(raw?.tags),
  questionnaire_code: raw?.questionnaire_code || raw?.questionnaire?.code || undefined,
  questionnaire_version: raw?.questionnaire_version || raw?.questionnaire?.version,
  created_at: raw?.created_at,
  updated_at: raw?.updated_at,
  published_at: raw?.published_at,
  archived_at: raw?.archived_at,
  created_by: raw?.created_by,
  updated_by: raw?.updated_by
})

export const normalizeAssessmentModelDetail = (raw: Record<string, any>): AssessmentModelDetail => ({
  ...normalizeAssessmentModelSummary(raw),
  definition: raw?.definition ? normalizeAssessmentModelDefinition(raw.definition) : undefined
})

export const mapRuntimeSpecToFormState = (
  spec: PersonalityTypologyRuntimeSpec
): { payload: PersonalityPayloadV1; scoringRulesSource: string } => {
  const dimensions = spec.factor_graph?.dimension_order?.length
    ? spec.factor_graph.dimension_order
      .map((code) => spec.factor_graph?.dimensions?.[code])
      .filter((d): d is PersonalityDimension => Boolean(d))
    : Object.values(spec.factor_graph?.dimensions || {})

  const scoringRules: Record<string, unknown> = {
    decision_kind: spec.decision?.kind,
    decision: spec.decision,
    special_rules: spec.special_rules,
    outcome_mapping: spec.outcome_mapping?.mapping_rules,
    report: spec.report,
    question_mappings: spec.factor_graph?.question_mappings
  }

  return {
    payload: {
      dimensions,
      outcomes: spec.outcome_mapping?.outcomes || [],
      questionnaire_binding: spec.questionnaire_binding || { questionnaire_code: '' },
      scoring_rules: scoringRules
    },
    scoringRulesSource: JSON.stringify(scoringRules, null, 2)
  }
}

/** @deprecated use normalizeRuntimeSpecForEdit */
export const normalizePayload = (
  raw: unknown,
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityTypologyRuntimeSpec => normalizeRuntimeSpecForEdit(raw, questionnaireCode, questionnaireVersion)

export const normalizeAssessmentModelDefinition = (
  raw: Record<string, any>
): AssessmentModelDefinition => {
  const payloadFormat = raw?.payload_format || PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT
  const binding = raw?.payload?.questionnaire_binding
  const questionnaireCode = binding?.questionnaire_code || ''
  const questionnaireVersion = binding?.questionnaire_version

  const payload = normalizeAssessmentModelDefinitionPayload(
    raw,
    payloadFormat,
    questionnaireCode,
    questionnaireVersion
  )

  return {
    kind: (raw?.kind || 'personality') as AssessmentModelKind,
    sub_kind: (raw?.sub_kind || 'typology') as AssessmentModelSubKind,
    algorithm: String(raw?.algorithm || 'mbti'),
    payload_format: PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
    payload
  }
}

export const normalizeAssessmentModelOptions = (raw: Record<string, any>): AssessmentModelOptions => ({
  algorithms: Array.isArray(raw?.algorithms) ? raw.algorithms : [],
  categories: Array.isArray(raw?.categories) ? raw.categories : [],
  sub_kinds: Array.isArray(raw?.sub_kinds) ? raw.sub_kinds : []
})

export const normalizeValidationResult = (raw: unknown): AssessmentModelValidationResult => {
  if (!raw || typeof raw !== 'object') {
    return { passed: false, issues: [{ field: 'unknown', message: '后端未返回校验结果' }] }
  }
  const data = raw as {
    passed?: boolean
    valid?: boolean
    issues?: AssessmentModelValidationIssue[]
    errors?: string[]
  }
  if ('passed' in data) {
    return {
      passed: Boolean(data.passed),
      issues: Array.isArray(data.issues) ? data.issues : []
    }
  }
  return {
    passed: Boolean(data.valid),
    issues: Array.isArray(data.errors)
      ? data.errors.map((message: string) => ({ field: 'unknown', message }))
      : []
  }
}

export const normalizeQRCodeResponse = (raw: unknown): AssessmentQRCodeResponse => {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    code: String(data.code || ''),
    qrcode_url: String(data.qrcode_url || data.qrcode || data.url || ''),
    entry_url: String(data.entry_url || data.url || '')
  }
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const normalizeIssues = (raw: unknown): AssessmentModelValidationIssue[] => {
  if (Array.isArray(raw)) return raw as AssessmentModelValidationIssue[]
  return normalizeValidationResult({ passed: true, issues: raw }).issues
}

const normalizeReportSections = (raw: unknown): AssessmentModelPreviewReportSection[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((section, index) => {
    if (typeof section === 'string') return { title: `报告段落 ${index + 1}`, content: section }
    const item = (section || {}) as Record<string, unknown>
    return {
      ...item,
      title: String(item.title || item.name || `报告段落 ${index + 1}`),
      content: item.content === undefined ? undefined : String(item.content)
    }
  })
}

export const normalizePreviewReportResponse = (raw: unknown): AssessmentModelPreviewReportResponse => {
  const data = asRecord(raw)
  const report = asRecord(data.report)
  const result = asRecord(data.result)
  return {
    outcome: asRecord(data.outcome || result.outcome || report.outcome),
    score_detail: (data.score_detail || data.scores || result.score_detail) as
      Record<string, unknown> | unknown[] | undefined,
    report_sections: normalizeReportSections(data.report_sections || data.sections || report.sections),
    issues: normalizeIssues(data.issues || data.errors),
    raw: data
  }
}

export interface AssessmentModelListResponse {
  models: AssessmentModelSummary[]
  page: number
  page_size: number
  total_count: number
}

export const normalizeListResponse = (data: unknown): AssessmentModelListResponse => {
  const raw = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const list = raw.models || raw.list || raw.items || []
  return {
    models: Array.isArray(list) ? list.map((item) => normalizeAssessmentModelSummary(item as Record<string, unknown>)) : [],
    page: Number(raw.page || raw.pagenum || 1),
    page_size: Number(raw.page_size || raw.pagesize || 10),
    total_count: Number(raw.total_count || raw.total || 0)
  }
}
