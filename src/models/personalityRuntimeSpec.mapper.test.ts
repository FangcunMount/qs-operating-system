import {
  createEmptyRuntimeSpec,
  normalizeRuntimeSpecForEdit,
  normalizeRuntimeSpecForSave,
  syncContributionsToQuestionMappings,
  syncQuestionMappingsToContributions
} from './personalityRuntimeSpec.mapper'
import type { PersonalityTypologyRuntimeSpec } from './assessmentModel'
import mbtiRuntimeSpec from './__fixtures__/personalityRuntimeSpec.mbti.json'

describe('personalityRuntimeSpec.mapper', () => {
  it('projects question_mappings to factor.contributions on save', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: { f1: { id: 'f1', kind: 'leaf' } },
        roots: ['f1'],
        question_mappings: [{
          question_code: 'q1',
          factor_code: 'f1',
          option_scores: { A: 1, B: -1 }
        }]
      }
    }

    const saved = normalizeRuntimeSpecForSave(spec)
    expect(saved.factor_graph?.factors?.f1?.contributions).toEqual([{
      question_code: 'q1',
      sign: undefined,
      option_scores: { A: 1, B: -1 }
    }])
  })

  it('restores question_mappings from contributions on edit', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: {
          f1: {
            id: 'f1',
            kind: 'leaf',
            contributions: [{ question_code: 'q1', option_scores: { A: 1 } }]
          }
        },
        roots: ['f1'],
        question_mappings: []
      }
    }

    const edited = syncContributionsToQuestionMappings(spec)
    expect(edited.factor_graph?.question_mappings).toEqual([{
      question_code: 'q1',
      factor_code: 'f1',
      sign: undefined,
      option_scores: { A: 1 }
    }])
  })

  it('keeps existing question_mappings when already present', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: {
          f1: {
            id: 'f1',
            kind: 'leaf',
            contributions: [{ question_code: 'q1', option_scores: { A: 1 } }]
          }
        },
        roots: ['f1'],
        question_mappings: [{ question_code: 'q2', factor_code: 'f1', option_scores: { A: 2 } }]
      }
    }

    expect(syncContributionsToQuestionMappings(spec).factor_graph?.question_mappings).toEqual([
      { question_code: 'q2', factor_code: 'f1', option_scores: { A: 2 } }
    ])
  })

  it('normalizes backend runtime spec for edit with contributions recovery', () => {
    const backendPayload = {
      factor_graph: {
        factors: {
          f1: {
            id: 'f1',
            kind: 'leaf',
            contributions: [{ question_code: 'q1', option_scores: { A: 1, B: 0 } }]
          }
        },
        roots: ['f1'],
        question_mappings: []
      },
      decision: { kind: 'pole_composition' },
      outcome_mapping: { outcomes: [{ code: 'ENFP', name: 'ENFP' }] },
      report: { kind: 'default' }
    }

    const edited = normalizeRuntimeSpecForEdit(backendPayload, 'q1')
    expect(edited.factor_graph?.question_mappings).toEqual([{
      question_code: 'q1',
      factor_code: 'f1',
      sign: undefined,
      option_scores: { A: 1, B: 0 }
    }])
    const saved = normalizeRuntimeSpecForSave(edited)
    expect(saved.factor_graph?.factors?.f1?.contributions).toEqual([{
      question_code: 'q1',
      sign: undefined,
      option_scores: { A: 1, B: 0 }
    }])
  })

  it('normalizes legacy question_mappings.dimension to factor_code', () => {
    const edited = normalizeRuntimeSpecForEdit({
      factor_graph: {
        factors: { f1: { id: 'f1', kind: 'leaf' } },
        question_mappings: [{ question_code: 'q1', dimension: 'f1', option_scores: { A: 1 } }]
      },
      decision: { kind: 'pole_composition' },
      outcome_mapping: { outcomes: [{ code: 'O1', name: '结果' }] },
      report: { kind: 'default' }
    })
    expect(edited.factor_graph?.question_mappings).toEqual([{
      question_code: 'q1',
      factor_code: 'f1',
      option_scores: { A: 1 }
    }])
  })

  it('roundtrips mappings through sync helpers', () => {
    const original = mbtiRuntimeSpec as PersonalityTypologyRuntimeSpec
    const saved = syncQuestionMappingsToContributions(original)
    const restored = syncContributionsToQuestionMappings({
      ...saved,
      factor_graph: { ...saved.factor_graph, question_mappings: [] }
    })
    expect(restored.factor_graph?.question_mappings?.length).toBeGreaterThan(0)
  })
})
