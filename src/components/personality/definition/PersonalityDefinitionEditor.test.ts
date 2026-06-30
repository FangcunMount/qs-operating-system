import {
  parseRuntimeSpecJson,
  validateRuntimeSpecShape
} from './PersonalityDefinitionEditor'
import mbtiRuntimeSpec from '@/models/__fixtures__/personalityRuntimeSpec.mbti.json'

describe('PersonalityDefinitionEditor JSON helpers', () => {
  it('parses valid runtime spec json', () => {
    expect(parseRuntimeSpecJson(JSON.stringify(mbtiRuntimeSpec))).toMatchObject({
      factor_graph: expect.any(Object),
      decision: expect.any(Object),
      outcome_mapping: expect.any(Object),
      report: expect.any(Object)
    })
  })

  it('rejects invalid json and invalid runtime spec shape', () => {
    expect(() => parseRuntimeSpecJson('{')).toThrow()
    expect(validateRuntimeSpecShape({ factor_graph: {} })).toBe(false)
    expect(() => parseRuntimeSpecJson(JSON.stringify({ factor_graph: {} }))).toThrow(
      'JSON 必须包含 factor_graph / decision / outcome_mapping / report'
    )
  })
})
