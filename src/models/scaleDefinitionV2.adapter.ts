import type { IFactor } from './factor'
import type { IFactorAnalysis, IInterpretation } from './analysis'
import type { DefinitionV2 } from './definitionV2'

/** The scale editor's projection layer. It intentionally has no HTTP knowledge:
 * callers GET a DefinitionV2, project their owned fields, and PUT the complete
 * patched object back through ModelCatalog. */
export type RawDefinition = DefinitionV2

export interface IScaleFactorResponse {
  code: string
  title: string
  factor_type: string
  question_codes: string[]
  scoring_strategy: string
  is_total_score: boolean
  scoring_params?: Record<string, any>
  max_score?: number
  risk_level?: string
  is_show?: boolean
  interpret_rules?: Array<{
    min_score: number
    max_score: number
    conclusion: string
    suggestion: string
    risk_level: string
  }>
}

export interface ScaleDefinitionWithFactors {
  factors?: IScaleFactorResponse[]
}

export interface ScaleAnalysis {
  macro_rule: { max_score: number; interpretation: IInterpretation[] }
  factor_rules: IFactorAnalysis[]
}

const readField = (value: any, ...keys: string[]) => {
  for (const key of keys) {
    if (value?.[key] !== undefined) return value[key]
  }
  return undefined
}

const asArray = <T = any>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []
const asString = (value: unknown): string => value === undefined || value === null ? '' : String(value)
const asNumber = (value: unknown): number | undefined => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const measureOf = (definition: RawDefinition) => readField(definition, 'Measure', 'measure') || {}
const conclusionsOf = (definition: RawDefinition) => asArray(readField(definition, 'Conclusions', 'conclusions'))
const reportMapOf = (definition: RawDefinition) => readField(definition, 'ReportMap', 'report_map') || {}

const setCaseField = (target: RawDefinition, upper: string, lower: string, value: unknown) => {
  target[upper in target || !(lower in target) ? upper : lower] = value
}

const scoringForFactor = (definition: RawDefinition, factorCode: string) => asArray(readField(measureOf(definition), 'Scoring', 'scoring'))
  .find((item: any) => asString(readField(item, 'FactorCode', 'factor_code')) === factorCode)

const visibleFactorCodes = (definition: RawDefinition): Set<string> | undefined => {
  const section = asArray(readField(reportMapOf(definition), 'Sections', 'sections'))
    .find((item: any) => asString(readField(item, 'Kind', 'kind')) === 'factor_scores')
  if (!section) return undefined
  return new Set(asArray<string>(readField(section, 'SourceRefs', 'source_refs')).map(asString))
}

const riskConclusionForFactor = (definition: RawDefinition, factorCode: string) => conclusionsOf(definition)
  .find((item: any) => asString(readField(item, 'FactorCode', 'factor_code')) === factorCode && Array.isArray(readField(item, 'Rules', 'rules')))

const factorFromDefinition = (definition: RawDefinition, rawFactor: any): IScaleFactorResponse => {
  const code = asString(readField(rawFactor, 'Code', 'code'))
  const scoring = scoringForFactor(definition, code) || {}
  const sources = asArray(readField(scoring, 'Sources', 'sources'))
  const role = asString(readField(rawFactor, 'Role', 'role'))
  const questionCodes = sources
    .filter((source: any) => asString(readField(source, 'Kind', 'kind')) === 'question')
    .map((source: any) => asString(readField(source, 'Code', 'code')))
  const factorSources = sources.filter((source: any) => asString(readField(source, 'Kind', 'kind')) === 'factor')
  const visible = visibleFactorCodes(definition)
  const risk = riskConclusionForFactor(definition, code)
  const rules = asArray(readField(risk, 'Rules', 'rules')).map((rule: any) => {
    const level = asString(readField(rule, 'OutcomeCode', 'outcome_code'))
      || asString(readField(rule, 'Level', 'level'))
      || 'none'
    const description = asString(readField(rule, 'Description', 'description'))
    // Old admin projections put conclusion/suggestion in Title/Summary and
    // left Description blank. Keep those saved definitions editable while
    // preferring the server's canonical ScoreRangeOutcome fields.
    const isLegacyProjection = Boolean(readField(rule, 'Level', 'level')) && !description
    return {
      min_score: asNumber(readField(rule, 'MinScore', 'min_score')) || 0,
      max_score: asNumber(readField(rule, 'MaxScore', 'max_score')) || 0,
      conclusion: isLegacyProjection
        ? asString(readField(rule, 'Title', 'title'))
        : asString(readField(rule, 'Summary', 'summary')) || asString(readField(rule, 'Title', 'title')),
      suggestion: isLegacyProjection
        ? asString(readField(rule, 'Summary', 'summary'))
        : description,
      risk_level: level,
    }
  })
  const params = readField(scoring, 'Params', 'params') || undefined
  const maxScore = asNumber(readField(scoring, 'MaxScore', 'max_score'))

  return {
    code,
    title: asString(readField(rawFactor, 'Title', 'title')),
    factor_type: factorSources.length > 0 ? 'multi_grade' : 'first_grade',
    question_codes: questionCodes,
    scoring_strategy: asString(readField(scoring, 'Strategy', 'strategy')) || 'sum',
    is_total_score: role === 'total',
    scoring_params: params ? { cnt_option_contents: asArray(readField(params, 'CntOptionContents', 'cnt_option_contents')) } : undefined,
    max_score: maxScore,
    risk_level: rules[0]?.risk_level,
    is_show: visible ? visible.has(code) : true,
    interpret_rules: rules,
  }
}

