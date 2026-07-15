import { validateBehaviorAbilityDefinition } from './behaviorAbilityDefinitionValidation'
import type { DefinitionV2 } from './definitionV2'

describe('behavior ability DefinitionV2 local validation', () => {
  const completeDefinition: DefinitionV2 = {
    Measure: {
      Factors: [{ Code: 'TOTAL', Title: '总分', Role: 'total' }],
      Scoring: [{ FactorCode: 'TOTAL', Sources: [{ Kind: 'question', Code: 'Q1' }], Strategy: 'sum' }]
    },
    Calibration: { NormRefs: [{ FactorCode: 'TOTAL', NormTableVersion: 'brief2-parent-v1' }] },
    Execution: { Brief2: { FormVariant: 'parent', PrimaryFactorCode: 'TOTAL', IndexFactorCodes: [], ValidityFactorCodes: [] } },
    Conclusions: [{ Kind: 'norm', FactorCode: 'TOTAL', ScoreBasis: 't_score', Primary: true, Rules: [{ MinScore: 40, MaxScore: 60, OutcomeCode: 'typical' }] }],
    Outcomes: [{ Code: 'typical', Title: '典型范围' }]
  }

  const questions = [{ code: 'Q1' }] as any

  it('accepts a publishable BRIEF-2 definition', () => {
    expect(validateBehaviorAbilityDefinition(completeDefinition, 'brief2', questions)).toEqual([])
  })

  it('reports factor, question and outcome references before saving', () => {
    const invalid: DefinitionV2 = {
      ...completeDefinition,
      Measure: {
        Factors: [{ Code: 'TOTAL' }, { Code: 'TOTAL' }],
        Scoring: [{ FactorCode: 'MISSING', Sources: [{ Kind: 'question', Code: 'MISSING_QUESTION' }] }]
      },
      Calibration: { NormRefs: [{ FactorCode: 'MISSING', NormTableVersion: '' }] },
      Execution: { Brief2: { FormVariant: '', PrimaryFactorCode: 'MISSING' } },
      Conclusions: [{ Kind: 'norm', FactorCode: 'MISSING', ScoreBasis: 'unsupported', Rules: [{ MinScore: 60, MaxScore: 40, OutcomeCode: 'missing' }] }],
      Outcomes: [{ Code: 'same' }, { Code: 'same' }]
    }

    expect(validateBehaviorAbilityDefinition(invalid, 'brief2', questions)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'factor.code.duplicate' }),
      expect.objectContaining({ code: 'factor.scoring.factor_code.not_found' }),
      expect.objectContaining({ code: 'question.not_found' }),
      expect.objectContaining({ code: 'norm_ref.factor.not_found' }),
      expect.objectContaining({ code: 'norm_ref.version.required' }),
      expect.objectContaining({ code: 'brief2.form_variant.required' }),
      expect.objectContaining({ code: 'brief2.primary_factor.not_found' }),
      expect.objectContaining({ code: 'outcome.code.duplicate' }),
      expect.objectContaining({ code: 'conclusion.score_basis.invalid' }),
      expect.objectContaining({ code: 'conclusion.range.invalid' }),
      expect.objectContaining({ code: 'conclusion.outcome.not_found' })
    ]))
  })

  it('requires a primary norm conclusion whenever behavioral norms are configured', () => {
    const withoutPrimary: DefinitionV2 = {
      ...completeDefinition,
      Conclusions: [{ Kind: 'norm', FactorCode: 'TOTAL', ScoreBasis: 't_score', Rules: [] }]
    }

    expect(validateBehaviorAbilityDefinition(withoutPrimary, 'spm_sensory', questions)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'behavioral.norm.primary.required' })
    ]))
  })
})
