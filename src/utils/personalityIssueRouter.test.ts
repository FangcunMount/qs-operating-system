import { isQuestionnaireBindingIssue, resolveDefinitionIssueTab } from './personalityIssueRouter'

describe('DefinitionV2 validation issue routing', () => {
  it('uses canonical DefinitionV2 field/code paths instead of legacy payload paths', () => {
    expect(resolveDefinitionIssueTab({
      field: 'definition_v2.Measure.Scoring[0].Sources',
      code: 'definition_v2.measure.source.invalid',
      message: 'invalid source'
    })).toBe('question_mapping')
    expect(resolveDefinitionIssueTab({
      field: 'definition_v2.Conclusions[0]',
      code: 'definition_v2.decision.invalid',
      message: 'invalid decision'
    })).toBe('decision')
    expect(resolveDefinitionIssueTab({
      field: 'definition_v2.ReportMap.Sections[0]',
      message: 'invalid report'
    })).toBe('report')
  })

  it('keeps questionnaire binding out of the DefinitionV2 tabs', () => {
    expect(isQuestionnaireBindingIssue({
      field: 'binding.questionnaire_version',
      message: 'missing version'
    })).toBe(true)
  })
})
