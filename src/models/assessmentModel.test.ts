import {
  createEmptyPersonalityPayload,
  createEmptyRuntimeSpec,
  PersonalityTypologyRuntimeSpec,
  validateFactorGraph,
  validatePersonalityPayload,
  validateQuestionMappings,
  validateRuntimeSpec
} from './assessmentModel'
import type { IQuestion } from './question'
import {
  buildDefinitionForSave,
  mapRuntimeSpecToFormState,
  mapSimplePayloadToRuntimeSpec,
  normalizeAssessmentModelDefinition,
  normalizeAssessmentModelSummary,
  normalizeValidationResult
} from './assessmentModel.mapper'
import mbtiRuntimeSpec from './__fixtures__/personalityRuntimeSpec.mbti.json'
import sbtiRuntimeSpec from './__fixtures__/personalityRuntimeSpec.sbti.json'

const mbtiQuestions = [{
  code: 'q_energy',
  title: '精力来源',
  tips: '',
  type: 'Radio',
  validate_rules: {},
  options: [
    { code: 'A', content: '与人互动', is_other: false },
    { code: 'B', content: '独处恢复', is_other: false }
  ]
}, {
  code: 'q_social',
  title: '社交偏好',
  tips: '',
  type: 'Radio',
  validate_rules: {},
  options: [
    { code: 'A', content: '主动表达', is_other: false },
    { code: 'B', content: '谨慎观察', is_other: false }
  ]
}] as IQuestion[]

const sbtiQuestions = [{
  code: 'q_empathy',
  title: '共情选择',
  tips: '',
  type: 'Radio',
  validate_rules: {},
  options: [
    { code: 'yes', content: '是', is_other: false },
    { code: 'no', content: '否', is_other: false }
  ]
}, {
  code: 'q_logic',
  title: '逻辑选择',
  tips: '',
  type: 'Radio',
  validate_rules: {},
  options: [
    { code: 'yes', content: '是', is_other: false },
    { code: 'no', content: '否', is_other: false }
  ]
}] as IQuestion[]

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
        { code: 'o1', name: 'A 型' },
        { code: 'o1', name: 'B 型' }
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
      outcomes: [{ code: 'ENFP', name: '竞选者' }]
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
        factors: { E: { id: 'E', code: 'E', name: '外向', kind: 'leaf' as const } },
        question_mappings: [],
        roots: ['E']
      },
      outcome_mapping: { outcomes: [{ code: 'ENFP', name: '竞选者' }] }
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
        outcomes: [{ code: 'ENFP', name: '竞选者' }],
        questionnaire_binding: { questionnaire_code: 'q1' },
        scoring_rules: {}
      }
    })
    expect(def.payload_format).toBe('assessmentmodel.personality.typology.v1')
    expect((def.payload as PersonalityTypologyRuntimeSpec).factor_graph.factors?.E).toBeDefined()
  })

  it('projects flat question mappings into factor contributions before save', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1', 'v1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1', 'v1').factor_graph,
        factors: {
          E: { id: 'E', code: 'E', name: '外向', kind: 'leaf' }
        },
        roots: ['E'],
        question_mappings: [
          { question_code: 'q_e_1', factor_code: 'E', sign: 1, option_scores: { yes: 1 } }
        ]
      },
      outcome_mapping: { outcomes: [{ code: 'ENFP', name: '竞选者' }] }
    }

    const def = buildDefinitionForSave(createEmptyRuntimeSpecDefinition(), spec, 'typology', 'mbti')
    const savedSpec = def.payload as PersonalityTypologyRuntimeSpec

    expect(savedSpec.factor_graph.factors?.E.contributions).toEqual([
      { question_code: 'q_e_1', sign: 1, option_scores: { yes: 1 } }
    ])
  })

  it('normalizes and saves frontend runtime spec fixtures', () => {
    const mbtiDef = normalizeAssessmentModelDefinition({
      kind: 'personality',
      sub_kind: 'typology',
      algorithm: 'mbti',
      payload_format: 'assessmentmodel.personality.typology.v1',
      payload: mbtiRuntimeSpec
    })
    const sbtiDef = buildDefinitionForSave(
      createEmptyRuntimeSpecDefinition(),
      sbtiRuntimeSpec as PersonalityTypologyRuntimeSpec,
      'typology',
      'sbti'
    )

    expect((mbtiDef.payload as PersonalityTypologyRuntimeSpec).factor_graph.factors?.factor_e.id).toBe('factor_e')
    expect((sbtiDef.payload as PersonalityTypologyRuntimeSpec).factor_graph.factors?.factor_empathy.contributions).toEqual([
      { question_code: 'q_empathy', sign: 1, option_scores: { yes: 1, no: 0 } }
    ])
  })
})

