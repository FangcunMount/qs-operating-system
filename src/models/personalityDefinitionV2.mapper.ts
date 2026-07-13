import {
  cloneDefinitionV2,
  createEmptyDefinitionV2,
  DefinitionConclusion,
  DefinitionFactor,
  DefinitionOutcome,
  DefinitionReportSection,
  DefinitionScoring,
  DefinitionV2,
  DefinitionV2Record
} from './definitionV2'
import {
  PersonalityFactorSpec,
  PersonalityOutcome,
  PersonalityQuestionContribution,
  PersonalitySpecialRuleSpec,
  PersonalityTypologyRuntimeSpec,
  createEmptyRuntimeSpec
} from './assessmentModel'

const asRecord = (value: unknown): DefinitionV2Record => (
  value && typeof value === 'object' && !Array.isArray(value) ? value as DefinitionV2Record : {}
)

const asArray = <T = unknown>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []
const asString = (value: unknown): string => value === undefined || value === null ? '' : String(value)
const asNumber = (value: unknown): number | undefined => typeof value === 'number' && Number.isFinite(value) ? value : undefined
const contributionFromSource = (source: DefinitionV2Record): PersonalityQuestionContribution => {
  const optionScores = asRecord(source.OptionScores) as Record<string, number>
  const explicitMode = asString(source.ScoringMode)
  const legacy = explicitMode !== 'question_score' && explicitMode !== 'option_override'
  const inferredMode = Object.keys(optionScores).length > 0 ? 'option_override' : 'question_score'
  const scoringMode = legacy ? inferredMode : explicitMode as 'question_score' | 'option_override'
  const sourceSign = asNumber(source.Sign)
  return {
    question_code: asString(source.Code),
    scoring_mode: scoringMode,
    sign: legacy && scoringMode === 'option_override' && sourceSign === -1
      ? 1
      : ((sourceSign ?? 1) as 1 | -1),
    weight: asNumber(source.Weight) ?? 1,
    option_scores: scoringMode === 'option_override' ? optionScores : undefined
  }
}
const asReportKind = (value: unknown, decisionKind: string): 'personality_type' | 'trait_profile' | 'template' => {
  const kind = asString(value)
  if (kind === 'template' || kind === 'trait_profile' || kind === 'personality_type') return kind
  return decisionKind === 'trait_profile' ? 'trait_profile' : 'personality_type'
}
const detailKindForDecision = (decisionKind: string): 'personality_type' | 'trait_profile' => (
  decisionKind === 'trait_profile' || decisionKind === 'bigfive' ? 'trait_profile' : 'personality_type'
)

const typeConclusionIndex = (definition: DefinitionV2): number =>
  asArray<DefinitionConclusion>(definition.Conclusions).findIndex((item) => item?.Kind === 'type')

const typeConclusion = (definition: DefinitionV2): DefinitionConclusion => {
  const index = typeConclusionIndex(definition)
  return index >= 0 ? asArray<DefinitionConclusion>(definition.Conclusions)[index] : { Kind: 'type' }
}

const outcomeToEditor = (outcome: DefinitionOutcome, profile: DefinitionV2Record = {}): PersonalityOutcome => ({
  code: asString(outcome.Code),
  name: asString(outcome.Title),
  summary: asString(outcome.Summary) || undefined,
  description: asString(outcome.Description) || undefined,
  pattern: asString(profile.Pattern) || undefined,
  traits: asArray<string>(profile.Traits),
  strengths: asArray<string>(profile.Strengths),
  weaknesses: asArray<string>(profile.Weaknesses),
  suggestions: asArray<string>(profile.Suggestions),
  image_url: asString(profile.ImageURL) || undefined,
  image: asString(profile.Image) || undefined,
  rarity: Object.keys(asRecord(profile.Rarity)).length > 0 ? {
    percent: asNumber(asRecord(profile.Rarity).Percent),
    label: asString(asRecord(profile.Rarity).Label) || undefined,
    one_in_x: asNumber(asRecord(profile.Rarity).OneInX)
  } : undefined,
  is_special: Boolean(profile.IsSpecial),
  trigger: asString(profile.Trigger) || undefined,
  commentary: asString(profile.Commentary) || undefined
})

