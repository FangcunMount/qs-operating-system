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
  PERSONALITY_TYPOLOGY_ALGORITHMS
} from '@/constants/personalityScope'

describe('personalityScope', () => {
  it('exposes only the unified personality runtime', () => {
    expect(filterPersonalityAlgorithmOptions([
      { value: 'mbti', label: 'MBTI' },
      { value: 'score_range', label: '分数区间' },
      { value: 'behavior_ability', label: '行为能力' }
    ])).toEqual(DEFAULT_PERSONALITY_ALGORITHM_OPTIONS)
  })

  it('falls back to default options when API returns only non-personality algorithms', () => {
    expect(filterPersonalityAlgorithmOptions([
      { value: 'score_range', label: '分数区间' }
    ])).toEqual(DEFAULT_PERSONALITY_ALGORITHM_OPTIONS)
  })

  it('normalizes legacy algorithm identities to the unified runtime', () => {
    expect(normalizePersonalityAlgorithm('score_range')).toBe('personality_typology')
    expect(normalizePersonalityAlgorithm('sbti')).toBe('personality_typology')
  })

  it('identifies personality typology scope models', () => {
    expect(isPersonalityTypologyScopeModel({ kind: PERSONALITY_KIND, algorithm: 'personality_typology' })).toBe(true)
    expect(isPersonalityTypologyScopeModel({ kind: 'behavioral_rating', algorithm: 'personality_typology' })).toBe(false)
    expect(isPersonalityTypologyScopeModel({ kind: PERSONALITY_KIND, algorithm: 'brief2' })).toBe(false)
  })

  it('returns the finite decision mechanism set independent of named instruments', () => {
    expect(getPersonalityDecisionOptions('mbti').map((item) => item.value)).toEqual([
      'pole_composition', 'nearest_pattern', 'trait_profile', 'dominant_factor'
    ])
  })

  it('normalizes legacy decision kind aliases', () => {
    expect(normalizeLegacyDecisionKind('mbti')).toBe('pole_composition')
    expect(normalizeLegacyDecisionKind('pole_composition')).toBe('pole_composition')
    expect(normalizeDecisionKindForAlgorithm('mbti', 'mbti')).toBe('pole_composition')
    expect(normalizeDecisionKindForAlgorithm('mbti', 'pole_composition')).toBe('pole_composition')
  })

  it('exports fixed personality typology algorithm list', () => {
    expect(PERSONALITY_TYPOLOGY_ALGORITHMS).not.toContain('score_range')
    expect(isPersonalityTypologyAlgorithm('personality_typology')).toBe(true)
    expect(isPersonalityTypologyAlgorithm('bigfive')).toBe(false)
    expect(isPersonalityTypologyAlgorithm('medical_scale')).toBe(false)
  })
})