describe('runtime spec validation', () => {
  it('requires factors, outcomes, decision and report', () => {
    const issues = validateRuntimeSpec(createEmptyRuntimeSpec())
    expect(issues.length).toBeGreaterThan(0)
  })

  it('requires at least one complete question mapping', () => {
    const spec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: { E: { id: 'E', code: 'E', name: '外向', kind: 'leaf' as const } },
        roots: ['E'],
        question_mappings: []
      },
      outcome_mapping: { outcomes: [{ code: 'ENFP', name: '竞选者' }] }
    }

    expect(validateRuntimeSpec(spec).map((issue) => issue.field)).toContain('question_mapping')
  })

  it('validates factor graph references, cycles and weighted_avg weights', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: {
          leaf: { id: 'leaf', code: 'L', name: '叶子', kind: 'leaf', contributions: [{ question_code: 'q1' }] },
          child: { id: 'child', code: 'C', name: '子因子', kind: 'leaf', contributions: [{ question_code: 'q2' }] },
          composite: {
            id: 'composite',
            code: 'P',
            name: '父因子',
            kind: 'composite',
            aggregation: 'weighted_avg',
            children: ['child', 'missing'],
            weights: { child: 0.4 }
          },
          cycleA: { id: 'cycleA', kind: 'composite', children: ['cycleB'] },
          cycleB: { id: 'cycleB', kind: 'composite', children: ['cycleA'] }
        },
        roots: ['composite'],
        question_mappings: []
      },
      outcome_mapping: { outcomes: [{ code: 'O1', name: '结果' }] }
    }

    const issues = validateFactorGraph(spec)
    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
      'factor_graph.composite.children',
      'factor_graph.composite.weights',
      'factor_graph.cycle'
    ]))
  })

  it('emits a warning when weighted_avg weights do not sum to one', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: {
          a: { id: 'a', kind: 'leaf', contributions: [{ question_code: 'q1' }] },
          b: { id: 'b', kind: 'leaf', contributions: [{ question_code: 'q2' }] },
          parent: {
            id: 'parent',
            kind: 'composite',
            aggregation: 'weighted_avg',
            children: ['a', 'b'],
            weights: { a: 2, b: 1 }
          }
        },
        roots: ['parent'],
        question_mappings: []
      },
      outcome_mapping: { outcomes: [{ code: 'O1', name: '结果' }] }
    }

    expect(validateFactorGraph(spec)).toContainEqual(expect.objectContaining({
      field: 'factor_graph.parent.weights',
      level: 'warning'
    }))
  })

  it('validates question mapping questions, options and finite scores', () => {
    const questions = [{
      code: 'q1',
      title: '题目 1',
      tips: '',
      type: 'Radio',
      validate_rules: {},
      options: [
        { code: 'A', content: 'A', is_other: false },
        { code: 'B', content: 'B', is_other: false }
      ]
    }] as IQuestion[]
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: { f1: { id: 'f1', kind: 'leaf' } },
        roots: ['f1'],
        question_mappings: [
          { question_code: 'q1', factor_code: 'f1', option_scores: { A: 1, C: 0 } },
          { question_code: 'missing', factor_code: 'f1', option_scores: { A: Number.NaN } }
        ]
      },
      outcome_mapping: { outcomes: [{ code: 'O1', name: '结果' }] }
    }

    const issues = validateQuestionMappings(spec, questions)
    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
      'question_mapping.0.option_scores',
      'question_mapping.1.question_code',
      'question_mapping.1.option_scores'
    ]))
  })

  it('validates decision-specific configuration without coupling it to an algorithm name', () => {
    const spec: PersonalityTypologyRuntimeSpec = {
      ...createEmptyRuntimeSpec('q1'),
      factor_graph: {
        ...createEmptyRuntimeSpec('q1').factor_graph,
        factors: { f1: { id: 'f1', kind: 'leaf', contributions: [{ question_code: 'q1' }] } },
        roots: ['f1'],
        question_mappings: [{ question_code: 'q1', factor_code: 'f1', option_scores: { A: 1 } }]
      },
      decision: { kind: 'nearest_pattern', fallback_code: 'missing' },
      outcome_mapping: { outcomes: [{ code: 'O1', name: '结果' }], detail_kind: 'personality_type' },
      report: { kind: 'personality_type' }
    }

    expect(validateRuntimeSpec(spec, { algorithm: 'mbti' }).map((issue) => issue.field)).toEqual(expect.arrayContaining([
      'decision.fallback_code',
      'outcome_mapping.pattern'
    ]))
  })

  it('accepts checked-in mbti and sbti runtime spec fixtures', () => {
    expect(validateRuntimeSpec(mbtiRuntimeSpec as PersonalityTypologyRuntimeSpec, {
      questions: mbtiQuestions,
      algorithm: 'mbti'
    }).filter((issue) => issue.level !== 'warning')).toEqual([])
    expect(validateRuntimeSpec(sbtiRuntimeSpec as PersonalityTypologyRuntimeSpec, {
      questions: sbtiQuestions,
      algorithm: 'sbti'
    }).filter((issue) => issue.level !== 'warning')).toEqual([])
  })
})

const createEmptyRuntimeSpecDefinition = () => ({
  kind: 'personality' as const,
  sub_kind: 'typology',
  algorithm: 'mbti',
  payload_format: 'assessmentmodel.personality.typology.v1',
  payload: createEmptyRuntimeSpec()
})
