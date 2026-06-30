import {
  DEFAULT_PERSONALITY_ALGORITHM_OPTIONS,
  filterPersonalityAlgorithmOptions,
  getPersonalityDecisionOptions,
  isPersonalityTypologyAlgorithm,
  isPersonalityTypologyScopeModel,
  normalizeDecisionKindForAlgorithm,
  normalizeLegacyDecisionKind,
  normalizePersonalityAlgorithm,
  PERSONALITY_KIND,
  PERSONALITY_SUB_KIND,
  PERSONALITY_TYPOLOGY_ALGORITHMS
} from '@/constants/personalityScope'

describe('personalityScope', () => {
  it('filters non-personality algorithms from options', () => {
    expect(filterPersonalityAlgorithmOptions([
      { value: 'mbti', label: 'MBTI' },
      { value: 'score_range', label: '分数区间' },
      { value: 'behavior_ability', label: '行为能力' }
    ])).toEqual([{ value: 'mbti', label: 'MBTI' }])
  })

  it('falls back to default options when API returns only non-personality algorithms', () => {
    expect(filterPersonalityAlgorithmOptions([
      { value: 'score_range', label: '分数区间' }
    ])).toEqual(DEFAULT_PERSONALITY_ALGORITHM_OPTIONS)
  })

  it('preserves score=0 style edge via normalizePersonalityAlgorithm fallback', () => {
    expect(normalizePersonalityAlgorithm('score_range')).toBe('mbti')
    expect(normalizePersonalityAlgorithm('sbti')).toBe('sbti')
  })

  it('identifies personality typology scope models', () => {
    expect(isPersonalityTypologyScopeModel({ kind: PERSONALITY_KIND, sub_kind: PERSONALITY_SUB_KIND })).toBe(true)
    expect(isPersonalityTypologyScopeModel({ kind: 'behavior_ability', sub_kind: 'typology' })).toBe(false)
    expect(isPersonalityTypologyScopeModel({ kind: PERSONALITY_KIND, sub_kind: 'dimension_score' })).toBe(false)
  })

  it('returns decision options aligned with backend algorithm kind', () => {
    expect(getPersonalityDecisionOptions('mbti')).toEqual([{ value: 'mbti', label: 'MBTI 极性组合' }])
    expect(getPersonalityDecisionOptions('score_range')).toEqual(
      getPersonalityDecisionOptions('mbti')
    )
  })

  it('normalizes legacy decision kind aliases', () => {
    expect(normalizeLegacyDecisionKind('pole_composition')).toBe('mbti')
    expect(normalizeDecisionKindForAlgorithm('mbti', 'pole_composition')).toBe('mbti')
  })

  it('exports fixed personality typology algorithm list', () => {
    expect(PERSONALITY_TYPOLOGY_ALGORITHMS).not.toContain('score_range')
    expect(isPersonalityTypologyAlgorithm('bigfive')).toBe(true)
    expect(isPersonalityTypologyAlgorithm('medical_scale')).toBe(false)
  })
})
