import type { AssessmentModelValidationIssue } from '@/models/assessmentModel'
import type { BehaviorAbilityAlgorithm } from '@/constants/behaviorAbility'
import type { DefinitionConclusion, DefinitionScoring, DefinitionV2 } from './definitionV2'

type ConclusionRule = {
  MinScore?: number
  MaxScore?: number
  MaxInclusive?: boolean
  UnboundedMax?: boolean
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
  questions: Array<{ code?: string; options?: Array<{ code?: string }> }> = []
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
      const executionFactorCodes = [...(brief2.IndexFactorCodes || []), ...(brief2.ValidityFactorCodes || [])]
      executionFactorCodes.forEach((factorCode) => {
        if (!factorCode || !factorCodes.has(factorCode)) {
          issues.push(issue('Execution.Brief2', 'execution.factor.not_found', `运行规则因子 ${factorCode || '（空）'} 未定义`))
        }
      })
    }
  } else if (algorithm === 'spm') {
    const spm = definition.Execution?.SPM
    if (!spm) {
      issues.push(issue('Execution.SPM', 'spm.execution.required', 'SPM 必须配置限时、总分因子与题组'))
    } else {
      if (!(spm.TimeLimitSeconds > 0)) {
        issues.push(issue('Execution.SPM.TimeLimitSeconds', 'spm.time_limit.required', 'SPM 测评时限必须大于 0 秒'))
      }
      if (!spm.TotalFactorCode || !factorCodes.has(spm.TotalFactorCode)) {
        issues.push(issue('Execution.SPM.TotalFactorCode', 'spm.total_factor.not_found', 'SPM 总分因子必须是已定义因子'))
      }
      if (!spm.ItemSets?.length) {
        issues.push(issue('Execution.SPM.ItemSets', 'spm.item_sets.required', 'SPM 必须至少配置一个题组'))
      }
      const seenSPMQuestions = new Set<string>()
      const itemSets = spm.ItemSets || []
      itemSets.forEach((itemSet, setIndex) => {
        const setField = `Execution.SPM.ItemSets[${setIndex}]`
        if (!itemSet.Code?.trim() || !itemSet.Items?.length) {
          issues.push(issue(setField, 'spm.item_set.invalid', 'SPM 题组必须填写编码并至少包含一道题'))
        }
        const items = itemSet.Items || []
        items.forEach((item, itemIndex) => {
          const itemField = `${setField}.Items[${itemIndex}]`
          if (!item.QuestionCode || !item.CorrectOptionCode) {
            issues.push(issue(itemField, 'spm.item.invalid', 'SPM 题目必须选择题目和正确选项'))
            return
          }
          const question = questions.find((candidate) => candidate.code === item.QuestionCode)
          if (!question) {
            issues.push(issue(`${itemField}.QuestionCode`, 'question.not_found', `SPM 题目 ${item.QuestionCode} 不在绑定问卷中`))
          } else if (!(question.options || []).some((option) => option.code === item.CorrectOptionCode)) {
            issues.push(issue(
              `${itemField}.CorrectOptionCode`,
              'question.option.not_found',
              `正确选项 ${item.CorrectOptionCode} 不属于题目 ${item.QuestionCode}`
            ))
          }
          if (seenSPMQuestions.has(item.QuestionCode)) {
            issues.push(issue(itemField, 'spm.question.duplicate', `SPM 题目 ${item.QuestionCode} 重复配置`))
          }
          seenSPMQuestions.add(item.QuestionCode)
        })
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

  const conclusionKind = algorithm === 'spm' ? 'ability' : 'norm'
  const factorConclusions = (definition.Conclusions || []).filter((item): item is NormConclusion => item.Kind === conclusionKind)
  factorConclusions.forEach((conclusion, index) => {
    const field = `Conclusions.${conclusionKind}[${index}]`
    if (!conclusion.FactorCode || !factorCodes.has(conclusion.FactorCode)) {
      issues.push(issue(`${field}.FactorCode`, 'conclusion.factor.not_found', `解释因子 ${conclusion.FactorCode || '（空）'} 未定义`))
    }
    if (!['raw_score', 't_score', 'percentile', 'standard_score'].includes(conclusion.ScoreBasis || '')) {
      issues.push(issue(`${field}.ScoreBasis`, 'conclusion.score_basis.invalid', '解释计分依据必须是原始分、T 分、百分位或标准分'))
    }
    const conclusionRules = conclusion.Rules || []
    if (!conclusionRules.length) {
      issues.push(issue(`${field}.Rules`, 'conclusion.rules.required', '解释规则至少需要一个分数区间'))
    }
    conclusionRules.forEach((rule, ruleIndex) => {
      const ruleField = `${field}.Rules[${ruleIndex}]`
      if (typeof rule.MinScore === 'number' && typeof rule.MaxScore === 'number' && rule.MinScore > rule.MaxScore) {
        issues.push(issue(ruleField, 'conclusion.range.invalid', '解释规则的最小分不能大于最大分'))
      }
      if (rule.MaxInclusive && rule.UnboundedMax) {
        issues.push(issue(ruleField, 'conclusion.range.endpoint.conflict', '区间不能同时包含最大值并设置为无上限'))
      }
      if (!rule.OutcomeCode) {
        issues.push(issue(ruleField, 'conclusion.outcome_code.required', '解释规则必须关联结果分类'))
      } else if (!outcomeCodes.has(rule.OutcomeCode)) {
        issues.push(issue(ruleField, 'conclusion.outcome.not_found', `结果编码 ${rule.OutcomeCode} 未在结果库中定义`))
      }
    })
    const orderedRules = conclusionRules
      .map((rule, ruleIndex) => ({ rule, ruleIndex }))
      .sort((left, right) => (left.rule.MinScore || 0) - (right.rule.MinScore || 0))
    orderedRules.forEach(({ rule, ruleIndex }, orderedIndex) => {
      const ruleField = `${field}.Rules[${ruleIndex}]`
      const isLast = orderedIndex === orderedRules.length - 1
      if (!isLast && (rule.MaxInclusive || rule.UnboundedMax)) {
        issues.push(issue(ruleField, 'conclusion.range.endpoint.non_last', '只有最后一个区间可以包含最大值或设置为无上限'))
      }
      if (isLast && !rule.MaxInclusive && !rule.UnboundedMax) {
        issues.push(issue(ruleField, 'conclusion.range.endpoint.required', '最后一个区间必须包含最大值或设置为无上限'))
      }
      const next = orderedRules[orderedIndex + 1]?.rule
      if (!next || rule.UnboundedMax || typeof rule.MaxScore !== 'number' || typeof next.MinScore !== 'number') return
      if (next.MinScore > rule.MaxScore) {
        issues.push(issue(ruleField, 'conclusion.range.gap', '相邻分数区间之间存在空档'))
      } else if (next.MinScore < rule.MaxScore || (next.MinScore === rule.MaxScore && rule.MaxInclusive)) {
        issues.push(issue(ruleField, 'conclusion.range.overlap', '相邻分数区间存在重叠'))
      }
    })
    if (conclusion.ScoreBasis && conclusion.ScoreBasis !== 'raw_score') {
      const hasNormRef = normRefs.some((ref) => ref.FactorCode === conclusion.FactorCode && ref.NormTableVersion)
      if (!hasNormRef) {
        issues.push(issue(field, 'conclusion.norm_ref.missing', `解释因子 ${conclusion.FactorCode || '（空）'} 缺少对应常模引用`))
      }
    }
  })

  if ((normRefs.length || factorConclusions.length) && !factorConclusions.some((conclusion) => conclusion.Primary)) {
    const code = conclusionKind === 'ability' ? 'cognitive.ability.primary.required' : 'behavioral.norm.primary.required'
    issues.push(issue(`Conclusions.${conclusionKind}`, code, '必须指定一个主解释因子'))
  }

  const reportSectionCodes = new Set<string>()
  const reportSections = definition.ReportMap?.Sections || []
  reportSections.forEach((section, index) => {
    const field = `ReportMap.Sections[${index}]`
    if (!section.Code?.trim()) issues.push(issue(`${field}.Code`, 'report_section.code.required', '报告区块编码不能为空'))
    else if (reportSectionCodes.has(section.Code)) issues.push(issue(`${field}.Code`, 'report_section.code.duplicate', `报告区块编码 ${section.Code} 重复`))
    if (section.Code) reportSectionCodes.add(section.Code)
    if (section.Kind === 'factor_scores') {
      const sourceRefs = section.SourceRefs || []
      sourceRefs.forEach((factorCode) => {
        if (!factorCode || !factorCodes.has(factorCode)) {
          issues.push(issue(`${field}.SourceRefs`, 'report_section.source_ref.not_found', `报告区块引用因子 ${factorCode || '（空）'} 不存在`))
        }
      })
    }
  })

  return issues
}
