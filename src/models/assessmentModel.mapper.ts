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
  LEGACY_PERSONALITY_PAYLOAD_FORMAT,
  PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
  PersonalityDimension,
  PersonalityPayloadV1,
  PersonalityFactorSpec,
  PersonalityQuestionContribution,
  PersonalityTypologyRuntimeSpec
} from './assessmentModel'

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

export const isLegacyPayload = (payload: unknown): payload is PersonalityPayloadV1 => {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Record<string, unknown>
  return 'dimensions' in candidate && Array.isArray(candidate.dimensions)
}

export const isRuntimeSpecPayload = (payload: unknown): payload is PersonalityTypologyRuntimeSpec => {
  if (!payload || typeof payload !== 'object') return false
  return 'factor_graph' in (payload as Record<string, unknown>)
}

export const mapSimplePayloadToRuntimeSpec = (
  payload: PersonalityPayloadV1
): PersonalityTypologyRuntimeSpec => {
  const dimensions: Record<string, PersonalityDimension> = {}
  const factors: PersonalityTypologyRuntimeSpec['factor_graph']['factors'] = {}

  payload.dimensions.forEach((dim) => {
    dimensions[dim.code] = dim
    factors[dim.code] = {
      id: dim.code,
      code: dim.code,
      name: dim.title,
      kind: 'leaf'
    }
  })

  const scoringRules = payload.scoring_rules || {}
  const decisionKind = typeof scoringRules.decision_kind === 'string'
    ? scoringRules.decision_kind
    : 'custom_typology'

  return {
    factor_graph: {
      dimension_order: payload.dimensions.map((d) => d.code),
      dimensions,
      factors,
      roots: payload.dimensions.map((d) => d.code),
      question_mappings: Array.isArray(scoringRules.question_mappings)
        ? scoringRules.question_mappings
        : []
    },
    decision: {
      kind: decisionKind,
      ...(typeof scoringRules.decision === 'object' ? scoringRules.decision as Record<string, unknown> : {})
    },
    special_rules: Array.isArray(scoringRules.special_rules) ? scoringRules.special_rules : [],
    outcome_mapping: {
      outcomes: payload.outcomes,
      mapping_rules: typeof scoringRules.outcome_mapping === 'object'
        ? scoringRules.outcome_mapping as Record<string, unknown>
        : undefined
    },
    report: typeof scoringRules.report === 'object' && scoringRules.report
      ? scoringRules.report as PersonalityTypologyRuntimeSpec['report']
      : { kind: 'default' },
    questionnaire_binding: payload.questionnaire_binding
  }
}

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

