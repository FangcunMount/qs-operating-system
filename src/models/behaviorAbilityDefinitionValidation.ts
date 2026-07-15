import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'
import type { BehaviorAbilityAlgorithm } from '@/constants/behaviorAbility'
import type { DefinitionConclusion, DefinitionScoring, DefinitionV2 } from './definitionV2'

type ConclusionRule = {
  MinScore?: number
  MaxScore?: number
  OutcomeCode?: string
}

type NormConclusion = DefinitionConclusion & {
  FactorCode?: string
  ScoreBasis?: string
  Primary?: boolean
  Rules?: ConclusionRule[]
}

const issue = (field: string, code: string, message: string): AssessmentModelValidationIssue => ({ field, code, message, level: 'error' })

const addUnique = (issues: AssessmentModelValidationIssue[], field: string, code: string, message: string): void => {
  if (!issues.some((item) => item.field === field && item.code === code)) issues.push(issue(field, code, message))
}

/** Mirrors the DefinitionV2 references the admin can validate without a
 * server round-trip. Server-side validation remains authoritative. */
export const validateBehaviorAbilityDefinition = (
  definition: DefinitionV2,
  algorithm: BehaviorAbilityAlgorithm,
  questions: Array<{ code?: string }> = []
): AssessmentModelValidationIssue[] => {
  const issues: AssessmentModelValidationIssue[] = []
  const factors = definition.Measure?.Factors || []
  const factorCodes = new Set<string>()

  factors.forEach((factor, index) => {
    const code = factor.Code?.trim()
    if (!code) {
      issues.push(issue(`Measure.Factors[${index}].Code`, 'factor.code.required', '因子编码不能为空'))
      return
    }
    if (factorCodes.has(code)) issues.push(issue(`Measure.Factors[${index}].Code`, 'factor.code.duplicate', `因子编码 ${code} 重复`))
    factorCodes.add(code)
  })

  const questionCodes = new Set(questions.map((question) => question.code).filter(Boolean) as string[])
  const scoring = definition.Measure?.Scoring || []
  scoring.forEach((rule: DefinitionScoring, index) => {
    const factorCode = rule.FactorCode?.trim()
    if (!factorCode || !factorCodes.has(factorCode)) {
      issues.push(issue(`Measure.Scoring[${index}].FactorCode`, 'factor.scoring.factor_code.not_found', `计分规则引用了不存在的因子 ${factorCode || '（空）'}`))
    }
    const sourceKinds = new Set<string>()
    const seenQuestionCodes = new Set<string>()
    ;(rule.Sources || []).forEach((source, sourceIndex) => {
      const sourceField = `Measure.Scoring[${index}].Sources[${sourceIndex}]`
      if (!source.Kind || !source.Code) {
        issues.push(issue(sourceField, 'factor.scoring.source.invalid', '计分来源必须包含类型和编码'))
        return
      }
      sourceKinds.add(source.Kind)
      if (source.Kind === 'factor' && !factorCodes.has(source.Code)) {
        issues.push(issue(sourceField, 'factor.children_policy.child.not_found', `计分来源因子 ${source.Code} 不存在`))
      }
      if (source.Kind === 'question') {
        if (!questionCodes.has(source.Code)) issues.push(issue(sourceField, 'question.not_found', `计分来源题目 ${source.Code} 不在绑定问卷中`))
        if (seenQuestionCodes.has(source.Code)) issues.push(issue(sourceField, 'question_contribution.duplicate', `题目 ${source.Code} 在同一因子中重复计分`))
        seenQuestionCodes.add(source.Code)
      }
    })
    if (sourceKinds.size > 1) addUnique(issues, `Measure.Scoring[${index}].Sources`, 'factor.scoring.source.mixed', '同一计分规则不能混用题目与因子来源')
  })

  const normRefs = definition.Calibration?.NormRefs || []
  const normRefKeys = new Set<string>()
  normRefs.forEach((ref, index) => {
    const field = `Calibration.NormRefs[${index}]`
    if (!ref.FactorCode) issues.push(issue(`${field}.FactorCode`, 'norm_ref.factor.required', '常模引用必须选择因子'))
    else if (!factorCodes.has(ref.FactorCode)) issues.push(issue(`${field}.FactorCode`, 'norm_ref.factor.not_found', `常模引用因子 ${ref.FactorCode} 不存在`))
    if (!ref.NormTableVersion) issues.push(issue(`${field}.NormTableVersion`, 'norm_ref.version.required', '常模引用必须选择常模版本'))
    const key = `${ref.FactorCode || ''}@${ref.NormTableVersion || ''}`
    if (key !== '@' && normRefKeys.has(key)) issues.push(issue(field, 'norm_ref.duplicate', `常模引用 ${key} 重复`))
    normRefKeys.add(key)
  })

  if (algorithm === 'brief2') {
    const brief2 = definition.Execution?.Brief2
    if (!brief2) {
      issues.push(issue('Execution.Brief2', 'brief2.execution.required', 'BRIEF-2 必须配置运行规则'))
    } else {
      if (!brief2.FormVariant?.trim()) issues.push(issue('Execution.Brief2.FormVariant', 'brief2.form_variant.required', 'BRIEF-2 必须填写表单变体'))
      if (!brief2.PrimaryFactorCode || !factorCodes.has(brief2.PrimaryFactorCode)) {
        issues.push(issue('Execution.Brief2.PrimaryFactorCode', 'brief2.primary_factor.not_found', 'BRIEF-2 主指标必须是已定义因子'))
      }
      ;[...(brief2.IndexFactorCodes || []), ...(brief2.ValidityFactorCodes || [])].forEach((factorCode) => {
        if (!factorCode || !factorCodes.has(factorCode)) {
          issues.push(issue('Execution.Brief2', 'execution.factor.not_found', `运行规则因子 ${factorCode || '（空）'} 未定义`))
        }
      })
    }
  }

  const outcomes = definition.Outcomes || []
  const outcomeCodes = new Set<string>()
  outcomes.forEach((outcome, index) => {
    const code = outcome.Code?.trim()
    if (!code) {
      issues.push(issue(`Outcomes[${index}].Code`, 'outcome.code.required', '结果编码不能为空'))
      return
    }
    if (outcomeCodes.has(code)) issues.push(issue(`Outcomes[${index}].Code`, 'outcome.code.duplicate', `结果编码 ${code} 重复`))
    outcomeCodes.add(code)
  })

  const normConclusions = (definition.Conclusions || []).filter((item): item is NormConclusion => item.Kind === 'norm')
  normConclusions.forEach((conclusion, index) => {
    const field = `Conclusions.norm[${index}]`
    if (!conclusion.FactorCode || !factorCodes.has(conclusion.FactorCode)) {
      issues.push(issue(`${field}.FactorCode`, 'conclusion.factor.not_found', `解释因子 ${conclusion.FactorCode || '（空）'} 未定义`))
    }
    if (!['raw_score', 't_score', 'percentile', 'standard_score'].includes(conclusion.ScoreBasis || '')) {
      issues.push(issue(`${field}.ScoreBasis`, 'conclusion.score_basis.invalid', '解释计分依据必须是原始分、T 分、百分位或标准分'))
    }
    ;(conclusion.Rules || []).forEach((rule, ruleIndex) => {
      const ruleField = `${field}.Rules[${ruleIndex}]`
      if (typeof rule.MinScore === 'number' && typeof rule.MaxScore === 'number' && rule.MinScore > rule.MaxScore) {
        issues.push(issue(ruleField, 'conclusion.range.invalid', '解释规则的最小分不能大于最大分'))
      }
      if (rule.OutcomeCode && !outcomeCodes.has(rule.OutcomeCode)) {
        issues.push(issue(ruleField, 'conclusion.outcome.not_found', `结果编码 ${rule.OutcomeCode} 未在结果库中定义`))
      }
    })
  })

  if ((normRefs.length || normConclusions.length) && !normConclusions.some((conclusion) => conclusion.Primary)) {
    issues.push(issue('Conclusions.norm', 'behavioral.norm.primary.required', '配置常模后必须指定一个主解释因子'))
  }

  return issues
}