export const projectScaleFactorsFromDefinition = (definition: RawDefinition): IScaleFactorResponse[] => {
  const factors = asArray(readField(measureOf(definition), 'Factors', 'factors'))
  return factors.map((factor) => factorFromDefinition(definition, factor))
}

export const factorToEditorModel = (factor: IScaleFactorResponse): IFactor => ({
  code: factor.code,
  title: factor.title,
  type: factor.factor_type === 'multi_grade' ? 'multi_grade' : 'first_grade',
  source_codes: factor.question_codes || [],
  calc_rule: {
    formula: factor.scoring_strategy === 'avg' || factor.scoring_strategy === 'cnt' ? factor.scoring_strategy : 'sum',
    append_params: { cnt_option_contents: asArray(factor.scoring_params?.cnt_option_contents) },
  },
  is_total_score: factor.is_total_score ? '1' : '0',
  max_score: factor.max_score,
  is_show: factor.is_show,
})

const interpretationRules = (factor: IScaleFactorResponse): IInterpretation[] => asArray(factor.interpret_rules).map((rule) => ({
  start: String(rule.min_score ?? ''),
  end: String(rule.max_score ?? ''),
  conclusion: asString(rule.conclusion),
  suggestion: asString(rule.suggestion),
  risk_level: asString(rule.risk_level || 'none') as IInterpretation['risk_level'],
}))

export const analysisFromScaleResponse = (scale: ScaleDefinitionWithFactors): ScaleAnalysis => {
  const factorRules: IFactorAnalysis[] = (scale.factors || []).map((factor) => ({
    code: factor.code,
    title: factor.title,
    max_score: factor.max_score || 0,
    is_total_score: factor.is_total_score ? '1' : '0',
    interpret_rule: {
      is_show: factor.is_show === false ? '0' : '1',
      interpretation: interpretationRules(factor),
    },
  }))
  const total = factorRules.find((factor) => factor.is_total_score === '1')
  return {
    macro_rule: { max_score: total?.max_score || 0, interpretation: total?.interpret_rule.interpretation || [] },
    factor_rules: factorRules,
  }
}

/** Server validates Rules.Level / OutcomeCode against Outcomes[].Code. */
const RISK_LEVEL_TITLES: Record<string, string> = {
  none: '无风险',
  normal: '正常',
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  severe: '严重风险',
}

const riskLevelOutcome = (code: string) => ({
  Code: code,
  Title: RISK_LEVEL_TITLES[code] || code,
})

const riskConclusion = (factor: any) => {
  // This is newly generated by the scale projection, so its polymorphic
  // DefinitionV2 discriminator must be explicit rather than inferred by API.
  const rules = asArray<any>(factor.interpret_rules).map((rule) => {
    const level = asString(rule.risk_level || 'none')
    return {
      MinScore: Number(rule.min_score) || 0,
      MaxScore: Number(rule.max_score) || 0,
      Level: level,
      OutcomeCode: level,
      Title: RISK_LEVEL_TITLES[level] || level,
      Summary: asString(rule.conclusion),
      Description: asString(rule.suggestion),
    }
  })
  const outcomeCodes = Array.from(new Set(rules.map((rule) => rule.Level).filter(Boolean)))
  return {
    Kind: 'risk',
    FactorCode: factor.code,
    Rules: rules,
    Outcomes: outcomeCodes.map(riskLevelOutcome),
  }
}

