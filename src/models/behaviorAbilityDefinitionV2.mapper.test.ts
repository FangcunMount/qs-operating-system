import { applyBehaviorAbilityDefinition, projectBehaviorAbilityDefinition } from './behaviorAbilityDefinitionV2.mapper'
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
    form.outcomes[0].Title = '典型范围'
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
    expect(next.Outcomes).toEqual([expect.objectContaining({ Code: 'A', Title: '典型范围' })])
    expect(next.ReportMap).toEqual(source.ReportMap)
  })

  it('does not manufacture or retain Raven SPM execution for sensory SPM', () => {
    const legacyRavenSource: DefinitionV2 = {
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
    }
    const form = projectBehaviorAbilityDefinition(legacyRavenSource, 'spm_sensory')
    const next = applyBehaviorAbilityDefinition(legacyRavenSource, 'spm_sensory', form)

    expect(form.execution.SPM).toBeUndefined()
    expect(next.Execution?.SPM).toBeUndefined()
  })

  it('projects cognitive SPM execution, ability conclusions and report configuration', () => {
    const cognitiveSource: DefinitionV2 = {
      ...source,
      Execution: {
        SPM: {
          TimeLimitSeconds: 1200,
          TotalFactorCode: 'TOTAL',
          ItemSets: [{ Code: 'A', Items: [{ QuestionCode: 'Q1', CorrectOptionCode: 'A' }] }]
        },
        FutureExecution: true
      },
      Conclusions: [
        ...source.Conclusions || [],
        { Kind: 'ability', FactorCode: 'TOTAL', ScoreBasis: 'raw_score', Primary: true, Rules: [] }
      ]
    }

    const form = projectBehaviorAbilityDefinition(cognitiveSource, 'spm')
    const spm = form.execution.SPM
    expect(spm).toBeDefined()
    if (!spm) {
      throw new Error('expected SPM execution')
    }
    expect(spm).toMatchObject({ TimeLimitSeconds: 1200, TotalFactorCode: 'TOTAL' })
    expect(form.execution.Brief2).toBeUndefined()
    expect(form.conclusions).toEqual([expect.objectContaining({ Kind: 'ability', FactorCode: 'TOTAL' })])
    expect(form.reportMap).toEqual(cognitiveSource.ReportMap)

    spm.TimeLimitSeconds = 900
    form.reportMap.Sections = [{ Code: 'scores', Kind: 'factor_scores', SourceRefs: ['TOTAL'] }]
    const next = applyBehaviorAbilityDefinition(cognitiveSource, 'spm', form)

    expect(next.Execution).toMatchObject({ FutureExecution: true, SPM: { TimeLimitSeconds: 900 } })
    expect(next.Execution?.Brief2).toBeUndefined()
    expect(next.Conclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({ Kind: 'norm' }),
      expect.objectContaining({ Kind: 'ability', FactorCode: 'TOTAL' })
    ]))
    expect(next.ReportMap?.Sections).toEqual([expect.objectContaining({ Code: 'scores', SourceRefs: ['TOTAL'] })])
  })
})