export const normalizePayload = (
  raw: unknown,
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityTypologyRuntimeSpec => {
  if (isRuntimeSpecPayload(raw)) {
    const emptySpec = createEmptyRuntimeSpec(questionnaireCode, questionnaireVersion)
    return {
      ...emptySpec,
      ...raw,
      factor_graph: {
        ...emptySpec.factor_graph,
        ...raw.factor_graph,
        factors: normalizeRuntimeSpecFactors(raw.factor_graph?.factors || {})
      },
      outcome_mapping: { ...(raw.outcome_mapping || {}), outcomes: raw.outcome_mapping?.outcomes || [] }
    }
  }
  if (isLegacyPayload(raw)) {
    return mapSimplePayloadToRuntimeSpec(raw)
  }
  return createEmptyRuntimeSpec(questionnaireCode, questionnaireVersion)
}

const normalizeRuntimeSpecFactors = (
  factors: Record<string, PersonalityFactorSpec>
): Record<string, PersonalityFactorSpec> => (
  Object.entries(factors).reduce<Record<string, PersonalityFactorSpec>>((acc, [key, factor]) => {
    const id = factor.id || key
    acc[id] = { ...factor, id }
    return acc
  }, {})
)

const createEmptyRuntimeSpec = (
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

export const normalizeAssessmentModelDefinition = (
  raw: Record<string, any>
): AssessmentModelDefinition => {
  const payloadFormat = raw?.payload_format || PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT
  const binding = raw?.payload?.questionnaire_binding
  const questionnaireCode = binding?.questionnaire_code || ''
  const questionnaireVersion = binding?.questionnaire_version

  let payload: PersonalityTypologyRuntimeSpec
  if (payloadFormat === LEGACY_PERSONALITY_PAYLOAD_FORMAT || isLegacyPayload(raw?.payload)) {
    payload = mapSimplePayloadToRuntimeSpec({
      ...createEmptyLegacyPayload(questionnaireCode, questionnaireVersion),
      ...(raw?.payload as PersonalityPayloadV1)
    })
  } else {
    payload = normalizePayload(raw?.payload, questionnaireCode, questionnaireVersion)
  }

  return {
    kind: (raw?.kind || 'personality') as AssessmentModelKind,
    sub_kind: (raw?.sub_kind || 'typology') as AssessmentModelSubKind,
    algorithm: String(raw?.algorithm || 'mbti'),
    payload_format: PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
    payload
  }
}

const createEmptyLegacyPayload = (
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityPayloadV1 => ({
  dimensions: [],
  outcomes: [],
  questionnaire_binding: { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion },
  scoring_rules: {}
})

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
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const report = data.report && typeof data.report === 'object'
    ? data.report as Record<string, unknown>
    : {}
  const result = data.result && typeof data.result === 'object'
    ? data.result as Record<string, unknown>
    : {}
  return {
    outcome: (data.outcome || result.outcome || report.outcome) as Record<string, unknown> | undefined,
    score_detail: (data.score_detail || data.score_details || data.scores || result.score_detail) as
      Record<string, unknown> | unknown[] | undefined,
    report_sections: normalizeReportSections(data.report_sections || data.sections || report.sections),
    issues: normalizeValidationResult({
      passed: data.passed ?? data.valid ?? true,
      issues: data.issues || data.errors || []
    }).issues,
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

export const buildDefinitionForSave = (
  _definition: AssessmentModelDefinition,
  runtimeSpec: PersonalityTypologyRuntimeSpec,
  subKind: string,
  algorithm: string
): AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> => ({
  kind: 'personality',
  sub_kind: subKind,
  algorithm,
  payload_format: PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
  payload: normalizeRuntimeSpecForSave(runtimeSpec)
})

const normalizeRuntimeSpecForSave = (
  runtimeSpec: PersonalityTypologyRuntimeSpec
): PersonalityTypologyRuntimeSpec => {
  const rawFactors = runtimeSpec.factor_graph?.factors || {}
  const nextFactors: Record<string, PersonalityFactorSpec> = {}

  Object.entries(rawFactors).forEach(([key, factor]) => {
    const id = factor.id || key
    nextFactors[id] = {
      ...factor,
      id,
      children: factor.children || [],
      contributions: factor.contributions || []
    }
  })

  ;(runtimeSpec.factor_graph?.question_mappings || []).forEach((mapping) => {
    if (!mapping.question_code || !mapping.factor_code) return
    const matchedKey = Object.keys(nextFactors).find((key) => {
      const factor = nextFactors[key]
      return key === mapping.factor_code || factor.id === mapping.factor_code || factor.code === mapping.factor_code
    })
    if (!matchedKey) return

    const contribution: PersonalityQuestionContribution = {
      question_code: mapping.question_code,
      sign: mapping.sign,
      option_scores: mapping.option_scores
    }
    const factor = nextFactors[matchedKey]
    const existing = factor.contributions || []
    const nextContributions = existing.filter((item) => item.question_code !== mapping.question_code)
    nextFactors[matchedKey] = {
      ...factor,
      contributions: [...nextContributions, contribution]
    }
  })

  return {
    ...runtimeSpec,
    factor_graph: {
      ...runtimeSpec.factor_graph,
      factors: nextFactors,
      roots: (runtimeSpec.factor_graph?.roots || []).map((root) => {
        const matched = nextFactors[root]
        if (matched) return matched.id
        const found = Object.values(nextFactors).find((factor) => factor.code === root)
        return found?.id || root
      })
    }
  }
}
