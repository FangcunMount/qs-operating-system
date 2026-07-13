import {
  createEmptyRuntimeSpec,
  normalizeRuntimeSpecForEdit,
  normalizeRuntimeSpecForSave,
  syncQuestionMappingsToContributions
} from './personalityRuntimeSpec.mapper'
import type { PersonalityTypologyRuntimeSpec } from './assessmentModel'
import mbtiRuntimeSpec from './__fixtures__/personalityRuntimeSpec.mbti.json'

describe('personalityRuntimeSpec.mapper', () => {
  it('migrates legacy question_mappings to canonical factor contributions', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        factors: { f1: { id: 'f1', kind: 'leaf' } },
        roots: ['f1'],
        question_mappings: [{ question_code: 'q1', factor_code: 'f1', option_scores: { A: 1, B: -1 } }]
      }
    }

    const saved = normalizeRuntimeSpecForSave(spec)
    expect(saved.factor_graph.question_mappings).toBeUndefined()
    expect(saved.factor_graph.factors?.f1.contributions).toEqual([{
      question_code: 'q1', scoring_mode: 'option_override', sign: 1, weight: 1,
      option_scores: { A: 1, B: -1 }
    }])
  })

  it('keeps explicit contributions as the only editor source of truth', () => {
    const edited = normalizeRuntimeSpecForEdit({
      factor_graph: {
        factors: { f1: { id: 'f1', kind: 'leaf', contributions: [{ question_code: 'q1', scoring_mode: 'question_score', sign: -1, weight: 0.5 }] } },
        roots: ['f1'],
        question_mappings: [{ question_code: 'ignored', factor_code: 'f1' }]
      },
      decision: { kind: 'pole_composition' },
      outcome_mapping: { outcomes: [] },
      report: { kind: 'personality_type' }
    })
    expect(edited.factor_graph.question_mappings).toBeUndefined()
    expect(edited.factor_graph.factors?.f1.contributions).toEqual([{
      question_code: 'q1', scoring_mode: 'question_score', sign: -1, weight: 0.5,
      option_scores: undefined, legacy_implicit: undefined
    }])
  })

  it('preserves legacy override results by normalizing an ignored negative sign', () => {
    const edited = normalizeRuntimeSpecForEdit({
      factor_graph: { factors: { f1: { id: 'f1', kind: 'leaf', contributions: [{ question_code: 'q1', sign: -1, option_scores: { A: 2 } }] } }, roots: ['f1'] },
      decision: { kind: 'pole_composition' }, outcome_mapping: { outcomes: [] }, report: { kind: 'personality_type' }
    })
    expect(edited.factor_graph.factors?.f1.contributions?.[0]).toMatchObject({
      scoring_mode: 'option_override', sign: 1, weight: 1, legacy_implicit: true
    })
  })

  it('normalizes legacy question_mappings.dimension to the matching factor', () => {
    const edited = normalizeRuntimeSpecForEdit({
      factor_graph: {
        factors: { f1: { id: 'f1', kind: 'leaf' } },
        question_mappings: [{ question_code: 'q1', dimension: 'f1' }]
      },
      decision: { kind: 'pole_composition' }, outcome_mapping: { outcomes: [] }, report: { kind: 'personality_type' }
    })
    expect(edited.factor_graph.factors?.f1.contributions?.[0]).toMatchObject({
      question_code: 'q1', scoring_mode: 'question_score', sign: 1, weight: 1
    })
  })

  it('canonicalizes checked-in legacy runtime fixtures without restoring question_mappings', () => {
    const saved = syncQuestionMappingsToContributions(mbtiRuntimeSpec as PersonalityTypologyRuntimeSpec)
    expect(saved.factor_graph.question_mappings).toBeUndefined()
    expect(Object.values(saved.factor_graph.factors || {}).flatMap((factor) => factor.contributions || []).length).toBeGreaterThan(0)
  })
})
