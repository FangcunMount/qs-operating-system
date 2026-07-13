import { DefinitionV2 } from './definitionV2'
import {
  applyPersonalityRuntimeSpec,
  projectPersonalityRuntimeSpec
} from './personalityDefinitionV2.mapper'

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
    ReportMap: { Sections: [{ Code: 'personality_report', Kind: 'adapter', AdapterKey: 'legacy' }, { Code: 'risk', Kind: 'risk', SourceRefs: ['E'] }] },
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
    spec.factor_graph.factors!.E.name = '外向性'
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
})
