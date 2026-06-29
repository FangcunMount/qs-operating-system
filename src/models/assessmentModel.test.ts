import {
  createEmptyPersonalityPayload,
  createEmptyRuntimeSpec,
  PersonalityTypologyRuntimeSpec,
  validatePersonalityPayload,
  validateRuntimeSpec
} from './assessmentModel'
import {
  mapRuntimeSpecToFormState,
  mapSimplePayloadToRuntimeSpec,
  normalizeAssessmentModelDefinition,
  normalizeAssessmentModelSummary,
  normalizeValidationResult
} from './assessmentModel.mapper'

describe('personality payload validation', () => {
  it('requires dimensions and outcomes', () => {
    const issues = validatePersonalityPayload(createEmptyPersonalityPayload(), '{}')
    expect(issues.map((issue) => issue.field)).toEqual(['dimensions', 'outcomes'])
  })

  it('rejects duplicate codes and invalid scoring JSON', () => {
    const payload = {
      ...createEmptyPersonalityPayload('q1'),
      dimensions: [
        { code: 'd1', title: '外向' },
        { code: 'd1', title: '内向' }
      ],
      outcomes: [
        { code: 'o1', title: 'A 型' },
        { code: 'o1', title: 'B 型' }
      ]
    }
    const issues = validatePersonalityPayload(payload, '{')
    expect(issues.map((issue) => issue.field)).toEqual([
      'dimensions.code', 'outcomes.code', 'scoring_rules'
    ])
  })
})

describe('assessment model mappers', () => {
  it('normalizes summary with desc alias', () => {
    const summary = normalizeAssessmentModelSummary({
      code: 'm1', title: '人格', desc: '说明', status: 'draft', tags: ['a']
    })
    expect(summary).toMatchObject({ code: 'm1', description: '说明', tags: ['a'] })
  })

  it('normalizes validation result from legacy valid/errors', () => {
    expect(normalizeValidationResult({ valid: false, errors: ['缺少维度'] })).toEqual({
      passed: false,
      issues: [{ field: 'unknown', message: '缺少维度' }]
    })
  })

  it('normalizes validation result from passed/issues', () => {
    expect(normalizeValidationResult({ passed: true, issues: [] })).toEqual({
      passed: true, issues: []
    })
  })

  it('maps simple payload to runtime spec', () => {
    const payload = {
      ...createEmptyPersonalityPayload('q1'),
      dimensions: [{ code: 'E', title: '外向' }],
      outcomes: [{ code: 'ENFP', title: '竞选者' }]
    }
    const spec = mapSimplePayloadToRuntimeSpec(payload)
    expect(spec.factor_graph.factors?.E).toMatchObject({ code: 'E', kind: 'leaf' })
    expect(spec.outcome_mapping.outcomes).toHaveLength(1)
  })

  it('maps runtime spec back to form state', () => {
    const spec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        dimension_order: ['E'],
        dimensions: { E: { code: 'E', title: '外向' } },
        factors: { E: { code: 'E', name: '外向', kind: 'leaf' as const } },
        question_mappings: [],
        roots: ['E']
      },
      outcome_mapping: { outcomes: [{ code: 'ENFP', title: '竞选者' }] }
    }
    const { payload } = mapRuntimeSpecToFormState(spec)
    expect(payload.dimensions).toHaveLength(1)
    expect(payload.outcomes).toHaveLength(1)
  })

  it('normalizes legacy definition payload format', () => {
    const def = normalizeAssessmentModelDefinition({
      kind: 'personality',
      sub_kind: 'typology',
      algorithm: 'mbti',
      payload_format: 'personality_payload_v1',
      payload: {
        dimensions: [{ code: 'E', title: '外向' }],
        outcomes: [{ code: 'ENFP', title: '竞选者' }],
        questionnaire_binding: { questionnaire_code: 'q1' },
        scoring_rules: {}
      }
    })
    expect(def.payload_format).toBe('assessmentmodel.personality.typology.v1')
    expect((def.payload as PersonalityTypologyRuntimeSpec).factor_graph.factors?.E).toBeDefined()
  })
})

describe('runtime spec validation', () => {
  it('requires factors, outcomes, decision and report', () => {
    const issues = validateRuntimeSpec(createEmptyRuntimeSpec())
    expect(issues.length).toBeGreaterThan(0)
  })
})
