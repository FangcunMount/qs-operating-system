import {
  normalizePersonalityFormSpec,
  parseDefinitionV2Json,
  validateDefinitionV2Shape
} from './PersonalityDefinitionEditor'
import type { PersonalityTypologyRuntimeSpec } from '@/models/assessmentModel'

describe('PersonalityDefinitionEditor DefinitionV2 JSON helpers', () => {
  it('parses the complete wire object without changing PascalCase fields', () => {
    const source = {
      Measure: { Factors: [{ Code: 'E', Title: '外向' }] },
      Conclusions: [{ Kind: 'type', FutureField: { enabled: true } }],
      ReportMap: { Sections: [{ Kind: 'adapter' }] }
    }
    expect(parseDefinitionV2Json(JSON.stringify(source))).toMatchObject({
      Measure: { Factors: [{ Code: 'E' }] },
      Conclusions: [{ Kind: 'type', FutureField: { enabled: true } }]
    })
  })

  it('rejects invalid JSON and non-object payloads', () => {
    expect(() => parseDefinitionV2Json('{')).toThrow()
    expect(validateDefinitionV2Shape([])).toBe(false)
    expect(() => parseDefinitionV2Json(JSON.stringify([]))).toThrow('JSON 必须是完整的 DefinitionV2 对象')
  })

  it('derives result and report adapters from the decision mechanism in form mode', () => {
    const source: PersonalityTypologyRuntimeSpec = {
      factor_graph: {},
      decision: { kind: 'pole_composition' },
      outcome_mapping: { outcomes: [], detail_kind: 'trait_profile', detail_adapter_key: 'trait_profile' },
      report: { kind: 'trait_profile', adapter_key: 'trait_profile' }
    }
    expect(normalizePersonalityFormSpec(source)).toMatchObject({
      outcome_mapping: { detail_kind: 'personality_type', detail_adapter_key: 'personality_type' },
      report: { kind: 'personality_type', adapter_key: 'personality_type' }
    })
    expect(normalizePersonalityFormSpec({ ...source, decision: { kind: 'trait_profile' } })).toMatchObject({
      outcome_mapping: { detail_kind: 'trait_profile', detail_adapter_key: 'trait_profile' },
      report: { kind: 'trait_profile', adapter_key: 'trait_profile' }
    })
  })
})