/** Replaces only Factor/Scoring/risk conclusions/factor report-section data.
 * Every other DefinitionV2 segment remains from the preceding GET response. */
export const replaceScaleDefinitionFactors = (definition: RawDefinition, factors: any[]): RawDefinition => {
  const next = { ...definition }
  const graphEdges: any[] = []
  const scoring = factors.map((factor) => {
    const factorSources = factor.type === 'multi_grade'
    const sourceCodes = asArray<string>(factor.source_codes)
    const sources = sourceCodes.map((code) => ({ Kind: factorSources ? 'factor' : 'question', Code: code }))
    if (factorSources) {
      sourceCodes.forEach((childCode) => graphEdges.push({ ParentCode: factor.code, ChildCode: childCode }))
    }
    const params = factor.calc_rule?.formula === 'cnt'
      ? { CntOptionContents: asArray(factor.calc_rule?.append_params?.cnt_option_contents) }
      : undefined
    const maxScore = asNumber(factor.max_score)
    return {
      FactorCode: factor.code,
      Sources: sources,
      Strategy: factor.calc_rule?.formula || 'sum',
      Params: params,
      MaxScore: maxScore,
    }
  })
  const factorsValue = factors.map((factor) => ({
    Code: factor.code,
    Title: factor.title,
    Role: factor.is_total_score === '1' ? 'total' : factor.type === 'multi_grade' ? 'index' : 'dimension',
  }))
  const childCodes = new Set(graphEdges.map((edge) => edge.ChildCode))
  const roots = factors.map((factor) => factor.code).filter((code) => !childCodes.has(code))
  setCaseField(next, 'Measure', 'measure', {
    ...measureOf(definition),
    Factors: factorsValue,
    FactorGraph: { ...readField(measureOf(definition), 'FactorGraph', 'factor_graph'), Roots: roots, Edges: graphEdges },
    Scoring: scoring,
  })

  const currentConclusions = conclusionsOf(definition).filter((item: any) => {
    const kind = asString(readField(item, 'Kind', 'kind'))
    const targetsEditedFactor = factors.some((factor) => factor.code === asString(readField(item, 'FactorCode', 'factor_code')))
    // The scale editor owns risk conclusions. Some legacy payloads include an
    // empty ScoreBasis on risk items, so use the discriminator rather than
    // ScoreBasis to avoid retaining a second, stale rule set.
    return kind !== 'risk' || !targetsEditedFactor
  })
  const riskConclusions = factors.filter((factor) => asArray(factor.interpret_rules).length > 0).map(riskConclusion)
  setCaseField(next, 'Conclusions', 'conclusions', [...currentConclusions, ...riskConclusions])

  // Keep top-level Outcomes in sync: the API resolves Rules.Level as an outcome code.
  const usedLevels = new Set<string>()
  riskConclusions.forEach((conclusion: any) => {
    asArray(conclusion.Rules).forEach((rule: any) => {
      const code = asString(rule.Level || rule.OutcomeCode)
      if (code) usedLevels.add(code)
    })
  })
  const existingOutcomes = asArray(readField(definition, 'Outcomes', 'outcomes'))
  const existingCodes = new Set(existingOutcomes.map((item: any) => asString(readField(item, 'Code', 'code'))))
  const mergedOutcomes = [
    ...existingOutcomes,
    ...Array.from(usedLevels).filter((code) => !existingCodes.has(code)).map(riskLevelOutcome),
  ]
  setCaseField(next, 'Outcomes', 'outcomes', mergedOutcomes)

  const visibleCodes = factors.filter((factor) => factor.is_show !== false).map((factor) => factor.code)
  const sections = asArray(readField(reportMapOf(definition), 'Sections', 'sections'))
    .filter((section: any) => asString(readField(section, 'Kind', 'kind')) !== 'factor_scores')
  sections.push({ Code: 'factor_scores', Title: '因子得分', Kind: 'factor_scores', SourceRefs: visibleCodes })
  setCaseField(next, 'ReportMap', 'report_map', { ...reportMapOf(definition), Sections: sections })
  return next
}
