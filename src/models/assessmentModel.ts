import type { IQuestion } from '@/models/question'
import { normalizeLegacyDecisionKind } from '@/constants/personalityScope'
import type { DefinitionV2 } from './definitionV2'

export type AssessmentModelKind = 'scale' | 'typology' | 'personality' | 'behavioral_rating' | 'cognitive' | 'behavior_ability'
export type AssessmentModelStatus = 'draft' | 'published' | 'archived'

export interface ReleaseState {
  working_status: AssessmentModelStatus | string
  working_version: string
  online_status: 'online' | 'offline' | 'archived' | string
  active_version?: string
  has_unpublished_changes: boolean
}
export type AssessmentModelAlgorithm =
  | 'personality_typology'
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
  algorithm: AssessmentModelAlgorithm
  title: string
  description: string
  status: AssessmentModelStatus
  category?: string
  /** Versioned norm tables referenced by this model, supplied by the catalog list projection. */
  norm_table_versions?: string[]
  tags: string[]
  stages?: string[]
  applicable_ages?: string[]
  reporters?: string[]
  questionnaire_code?: string
  questionnaire_version?: string
  version?: string
  created_at?: string
  updated_at?: string
  published_at?: string
  archived_at?: string
  created_by?: string
  updated_by?: string
  release_state?: ReleaseState
}

export interface AssessmentModelDetail extends AssessmentModelSummary {
  /** DefinitionV2 is fetched separately from /definition. */
  definition?: DefinitionV2
}

export interface AssessmentModelDefinition<TPayload = AssessmentModelPayload> {
  kind: AssessmentModelKind
  algorithm: AssessmentModelAlgorithm
  payload_format: typeof PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT | typeof LEGACY_PERSONALITY_PAYLOAD_FORMAT | string
  payload: TPayload
}

/** The current /definition wire contract. Do not replace it with a UI payload. */
export type AssessmentModelDefinitionV2 = DefinitionV2

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
  name: string
  summary?: string
  description?: string
  suggestions?: string[]
  rarity_label?: string
  percentile?: string
  pattern?: string
  traits?: string[]
  strengths?: string[]
  weaknesses?: string[]
  image_url?: string
  image?: string
  rarity?: { percent?: number; label?: string; one_in_x?: number }
  is_special?: boolean
  trigger?: string
  commentary?: string
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
  id: string
  code?: string
  name?: string
  kind: 'leaf' | 'composite'
  children?: string[]
  aggregation?: 'sum' | 'avg' | 'weighted_avg'
  weights?: Record<string, number>
  constant?: number
  contributions?: PersonalityQuestionContribution[]
  option_scoring?: 'strict' | 'compat'
}

export interface PersonalityQuestionContribution {
  question_code: string
  factor_code?: string
  scoring_mode?: 'question_score' | 'option_override'
  sign?: 1 | -1
  weight?: number
  option_scores?: Record<string, number>
}

/** @deprecated editor state is canonicalized to factor.contributions. */
export type PersonalityQuestionMapping = PersonalityQuestionContribution & { factor_code: string }

export interface PersonalityFactorGraphSpec {
  dimension_order?: string[]
  dimensions?: Record<string, PersonalityDimension>
  /** @deprecated accepted only while importing legacy runtime payloads. */
  question_mappings?: PersonalityQuestionMapping[]
  factors?: Record<string, PersonalityFactorSpec>
  roots?: string[]
}

export interface PersonalityDecisionSpec {
  kind: string
  fallback_similarity_threshold?: number
  fallback_code?: string
  level_rule?: { low_max?: number; high_min?: number }
  poles?: Array<{
    factor_code: string
    left_pole: string
    right_pole: string
    threshold?: number
    model?: string
  }>
  top_k?: number
  [key: string]: unknown
}

export interface PersonalitySpecialRuleSpec {
  code: string
  kind: string
  config?: Record<string, unknown>
}

export interface PersonalityOutcomeMappingSpec {
  outcomes: PersonalityOutcome[]
  detail_kind?: 'personality_type' | 'trait_profile'
  detail_adapter_key?: 'personality_type' | 'trait_profile'
  mapping_rules?: Record<string, unknown>
}

