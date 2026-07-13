import { projectScaleFactorsFromDefinition, replaceScaleDefinitionFactors } from './scaleDefinition'

describe('scaleDefinition adapter', () => {
  const definition = {
    Measure: {
      Factors: [
        { Code: 'attention', Title: '注意力', Role: 'dimension' },
        { Code: 'total', Title: '总分', Role: 'total' },
      ],
      Scoring: [
        { FactorCode: 'attention', Sources: [{ Kind: 'question', Code: 'q1' }], Strategy: 'sum', MaxScore: 4 },
        { FactorCode: 'total', Sources: [{ Kind: 'factor', Code: 'attention' }], Strategy: 'sum', MaxScore: 4 },
      ],
    },
    Conclusions: [
      { Kind: 'risk', FactorCode: 'attention', Rules: [{ MinScore: 0, MaxScore: 2, Level: 'low', Title: '稳定', Summary: '继续观察' }], Outcomes: [] },
      { Kind: 'norm', FactorCode: 'attention', ScoreBasis: 't_score', Rules: [{ MinScore: 40, MaxScore: 60, Level: 'normal' }], Outcomes: [] },
    ],
    ReportMap: { Sections: [{ Code: 'factor_scores', Kind: 'factor_scores', SourceRefs: ['attention'] }] },
  }

  it('projects Measure, risk conclusions and report visibility without payload parsing', () => {
    expect(projectScaleFactorsFromDefinition(definition)).toEqual([
      expect.objectContaining({ code: 'attention', question_codes: ['q1'], is_show: true, interpret_rules: [expect.objectContaining({ conclusion: '稳定' })] }),
      expect.objectContaining({ code: 'total', factor_type: 'multi_grade', is_total_score: true, is_show: false }),
    ])
  })

  it('replaces only scale measure and risk semantics while retaining norm conclusions', () => {
    const next = replaceScaleDefinitionFactors(definition, [{
      code: 'attention', title: '注意力', type: 'first_grade', source_codes: ['q1'],
      calc_rule: { formula: 'sum', append_params: { cnt_option_contents: [] } },
      is_total_score: '0', max_score: 5, is_show: false,
      interpret_rules: [{ min_score: 3, max_score: 5, conclusion: '需要关注', suggestion: '复评', risk_level: 'high' }],
    }])

    expect(next.Measure.Scoring).toEqual([expect.objectContaining({ FactorCode: 'attention', MaxScore: 5 })])
    expect(next.Conclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({ Kind: 'norm', ScoreBasis: 't_score' }),
      expect.objectContaining({ Kind: 'risk', FactorCode: 'attention', Rules: [expect.objectContaining({ Level: 'high' })] }),
    ]))
    expect(next.ReportMap.Sections).toEqual([expect.objectContaining({ Kind: 'factor_scores', SourceRefs: [] })])
  })
})
