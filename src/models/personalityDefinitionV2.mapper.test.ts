import { DefinitionV2 } from './definitionV2'
import {
  applyPersonalityRuntimeSpec,
  projectPersonalityRuntimeSpec
} from './personalityDefinitionV2.mapper'
import contractDefinition from './__fixtures__/personalityDefinitionV2.contract.json'
import { createEmptyDefinitionV2 } from './definitionV2'

describe('personality DefinitionV2 projection', () => {
  const source: DefinitionV2 = {
    Measure: {
      Factors: [{ Code: 'E', Title: '外向', Role: 'dimension', Extra: 'keep' }],
      FactorGraph: { Roots: ['E'], Edges: [] },
      Scoring: [{ FactorCode: 'E', Sources: [{ Kind: 'question', Code: 'q1', OptionScores: { A: 1 } }], Strategy: 'sum' }],
      UnknownMeasureField: true
    },
    Calibration: { NormRefs: [{ FactorCode: 'E', NormTableVersion: 'v1' }] },
    Conclusions: [
      { Kind: 'risk', FactorCode: 'E', Rules: [{ MinScore: 0, MaxScore: 1, Level: 'low' }] },
      { Kind: 'type', Decision: { Kind: 'pole_composition' }, FutureTypeField: { keep: true } }
    ],
    Outcomes: [{ Code: 'ENFP', Title: '竞选者', Summary: '摘要' }],
    ReportMap: {
      Sections: [
        { Code: 'personality_report', Kind: 'adapter', AdapterKey: 'legacy' },
        { Code: 'risk', Kind: 'risk', SourceRefs: ['E'] },
      ],
    },
    UnknownTopLevel: { keep: true }
  }

  it('projects the editable typology fields', () => {
    const spec = projectPersonalityRuntimeSpec(source)
    expect(spec.factor_graph.factors?.E).toMatchObject({ id: 'E', name: '外向', contributions: [{ question_code: 'q1' }] })
    expect(spec.outcome_mapping.outcomes).toEqual([expect.objectContaining({ code: 'ENFP', name: '竞选者' })])
    expect(spec.decision.kind).toBe('pole_composition')
  })

  it('only replaces form-owned fields and preserves unknown DefinitionV2 data', () => {
    const spec = projectPersonalityRuntimeSpec(source)
    const factorE = spec.factor_graph.factors?.E
    expect(factorE).toBeDefined()
    if (!factorE) {
      throw new Error('expected factor E')
    }
    factorE.name = '外向性'
    const next = applyPersonalityRuntimeSpec(source, spec)
    expect(next.UnknownTopLevel).toEqual({ keep: true })
    expect(next.Calibration).toEqual(source.Calibration)
    expect(next.Measure).toMatchObject({ UnknownMeasureField: true, Factors: [{ Code: 'E', Title: '外向性', Extra: 'keep' }] })
    expect(next.Conclusions).toEqual(expect.arrayContaining([
      expect.objectContaining({ Kind: 'risk', FactorCode: 'E' }),
      expect.objectContaining({ Kind: 'type', FutureTypeField: { keep: true } })
    ]))
    expect(next.ReportMap?.Sections?.[1]).toEqual(source.ReportMap?.Sections?.[1])
  })

  it('generates the cross-repository DefinitionV2 contract fixture', () => {
    const definition = applyPersonalityRuntimeSpec(createEmptyDefinitionV2(), {
      factor_graph: {
        factors: {
          drive: { id: 'drive', code: 'drive', name: '驱动力', kind: 'leaf', option_scoring: 'strict', contributions: [{ question_code: 'q_drive', scoring_mode: 'question_score', sign: 1, weight: 1 }] },
          care: { id: 'care', code: 'care', name: '关怀力', kind: 'leaf', option_scoring: 'strict', contributions: [{ question_code: 'q_care', scoring_mode: 'question_score', sign: -1, weight: 0.5 }] }
        },
        roots: ['drive', 'care'],
      },
      decision: { kind: 'dominant_factor', top_k: 2, poles: [] },
      special_rules: [],
      outcome_mapping: {
        detail_kind: 'personality_type', detail_adapter_key: 'personality_type',
        outcomes: [
          { code: 'drive', name: '驱动型', summary: '擅长推进', traits: ['行动'], strengths: ['推进'], weaknesses: [], suggestions: ['兼顾他人'], is_special: false },
          { code: 'care', name: '关怀型', summary: '擅长共情', traits: ['关怀'], strengths: ['共情'], weaknesses: [], suggestions: ['保持边界'], is_special: false }
        ]
      },
      report: { kind: 'personality_type', adapter_key: 'personality_type' }
    })
    expect(JSON.parse(JSON.stringify(definition))).toEqual(contractDefinition)
  })

  it('roundtrips outcome mapping and TypeProfile fields through the form projection', () => {
    const projected = projectPersonalityRuntimeSpec(contractDefinition)
    expect(projected.outcome_mapping).toMatchObject({
      detail_kind: 'personality_type',
      detail_adapter_key: 'personality_type'
    })
    expect(projected.outcome_mapping.outcomes[0]).toMatchObject({
      code: 'drive', traits: ['行动'], strengths: ['推进'], suggestions: ['兼顾他人']
    })
    expect(projected.decision).toMatchObject({ kind: 'dominant_factor', top_k: 2 })
    expect(JSON.parse(JSON.stringify(applyPersonalityRuntimeSpec(contractDefinition, projected)))).toEqual(contractDefinition)
  })
})