export interface PersonalityReportSpec {
  kind: 'personality_type' | 'trait_profile' | 'template'
  adapter_key?: string
  template_id?: string
  template_version?: string
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
  kinds?: Array<{ value: string; label: string }>
  algorithms: Array<{ value: string; label: string }>
  categories: Array<{ value: string; label: string }>
  stages?: Array<{ value: string; label: string }>
  applicable_ages?: Array<{ value: string; label: string }>
  reporters?: Array<{ value: string; label: string }>
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

export interface AssessmentModelPreviewAnswer {
  question_code: string
  value?: unknown
  score?: number
}

export interface AssessmentModelPreviewReportRequest {
  answers: AssessmentModelPreviewAnswer[]
  sample_id?: string
}

export interface AssessmentModelPreviewReportSection {
  title: string
  content?: string
  kind?: string
  [key: string]: unknown
}

export interface AssessmentModelPreviewReportResponse {
  outcome?: Record<string, unknown>
  score_detail?: Record<string, unknown> | unknown[]
  report_sections: AssessmentModelPreviewReportSection[]
  issues: AssessmentModelValidationIssue[]
  raw_report?: unknown
}

export interface PersonalityDraftSnapshot {
  modelCode: string
  title: string
  desc: string
  category: string
  tags: string[]
  algorithm: string
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
    factors: {},
    roots: []
  },
  decision: { kind: 'pole_composition' },
  special_rules: [],
  outcome_mapping: { outcomes: [], detail_kind: 'personality_type', detail_adapter_key: 'personality_type' },
  report: { kind: 'personality_type', adapter_key: 'personality_type' },
  questionnaire_binding: questionnaireCode
    ? { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion }
    : undefined
})

