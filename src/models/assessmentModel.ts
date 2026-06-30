import type { IQuestion } from '@/models/question'
import { normalizeLegacyDecisionKind } from '@/constants/personalityScope'

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
  name: string
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
  sign?: 1 | -1
  option_scores?: Record<string, number>
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
  raw?: unknown
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
  factor: PersonalityFactorSpec,
  mappings: PersonalityQuestionMapping[],
  factorAliases: Map<string, PersonalityFactorSpec>
): boolean => {
  if ((factor.contributions || []).length > 0) return true
  return mappings.some((mapping) => factorAliases.get(mapping.factor_code) === factor)
}

export const validateFactorGraph = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const factors = spec.factor_graph?.factors || {}
  const factorEntries = Object.entries(factors)
  const factorAliases = buildFactorAliasMap(factors)
  const mappings = spec.factor_graph?.question_mappings || []

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

    if (factor.kind === 'leaf' && !hasContributionForFactor(factor, mappings, factorAliases)) {
      issues.push({
        field: `factor_graph.${factorRef}.contributions`,
        message: `叶子因子 ${factorRef} 至少需要一条题目贡献或题目映射`
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
  const mappings = spec.factor_graph?.question_mappings || []
  const questionMap = new Map(questions.map((question) => [question.code, question]))
  const shouldValidateQuestionExistence = questions.length > 0

  if (mappings.length === 0) {
    issues.push({ field: 'question_mapping', message: '至少需要配置一条题目映射' })
    return issues
  }

  mappings.forEach((mapping, index) => {
    const rowLabel = `第 ${index + 1} 条题目映射`
    const question = questionMap.get(mapping.question_code)
    if (!mapping.question_code || (shouldValidateQuestionExistence && !question)) {
      issues.push({ field: `question_mapping.${index}.question_code`, message: `${rowLabel} 必须选择当前问卷中的有效题目` })
    }
    if (!mapping.factor_code || !factorAliases.has(mapping.factor_code)) {
      issues.push({ field: `question_mapping.${index}.factor_code`, message: `${rowLabel} 必须选择有效因子` })
    }

    const options = getQuestionOptions(question)
    if (mapping.question_code && question && options.length === 0) {
      issues.push({ field: `question_mapping.${index}.option_scores`, message: `${rowLabel} 对应题型没有可计分选项` })
    }

    const optionScores = mapping.option_scores || {}
    const optionCodes = new Set(options.map((option) => option.code).filter(Boolean) as string[])
    if (question && options.length > 0) {
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

    Object.entries(optionScores).forEach(([optionCode, score]) => {
      if (!isFiniteNumber(score)) {
        issues.push({ field: `question_mapping.${index}.option_scores`, message: `${rowLabel} 的选项 ${optionCode} 分值必须是有限数字` })
      }
      if (question && options.length > 0 && !optionCodes.has(optionCode)) {
        issues.push({ field: `question_mapping.${index}.option_scores`, message: `${rowLabel} 引用了不存在的选项：${optionCode}` })
      }
    })
  })

  return issues
}

export const validateDecision = (
  spec: PersonalityTypologyRuntimeSpec,
  algorithm?: string
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const decisionKind = spec.decision?.kind
  const outcomeCodes = new Set((spec.outcome_mapping?.outcomes || []).map((outcome) => outcome.code).filter(Boolean))

  if (!decisionKind) {
    issues.push({ field: 'decision', message: '决策规则不能为空' })
  }

  if (spec.decision?.fallback_code && !outcomeCodes.has(spec.decision.fallback_code)) {
    issues.push({ field: 'decision.fallback_code', message: '兜底结果必须来自已配置的结果类型' })
  }

  if (
    algorithm &&
    algorithm !== 'custom_typology' &&
    decisionKind &&
    normalizeLegacyDecisionKind(decisionKind) !== algorithm &&
    decisionKind !== 'custom_typology'
  ) {
    issues.push({ field: 'decision.kind', message: `决策类型 ${decisionKind} 与算法 ${algorithm} 不匹配` })
  }

  return issues
}

export const validateOutcomeMapping = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const outcomes = spec.outcome_mapping?.outcomes || []
  const outcomeCodes = outcomes.map((item) => item.code).filter(Boolean)

  if (outcomes.length === 0) {
    issues.push({ field: 'outcome_mapping', message: '至少需要配置一个结果类型' })
  }

  if (outcomes.some((item) => !item.code || !item.name)) {
    issues.push({ field: 'outcome_mapping', message: '结果类型 code 和名称不能为空' })
  }

  if (new Set(outcomeCodes).size !== outcomeCodes.length) {
    issues.push({ field: 'outcome_mapping.code', message: '结果类型 code 不能重复' })
  }

  return issues
}

export const validateReport = (
  spec: PersonalityTypologyRuntimeSpec
): AssessmentModelValidationIssue[] => {
  if (!spec.report?.kind) {
    return [{ field: 'report', message: '报告配置不能为空' }]
  }
  return []
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