const outcomeToWire = (outcome: PersonalityOutcome, existing?: DefinitionOutcome): DefinitionOutcome => ({
  ...existing,
  Code: outcome.code,
  Title: outcome.name,
  Summary: outcome.summary || undefined,
  Description: outcome.description || undefined
})

/** Projects only the typology form surface. The DefinitionV2 source remains the
 * persistence object and is merged back by applyPersonalityRuntimeSpec. */
export const projectPersonalityRuntimeSpec = (
  definition: DefinitionV2,
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityTypologyRuntimeSpec => {
  const empty = createEmptyRuntimeSpec(questionnaireCode, questionnaireVersion)
  const measure = asRecord(definition.Measure)
  const scoring = asArray<DefinitionScoring>(measure.Scoring)
  const scoringByFactor = new Map(scoring.map((item) => [asString(item.FactorCode), item]))
  const factors: Record<string, PersonalityFactorSpec> = {}
  const dimensions: Record<string, { code: string; title: string }> = {}

  asArray<DefinitionFactor>(measure.Factors).forEach((factor) => {
    const code = asString(factor.Code)
    if (!code) return
    const item = scoringByFactor.get(code)
    const sources = asArray<DefinitionV2Record>(item?.Sources)
    const hasFactorSource = sources.some((source) => asString(source.Kind) === 'factor')
    factors[code] = {
      id: code,
      code,
      name: asString(factor.Title),
      kind: hasFactorSource ? 'composite' : 'leaf',
      children: [],
      aggregation: item?.Strategy === 'avg' || item?.Strategy === 'weighted_avg' || item?.Strategy === 'sum'
        ? item.Strategy : undefined,
      weights: Object.keys(asRecord(item?.Weights)).length > 0
        ? asRecord(item?.Weights) as Record<string, number> : undefined,
      constant: asNumber(item?.Constant),
      option_scoring: item?.OptionScoring === 'strict' || item?.OptionScoring === 'compat' ? item.OptionScoring : undefined,
      contributions: sources
        .filter((source) => asString(source.Kind) === 'question')
        .map(contributionFromSource)
        .filter((source) => source.question_code)
    }
    dimensions[code] = { code, title: asString(factor.Title) }
  })

  const graph = asRecord(measure.FactorGraph)
  asArray<DefinitionV2Record>(graph.Edges).forEach((edge) => {
    const parent = asString(edge.ParentCode)
    const child = asString(edge.ChildCode)
    if (parent && child && factors[parent]) {
      factors[parent] = { ...factors[parent], kind: 'composite', children: [...(factors[parent].children || []), child] }
    }
  })

  const conclusion = typeConclusion(definition)
  const decision = asRecord(conclusion.Decision)
  const decisionKind = asString(decision.Kind) || empty.decision.kind
  const outcomeMapping = asRecord(conclusion.OutcomeMapping)
  const profiles = new Map(asArray<DefinitionV2Record>(conclusion.Profiles).map((profile) => [asString(profile.OutcomeCode), profile]))
  const specialRules = asArray<DefinitionV2Record>(conclusion.SpecialRules).map((rule): PersonalitySpecialRuleSpec => {
    const { Code, Kind, ...config } = rule
    return { code: asString(Code), kind: asString(Kind), config }
  }).filter((rule) => rule.code || rule.kind)
  const sections = asArray<DefinitionReportSection>(asRecord(definition.ReportMap).Sections)
  const report = sections.length > 0 ? sections[0] : {}
  const outcomes = asArray<DefinitionOutcome>(definition.Outcomes).map((outcome) => outcomeToEditor(outcome, profiles.get(asString(outcome.Code))))

  return {
    ...empty,
    factor_graph: {
      dimension_order: Object.keys(dimensions),
      dimensions,
      factors,
      roots: asArray<string>(graph.Roots)
    },
    decision: {
      ...decision,
      kind: decisionKind,
      fallback_similarity_threshold: asNumber(decision.FallbackSimilarityThreshold),
      fallback_code: asString(decision.FallbackCode) || undefined,
      level_rule: Object.keys(asRecord(decision.LevelRule)).length > 0 ? {
        low_max: asNumber(asRecord(decision.LevelRule).LowMax),
        high_min: asNumber(asRecord(decision.LevelRule).HighMin)
      } : undefined,
      top_k: asNumber(decision.TopK),
      poles: asArray<DefinitionV2Record>(decision.Poles).map((pole) => ({
        factor_code: asString(pole.FactorCode),
        left_pole: asString(pole.LeftPole),
        right_pole: asString(pole.RightPole),
        threshold: asNumber(pole.Threshold),
        model: asString(pole.Model) || undefined
      }))
    },
    special_rules: specialRules,
    outcome_mapping: {
      outcomes,
      detail_kind: detailKindForDecision(asString(outcomeMapping.DetailKind) || decisionKind),
      detail_adapter_key: detailKindForDecision(asString(outcomeMapping.DetailAdapterKey) || decisionKind),
      mapping_rules: outcomeMapping
    },
    report: {
      kind: asReportKind(report.Kind, decisionKind),
      adapter_key: detailKindForDecision(asString(report.AdapterKey) || decisionKind),
      template_id: asString(report.TemplateID) || undefined,
      category_label: asString(report.CategoryLabel) || undefined
    }
  }
}

const mergeFactors = (definition: DefinitionV2, spec: PersonalityTypologyRuntimeSpec): DefinitionFactor[] => {
  const existing = new Map(asArray<DefinitionFactor>(asRecord(definition.Measure).Factors).map((factor) => [factor.Code, factor]))
  return Object.values(spec.factor_graph.factors || {}).map((factor) => ({
    ...existing.get(factor.id),
    Code: factor.id,
    Title: factor.name || factor.code || factor.id,
    Role: factor.kind === 'composite' ? 'index' : 'dimension'
  }))
}

const mergeScoring = (definition: DefinitionV2, spec: PersonalityTypologyRuntimeSpec): DefinitionScoring[] => {
  const measure = asRecord(definition.Measure)
  const existing = new Map(asArray<DefinitionScoring>(measure.Scoring).map((item) => [item.FactorCode, item]))

  return Object.values(spec.factor_graph.factors || {}).map((factor) => {
    const contributions = factor.contributions || []
    const questionSources = contributions
      .filter((item) => item.question_code)
      .map((item) => ({
        Kind: 'question',
        Code: item.question_code,
        ScoringMode: item.scoring_mode || 'question_score',
        Sign: item.sign ?? 1,
        Weight: item.weight ?? 1,
        OptionScores: item.scoring_mode === 'option_override' ? item.option_scores : undefined
      }))
    const factorSources = factor.kind === 'composite'
      ? (factor.children || []).map((code) => ({ Kind: 'factor', Code: code }))
      : []
    return {
      ...existing.get(factor.id),
      FactorCode: factor.id,
      Sources: [...questionSources, ...factorSources],
      Strategy: factor.aggregation || existing.get(factor.id)?.Strategy || 'sum',
      Weights: factor.weights,
      Constant: factor.constant,
      OptionScoring: factor.option_scoring
    }
  })
}

/** Applies the form-owned typology fields to a cloned DefinitionV2 while
 * preserving all unrelated top-level and nested server fields. */
export const applyPersonalityRuntimeSpec = (
  source: DefinitionV2,
  spec: PersonalityTypologyRuntimeSpec
): DefinitionV2 => {
  const definition = cloneDefinitionV2(source || createEmptyDefinitionV2())
  const measure = asRecord(definition.Measure)
  const edges = Object.values(spec.factor_graph.factors || {}).flatMap((factor) =>
    (factor.children || []).map((child) => ({ ParentCode: factor.id, ChildCode: child }))
  )
  definition.Measure = {
    ...measure,
    Factors: mergeFactors(definition, spec),
    FactorGraph: {
      ...asRecord(measure.FactorGraph),
      Roots: [...(spec.factor_graph.roots || [])],
      Edges: edges
    },
    Scoring: mergeScoring(definition, spec)
  }

  const conclusions = asArray<DefinitionConclusion>(definition.Conclusions)
  const index = typeConclusionIndex(definition)
  const current = typeConclusion(definition)
  const currentDecision = asRecord(current.Decision)
  const currentOutcomeMapping = asRecord(current.OutcomeMapping)
  const { kind, fallback_similarity_threshold, fallback_code, level_rule, poles, top_k, ...otherDecision } = spec.decision
  const nextType: DefinitionConclusion = {
    ...current,
    Kind: 'type',
    Decision: {
      ...currentDecision,
      ...otherDecision,
      Kind: kind,
      FallbackSimilarityThreshold: fallback_similarity_threshold,
      FallbackCode: fallback_code,
      LevelRule: level_rule ? { LowMax: level_rule.low_max, HighMin: level_rule.high_min } : undefined,
      Poles: (poles || []).map((pole) => ({
        FactorCode: pole.factor_code,
        LeftPole: pole.left_pole,
        RightPole: pole.right_pole,
        Threshold: pole.threshold,
        Model: pole.model
      })),
      TopK: top_k
    },
    OutcomeMapping: {
      ...currentOutcomeMapping,
      ...(spec.outcome_mapping.mapping_rules || {}),
      DetailKind: spec.outcome_mapping.detail_kind,
      DetailAdapterKey: spec.outcome_mapping.detail_adapter_key
    },
    Profiles: (spec.outcome_mapping.outcomes || []).map((outcome) => ({
      OutcomeCode: outcome.code,
      Pattern: outcome.pattern,
      Traits: outcome.traits,
      Strengths: outcome.strengths,
      Weaknesses: outcome.weaknesses,
      Suggestions: outcome.suggestions,
      ImageURL: outcome.image_url,
      Image: outcome.image,
      Rarity: outcome.rarity ? {
        Percent: outcome.rarity.percent,
        Label: outcome.rarity.label,
        OneInX: outcome.rarity.one_in_x
      } : undefined,
      IsSpecial: outcome.is_special,
      Trigger: outcome.trigger,
      Commentary: outcome.commentary
    })),
    SpecialRules: (spec.special_rules || []).map((rule) => ({
      ...(rule.config || {}),
      Code: rule.code,
      Kind: rule.kind
    }))
  }
  definition.Conclusions = index >= 0
    ? conclusions.map((item, itemIndex) => itemIndex === index ? nextType : item)
    : [...conclusions, nextType]

  const existingOutcomes = new Map(asArray<DefinitionOutcome>(definition.Outcomes).map((outcome) => [outcome.Code, outcome]))
  definition.Outcomes = (spec.outcome_mapping.outcomes || []).map((outcome) => outcomeToWire(outcome, existingOutcomes.get(outcome.code)))

  const reportMap = asRecord(definition.ReportMap)
  const sections = asArray<DefinitionReportSection>(reportMap.Sections)
  const firstSection = sections.length > 0 ? sections[0] : undefined
  const reportSection: DefinitionReportSection = {
    ...(firstSection || {}),
    Code: firstSection?.Code || 'personality_report',
    Kind: spec.report.kind,
    AdapterKey: spec.report.adapter_key,
    TemplateID: spec.report.template_id,
    CategoryLabel: spec.report.category_label
  }
  definition.ReportMap = { ...reportMap, Sections: [reportSection, ...sections.slice(1)] }
  return definition
}