export const createEmptyPersonalityDefinition = (
  questionnaireCode = '',
  questionnaireVersion?: string
): AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> => ({
  kind: 'typology',
  algorithm: 'personality_typology',
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

  if (payload.outcomes.some((item) => !item.code || !item.name)) {
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

export interface RuntimeSpecValidationContext {
  questions?: IQuestion[]
  algorithm?: string
}

type QuestionOption = { code?: string; content?: string }

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const getQuestionOptions = (question?: IQuestion): QuestionOption[] => {
  const options = (question as { options?: QuestionOption[] } | undefined)?.options
  return Array.isArray(options) ? options.filter((option) => Boolean(option.code)) : []
}

const buildFactorAliasMap = (
  factors: Record<string, PersonalityFactorSpec>
): Map<string, PersonalityFactorSpec> => {
  const aliases = new Map<string, PersonalityFactorSpec>()
  Object.entries(factors).forEach(([key, factor]) => {
    const factorAliases = [key, factor.id, factor.code].filter(Boolean) as string[]
    factorAliases.forEach((alias) => aliases.set(alias, factor))
  })
  return aliases
}

const getFactorReference = (factor: PersonalityFactorSpec, fallback: string) => factor.id || factor.code || fallback

const hasContributionForFactor = (
  factor: PersonalityFactorSpec
): boolean => (factor.contributions || []).length > 0

export const getQuestionContributions = (
  spec: PersonalityTypologyRuntimeSpec
): PersonalityQuestionMapping[] => {
  const canonical = Object.values(spec.factor_graph?.factors || {}).flatMap((factor) =>
    (factor.contributions || []).map((contribution) => ({
      ...contribution,
      factor_code: factor.id || factor.code || ''
    }))
  )
  if (canonical.length > 0) return canonical
  return (spec.factor_graph?.question_mappings || []).map((mapping) => ({
    ...mapping,
    scoring_mode: mapping.scoring_mode || (mapping.option_scores ? 'option_override' : 'question_score'),
    sign: mapping.sign ?? 1,
    weight: mapping.weight ?? 1
  }))
}

export const validateFactorGraph = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const factors = spec.factor_graph?.factors || {}
  const factorEntries = Object.entries(factors)
  const factorAliases = buildFactorAliasMap(factors)
  const contributions = getQuestionContributions(spec)

  if (factorEntries.length === 0) {
    issues.push({ field: 'factor_graph', message: '至少需要配置一个因子' })
    return issues
  }

  const roots = spec.factor_graph?.roots || []
  const unknownRoots = roots.filter((root) => !factorAliases.has(root))
  if (unknownRoots.length > 0) {
    issues.push({ field: 'factor_graph.roots', message: `根因子不存在：${unknownRoots.join(', ')}` })
  }

  const adjacency = new Map<string, string[]>()
  factorEntries.forEach(([key, factor]) => {
    const factorRef = getFactorReference(factor, key)
    const children = factor.children || []
    adjacency.set(factorRef, children)

    if (factor.kind === 'composite' && children.length === 0) {
      issues.push({ field: `factor_graph.${factorRef}.children`, message: `复合因子 ${factorRef} 必须配置子因子` })
    }

    const missingChildren = children.filter((child) => !factorAliases.has(child))
    if (missingChildren.length > 0) {
      issues.push({
        field: `factor_graph.${factorRef}.children`,
        message: `因子 ${factorRef} 引用了不存在的子因子：${missingChildren.join(', ')}`
      })
    }

    const hasLegacyContribution = contributions.some((item) => factorAliases.get(item.factor_code) === factor)
    if (factor.kind === 'leaf' && !hasContributionForFactor(factor) && !hasLegacyContribution) {
      issues.push({
        field: `factor_graph.${factorRef}.contributions`,
        message: `叶子因子 ${factorRef} 至少需要一条题目贡献`
      })
    }

    if (factor.kind === 'composite' && factor.aggregation === 'weighted_avg') {
      const weights = factor.weights || {}
      const missingWeights = children.filter((child) => !isFiniteNumber(weights[child]))
      if (missingWeights.length > 0) {
        issues.push({
          field: `factor_graph.${factorRef}.weights`,
          message: `加权平均因子 ${factorRef} 缺少子因子权重：${missingWeights.join(', ')}`
        })
      }

      const invalidWeights = Object.entries(weights)
        .filter(([child, weight]) => children.includes(child) && !isFiniteNumber(weight))
        .map(([child]) => child)
      if (invalidWeights.length > 0) {
        issues.push({
          field: `factor_graph.${factorRef}.weights`,
          message: `加权平均因子 ${factorRef} 的权重必须是有限数字：${invalidWeights.join(', ')}`
        })
      }

      const weightSum = children.reduce((sum, child) => sum + (isFiniteNumber(weights[child]) ? weights[child] : 0), 0)
      if (children.length > 0 && Number.isFinite(weightSum) && Math.abs(weightSum - 1) > 0.000001) {
        issues.push({
          field: `factor_graph.${factorRef}.weights`,
          message: `加权平均因子 ${factorRef} 的权重总和当前为 ${weightSum}，请确认算法会做归一化处理`,
          level: 'warning'
        })
      }
    }
  })

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (factorRef: string, path: string[]): boolean => {
    if (visiting.has(factorRef)) {
      issues.push({ field: 'factor_graph.cycle', message: `因子图存在环：${[...path, factorRef].join(' -> ')}` })
      return true
    }
    if (visited.has(factorRef)) return false
    visiting.add(factorRef)
    const hasCycle = (adjacency.get(factorRef) || []).some((child) => {
      const childFactor = factorAliases.get(child)
      return childFactor ? visit(childFactor.id || childFactor.code || child, [...path, factorRef]) : false
    })
    visiting.delete(factorRef)
    visited.add(factorRef)
    return hasCycle
  }

  factorEntries.forEach(([key, factor]) => visit(getFactorReference(factor, key), []))

  return issues
}

export const validateQuestionMappings = (
  spec: PersonalityTypologyRuntimeSpec,
  questions: IQuestion[] = []
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const factors = spec.factor_graph?.factors || {}
  const factorAliases = buildFactorAliasMap(factors)
  const mappings = getQuestionContributions(spec)
  const questionMap = new Map(questions.map((question) => [question.code, question]))
  const shouldValidateQuestionExistence = questions.length > 0

  if (mappings.length === 0) {
    issues.push({ field: 'question_mapping', message: '至少需要配置一条题目贡献' })
    return issues
  }

  mappings.forEach((mapping, index) => {
    const rowLabel = `第 ${index + 1} 条题目贡献`
    const question = questionMap.get(mapping.question_code)
    if (!mapping.question_code || (shouldValidateQuestionExistence && !question)) {
      issues.push({ field: `question_mapping.${index}.question_code`, message: `${rowLabel} 必须选择当前问卷中的有效题目` })
    }
    if (!mapping.factor_code || !factorAliases.has(mapping.factor_code)) {
      issues.push({ field: `question_mapping.${index}.factor_code`, message: `${rowLabel} 必须选择有效因子` })
    }

    const mode = mapping.scoring_mode || 'question_score'
    if (mode !== 'question_score' && mode !== 'option_override') {
      issues.push({ field: `question_mapping.${index}.scoring_mode`, message: `${rowLabel} 的计分来源无效` })
    }
    const sign = mapping.sign ?? 1
    const weight = mapping.weight ?? 1
    if (sign !== 1 && sign !== -1) {
      issues.push({ field: `question_mapping.${index}.sign`, message: `${rowLabel} 必须选择正向或反向` })
    }
    if (!isFiniteNumber(weight) || weight <= 0) {
      issues.push({ field: `question_mapping.${index}.weight`, message: `${rowLabel} 的权重必须是大于 0 的有限数字` })
    }

    const options = getQuestionOptions(question)
    if (mode === 'option_override' && question?.type !== 'Radio') {
      issues.push({ field: `question_mapping.${index}.scoring_mode`, message: `${rowLabel} 只有单选题可以自定义选项计分` })
    }

    const optionScores = mapping.option_scores || {}
    const optionCodes = new Set(options.map((option) => option.code).filter(Boolean) as string[])
    if (mode === 'question_score' && mapping.option_scores !== undefined) {
      issues.push({ field: `question_mapping.${index}.option_scores`, message: `${rowLabel} 使用问卷分值时不能保留自定义选项分值` })
    }
    if (mode === 'option_override' && question && options.length > 0) {
      const missingOptionScores = options
        .filter((option) => !isFiniteNumber(optionScores[option.code as string]))
        .map((option) => option.code as string)
      if (missingOptionScores.length > 0) {
        issues.push({
          field: `question_mapping.${index}.option_scores`,
          message: `${rowLabel} 缺少选项分值：${missingOptionScores.join(', ')}`
        })
      }
    }

    Object.entries(mode === 'option_override' ? optionScores : {}).forEach(([optionCode, score]) => {
      if (!isFiniteNumber(score)) {
        issues.push({ field: `question_mapping.${index}.option_scores`, message: `${rowLabel} 的选项 ${optionCode} 分值必须是有限数字` })
      }
      if (question && options.length > 0 && !optionCodes.has(optionCode)) {
        issues.push({ field: `question_mapping.${index}.option_scores`, message: `${rowLabel} 引用了不存在的选项：${optionCode}` })
      }
    })
  })

  const seen = new Set<string>()
  mappings.forEach((mapping, index) => {
    const key = `${mapping.factor_code}\u0000${mapping.question_code}`
    if (mapping.factor_code && mapping.question_code && seen.has(key)) {
      issues.push({ field: `question_mapping.${index}`, message: `题目 ${mapping.question_code} 对因子 ${mapping.factor_code} 的贡献重复` })
    }
    seen.add(key)
  })

  return issues
}

export const validateDecision = (
  spec: PersonalityTypologyRuntimeSpec,
  algorithm?: string
): AssessmentModelValidationIssue[] => {
  void algorithm
  const issues: AssessmentModelValidationIssue[] = []
  const decisionKind = normalizeLegacyDecisionKind(spec.decision?.kind)
  const outcomeCodes = new Set((spec.outcome_mapping?.outcomes || []).map((outcome) => outcome.code).filter(Boolean))
  const roots = spec.factor_graph.roots || []
  const supported = new Set(['pole_composition', 'nearest_pattern', 'trait_profile', 'dominant_factor'])

  if (!decisionKind) {
    issues.push({ field: 'decision', message: '决策规则不能为空' })
  } else if (!supported.has(decisionKind)) {
    issues.push({ field: 'decision.kind', message: `不支持的结果决策机制：${decisionKind}` })
  }

  if (spec.decision?.fallback_code && !outcomeCodes.has(spec.decision.fallback_code)) {
    issues.push({ field: 'decision.fallback_code', message: '兜底结果必须来自已配置的结果类型' })
  }

  if (decisionKind === 'pole_composition') {
    const poles = spec.decision.poles || []
    roots.forEach((factorCode) => {
      const pole = poles.find((item) => item.factor_code === factorCode)
      if (!pole?.left_pole || !pole?.right_pole) {
        issues.push({ field: `decision.poles.${factorCode}`, message: `因子 ${factorCode} 必须配置左右极` })
      }
    })
  }

  if (decisionKind === 'nearest_pattern') {
    const patterns = (spec.outcome_mapping?.outcomes || []).filter((outcome) => !outcome.is_special && outcome.pattern)
    if (patterns.length === 0) {
      issues.push({ field: 'outcome_mapping.pattern', message: '最近模式至少需要一个结果配置 Pattern' })
    }
    const rule = spec.decision.level_rule
    if (rule?.low_max !== undefined && rule?.high_min !== undefined && rule.low_max >= rule.high_min) {
      issues.push({ field: 'decision.level_rule', message: '低档上限必须小于高档下限' })
    }
  }

  if (decisionKind === 'dominant_factor') {
    const topK = spec.decision.top_k || 1
    if (topK < 1 || topK > roots.length) {
      issues.push({ field: 'decision.top_k', message: `Top K 必须在 1 到 ${roots.length} 之间` })
    }
    roots.forEach((factorCode) => {
      if (!outcomeCodes.has(factorCode)) {
        issues.push({ field: `outcome_mapping.${factorCode}`, message: `主导因子 ${factorCode} 需要同 Code 的结果类型` })
      }
    })
  }

  return issues
}

export const validateOutcomeMapping = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const outcomes = spec.outcome_mapping?.outcomes || []
  const outcomeCodes = outcomes.map((item) => item.code).filter(Boolean)

  if (outcomes.length === 0 && normalizeLegacyDecisionKind(spec.decision.kind) !== 'trait_profile') {
    issues.push({ field: 'outcome_mapping', message: '至少需要配置一个结果类型' })
  }

  if (outcomes.some((item) => !item.code || !item.name)) {
    issues.push({ field: 'outcome_mapping', message: '结果类型 code 和名称不能为空' })
  }

  if (new Set(outcomeCodes).size !== outcomeCodes.length) {
    issues.push({ field: 'outcome_mapping.code', message: '结果类型 code 不能重复' })
  }

  if (!['personality_type', 'trait_profile'].includes(spec.outcome_mapping.detail_kind || '')) {
    issues.push({ field: 'outcome_mapping.detail_kind', message: '结果映射类型必须是 personality_type 或 trait_profile' })
  }

  return issues
}

export const validateReport = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  if (!['personality_type', 'trait_profile', 'template'].includes(spec.report?.kind || '')) {
    issues.push({ field: 'report.kind', message: '报告类型必须是 personality_type、trait_profile 或 template' })
  }
  if (spec.report?.kind === 'template' && !spec.report.adapter_key) {
    issues.push({ field: 'report.adapter_key', message: '模板报告必须配置适配器 Key' })
  }
  return issues
}

export const validateRuntimeSpec = (
  spec: PersonalityTypologyRuntimeSpec,
  context: RuntimeSpecValidationContext = {}
): AssessmentModelValidationIssue[] => [
  ...validateFactorGraph(spec),
  ...validateQuestionMappings(spec, context.questions),
  ...validateDecision(spec, context.algorithm),
  ...validateOutcomeMapping(spec),
  ...validateReport(spec)
]
