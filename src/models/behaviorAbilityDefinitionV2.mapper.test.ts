import { applyBehaviorAbilityDefinition, projectBehaviorAbilityDefinition, validateSPMDefinitionForm } from './behaviorAbilityDefinitionV2.mapper'
import type { DefinitionV2 } from './definitionV2'

describe('behavior ability DefinitionV2 projection', () => {
  const source: DefinitionV2 = {
    Measure: {
      Factors: [{ Code: 'TOTAL', Title: '总分', Role: 'total', Keep: true }],
      Scoring: [{ FactorCode: 'TOTAL', Sources: [{ Kind: 'question', Code: 'Q1' }], Strategy: 'sum' }]
    },
    Calibration: { NormRefs: [{ FactorCode: 'TOTAL', NormTableVersion: 'norm-v1', Keep: true }], FutureCalibration: true },
    Execution: { Brief2: { FormVariant: 'parent', PrimaryFactorCode: 'TOTAL', FutureBrief2: true }, FutureExecution: true },
    Conclusions: [
      { Kind: 'risk', FactorCode: 'TOTAL', Rules: [{ MinScore: 0, MaxScore: 1 }] },
      { Kind: 'norm', FactorCode: 'TOTAL', ScoreBasis: 't_score', Rules: [], FutureNorm: true }
    ],
    Outcomes: [{ Code: 'A', Title: '结果 A' }],
    ReportMap: { Sections: [{ Code: 'report', Kind: 'summary', FutureReport: true }] },
    FutureTopLevel: { keep: true }
  }

  it('merges BRIEF-2 form edits without losing unrelated DefinitionV2 fields', () => {
    const form = projectBehaviorAbilityDefinition(source, 'brief2')
    const brief2 = form.execution.Brief2
    expect(brief2).toBeDefined()
    if (!brief2) {
      throw new Error('expected Brief2 execution')
    }
    brief2.FormVariant = 'teacher'
    form.conclusions[0].Rules = [{ MinScore: 40, MaxScore: 60, Level: 'typical' }]
    const next = applyBehaviorAbilityDefinition(source, 'brief2', form)

    expect(next.FutureTopLevel).toEqual({ keep: true })
    expect(next.Calibration).toMatchObject({ FutureCalibration: true, NormRefs: [{ Keep: true }] })
    expect(next.Execution).toMatchObject({ FutureExecution: true, Brief2: { FormVariant: 'teacher', FutureBrief2: true } })
    expect(next.Conclusions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Kind: 'risk', FactorCode: 'TOTAL' }),
        expect.objectContaining({ Kind: 'norm', FactorCode: 'TOTAL', FutureNorm: true })
      ])
    )
    expect(next.ReportMap).toEqual(source.ReportMap)
  })

  it('validates SPM item codes against the bound questionnaire and rejects duplicate questions', () => {
    const form = projectBehaviorAbilityDefinition(
      {
        ...source,
        Execution: {
          SPM: {
            TimeLimitSeconds: 900,
            TotalFactorCode: 'TOTAL',
            ItemSets: [
              { Code: 'A', Items: [{ QuestionCode: 'Q1', CorrectOptionCode: 'A' }] },
              { Code: 'B', Items: [{ QuestionCode: 'Q1', CorrectOptionCode: 'B' }] }
            ]
          }
        }
      },
      'spm'
    )
    const issues = validateSPMDefinitionForm(form, [{ code: 'Q1', options: [{ code: 'A', content: '答案 A' }] }])

    expect(issues.map((item) => item.code)).toEqual(expect.arrayContaining(['spm.question.duplicate', 'spm.option.not_found']))
  })
})
