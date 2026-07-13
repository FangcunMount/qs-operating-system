import {
  AssessmentModelDefinition,
  LEGACY_PERSONALITY_PAYLOAD_FORMAT,
  PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
  PersonalityDimension,
  PersonalityOutcome,
  PersonalityFactorSpec,
  PersonalityPayloadV1,
  PersonalityQuestionContribution,
  PersonalityQuestionMapping,
  PersonalityTypologyRuntimeSpec
} from './assessmentModel'
import { normalizeDecisionKindForAlgorithm, normalizeLegacyDecisionKind, PERSONALITY_KIND, PERSONALITY_SUB_KIND } from '@/constants/personalityScope'

const normalizeOutcomes = (outcomes: unknown): PersonalityOutcome[] => {
  if (!Array.isArray(outcomes)) return []
  return outcomes.map((item) => {
    const raw = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      code: String(raw.code || ''),
      name: String(raw.name || raw.title || ''),
      summary: raw.summary === undefined ? undefined : String(raw.summary),
      description: raw.description === undefined ? undefined : String(raw.description),
      suggestions: Array.isArray(raw.suggestions)
        ? raw.suggestions.filter((suggestion): suggestion is string => typeof suggestion === 'string')
        : undefined,
      rarity_label: raw.rarity_label === undefined ? undefined : String(raw.rarity_label),
      percentile: raw.percentile === undefined ? undefined : String(raw.percentile),
      pattern: raw.pattern === undefined ? undefined : String(raw.pattern),
      traits: Array.isArray(raw.traits)
        ? raw.traits.filter((value): value is string => typeof value === 'string') : undefined,
      strengths: Array.isArray(raw.strengths)
        ? raw.strengths.filter((value): value is string => typeof value === 'string') : undefined,
      weaknesses: Array.isArray(raw.weaknesses)
        ? raw.weaknesses.filter((value): value is string => typeof value === 'string') : undefined,
      image_url: raw.image_url === undefined ? undefined : String(raw.image_url),
      image: raw.image === undefined ? undefined : String(raw.image),
      rarity: raw.rarity && typeof raw.rarity === 'object'
        ? raw.rarity as PersonalityOutcome['rarity'] : undefined,
      is_special: Boolean(raw.is_special),
      trigger: raw.trigger === undefined ? undefined : String(raw.trigger),
      commentary: raw.commentary === undefined ? undefined : String(raw.commentary)
    }
  })
}

const resolveDecisionKind = (kind: string | undefined, algorithm?: string): string => {
  const normalizedKind = normalizeLegacyDecisionKind(kind) || kind || 'pole_composition'
  if (!algorithm) return normalizedKind
  return normalizeDecisionKindForAlgorithm(algorithm, normalizedKind)
}

const normalizeQuestionMappings = (mappings: unknown): PersonalityQuestionMapping[] => {
  if (!Array.isArray(mappings)) return []
  return mappings.map((item) => {
    const raw = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    return {
      question_code: String(raw.question_code || ''),
      factor_code: String(raw.factor_code || raw.dimension || ''),
      sign: raw.sign as PersonalityQuestionMapping['sign'],
      option_scores: raw.option_scores as PersonalityQuestionMapping['option_scores']
    }
  })
}

const normalizeRuntimeSpecFactors = (
  factors: Record<string, PersonalityFactorSpec>
): Record<string, PersonalityFactorSpec> => (
  Object.entries(factors).reduce<Record<string, PersonalityFactorSpec>>((acc, [key, factor]) => {
    const id = factor.id || key
    acc[id] = { ...factor, id }
    return acc
  }, {})
)

export const createEmptyRuntimeSpec = (
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityTypologyRuntimeSpec => ({
  factor_graph: {
    dimension_order: [],
    dimensions: {},
    question_mappings: [],
    factors: {},
    roots: []
  },
  decision: { kind: 'pole_composition' },
  special_rules: [],
  outcome_mapping: { outcomes: [], detail_kind: 'personality_type', detail_adapter_key: 'personality_type' },
  report: { kind: 'personality_type', adapter_key: 'personality_type' },
  questionnaire_binding: questionnaireCode
    ? { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion }
    : undefined
})

export const isLegacyPayload = (payload: unknown): payload is PersonalityPayloadV1 => {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Record<string, unknown>
  return 'dimensions' in candidate && Array.isArray(candidate.dimensions)
}

export const isRuntimeSpecPayload = (payload: unknown): payload is PersonalityTypologyRuntimeSpec => {
  if (!payload || typeof payload !== 'object') return false
  return 'factor_graph' in (payload as Record<string, unknown>)
}

export const mapSimplePayloadToRuntimeSpec = (
  payload: PersonalityPayloadV1
): PersonalityTypologyRuntimeSpec => {
  const dimensions: Record<string, PersonalityDimension> = {}
  const factors: PersonalityTypologyRuntimeSpec['factor_graph']['factors'] = {}

  payload.dimensions.forEach((dim) => {
    dimensions[dim.code] = dim
    factors[dim.code] = {
      id: dim.code,
      code: dim.code,
      name: dim.title,
      kind: 'leaf'
    }
  })

  const scoringRules = payload.scoring_rules || {}
  const decisionKind = typeof scoringRules.decision_kind === 'string'
    ? scoringRules.decision_kind
    : 'pole_composition'

  return {
    factor_graph: {
      dimension_order: payload.dimensions.map((d) => d.code),
      dimensions,
      factors,
      roots: payload.dimensions.map((d) => d.code),
      question_mappings: normalizeQuestionMappings(scoringRules.question_mappings)
    },
    decision: {
      kind: normalizeLegacyDecisionKind(decisionKind) || decisionKind,
      ...(typeof scoringRules.decision === 'object' ? scoringRules.decision as Record<string, unknown> : {})
    },
    special_rules: Array.isArray(scoringRules.special_rules) ? scoringRules.special_rules : [],
    outcome_mapping: {
      outcomes: normalizeOutcomes(payload.outcomes),
      detail_kind: decisionKind === 'trait_profile' ? 'trait_profile' : 'personality_type',
      detail_adapter_key: decisionKind === 'trait_profile' ? 'trait_profile' : 'personality_type',
      mapping_rules: typeof scoringRules.outcome_mapping === 'object'
        ? scoringRules.outcome_mapping as Record<string, unknown>
        : undefined
    },
    report: typeof scoringRules.report === 'object' && scoringRules.report
      ? scoringRules.report as PersonalityTypologyRuntimeSpec['report']
      : { kind: decisionKind === 'trait_profile' ? 'trait_profile' : 'personality_type' },
    questionnaire_binding: payload.questionnaire_binding
  }
}

export const syncContributionsToQuestionMappings = (
  spec: PersonalityTypologyRuntimeSpec
): PersonalityTypologyRuntimeSpec => {
  const existingMappings = spec.factor_graph?.question_mappings || []
  if (existingMappings.length > 0) return spec

  const factors = spec.factor_graph?.factors || {}
  const mappings: PersonalityQuestionMapping[] = []

  Object.values(factors).forEach((factor) => {
    const factorCode = factor.code || factor.id
    ;(factor.contributions || []).forEach((contrib) => {
      if (!contrib.question_code) return
      mappings.push({
        question_code: contrib.question_code,
        factor_code: factorCode,
        sign: contrib.sign,
        option_scores: contrib.option_scores
      })
    })
  })

  if (mappings.length === 0) return spec

  return {
    ...spec,
    factor_graph: {
      ...spec.factor_graph,
      question_mappings: mappings
    }
  }
}

export const syncQuestionMappingsToContributions = (
  runtimeSpec: PersonalityTypologyRuntimeSpec
): PersonalityTypologyRuntimeSpec => {
  const rawFactors = runtimeSpec.factor_graph?.factors || {}
  const nextFactors: Record<string, PersonalityFactorSpec> = {}

  Object.entries(rawFactors).forEach(([key, factor]) => {
    const id = factor.id || key
    nextFactors[id] = {
      ...factor,
      id,
      children: factor.children || [],
      contributions: factor.contributions || []
    }
  })

  ;(runtimeSpec.factor_graph?.question_mappings || []).forEach((mapping) => {
    if (!mapping.question_code || !mapping.factor_code) return
    const matchedKey = Object.keys(nextFactors).find((key) => {
      const factor = nextFactors[key]
      return key === mapping.factor_code || factor.id === mapping.factor_code || factor.code === mapping.factor_code
    })
    if (!matchedKey) return

    const contribution: PersonalityQuestionContribution = {
      question_code: mapping.question_code,
      sign: mapping.sign,
      option_scores: mapping.option_scores
    }
    const factor = nextFactors[matchedKey]
    const existing = factor.contributions || []
    const nextContributions = existing.filter((item) => item.question_code !== mapping.question_code)
    nextFactors[matchedKey] = {
      ...factor,
      contributions: [...nextContributions, contribution]
    }
  })

  return {
    ...runtimeSpec,
    decision: {
      ...runtimeSpec.decision,
      kind: resolveDecisionKind(runtimeSpec.decision?.kind),
    },
    factor_graph: {
      ...runtimeSpec.factor_graph,
      factors: nextFactors,
      roots: (runtimeSpec.factor_graph?.roots || []).map((root) => {
        const matched = nextFactors[root]
        if (matched) return matched.id
        const found = Object.values(nextFactors).find((factor) => factor.code === root)
        return found?.id || root
      })
    }
  }
}

export const normalizeRuntimeSpecForEdit = (
  raw: unknown,
  questionnaireCode = '',
  questionnaireVersion?: string,
  algorithm?: string
): PersonalityTypologyRuntimeSpec => {
  let spec: PersonalityTypologyRuntimeSpec

  if (isRuntimeSpecPayload(raw)) {
    const rawOutcomeMapping = (
      raw.outcome_mapping && typeof raw.outcome_mapping === 'object'
        ? raw.outcome_mapping
        : {}
    ) as Record<string, unknown>
    const emptySpec = createEmptyRuntimeSpec(questionnaireCode, questionnaireVersion)
    spec = {
      ...emptySpec,
      ...raw,
      factor_graph: {
        ...emptySpec.factor_graph,
        ...raw.factor_graph,
        factors: normalizeRuntimeSpecFactors(raw.factor_graph?.factors || {}),
        question_mappings: normalizeQuestionMappings(raw.factor_graph?.question_mappings)
      },
      outcome_mapping: {
        ...rawOutcomeMapping,
        outcomes: normalizeOutcomes(
          raw.outcome_mapping?.outcomes
          ?? (raw as unknown as Record<string, unknown>).outcomes
        )
      }
    }
  } else if (isLegacyPayload(raw)) {
    spec = mapSimplePayloadToRuntimeSpec(raw)
  } else {
    spec = createEmptyRuntimeSpec(questionnaireCode, questionnaireVersion)
  }

  return syncContributionsToQuestionMappings({
    ...spec,
    decision: {
      ...spec.decision,
      kind: resolveDecisionKind(spec.decision?.kind, algorithm)
    }
  })
}

export const normalizeRuntimeSpecForSave = (
  runtimeSpec: PersonalityTypologyRuntimeSpec,
  algorithm?: string
): PersonalityTypologyRuntimeSpec => {
  const synced = syncQuestionMappingsToContributions(runtimeSpec)
  if (!algorithm) return synced
  return {
    ...synced,
    decision: {
      ...synced.decision,
      kind: resolveDecisionKind(synced.decision?.kind, algorithm)
    },
    outcome_mapping: {
      ...synced.outcome_mapping,
      outcomes: normalizeOutcomes(synced.outcome_mapping?.outcomes)
    }
  }
}

export const buildDefinitionForSave = (
  _definition: AssessmentModelDefinition,
  runtimeSpec: PersonalityTypologyRuntimeSpec,
  _subKind: string,
  algorithm: string
): AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> => ({
  kind: PERSONALITY_KIND,
  sub_kind: PERSONALITY_SUB_KIND,
  algorithm,
  payload_format: PERSONALITY_TYPOLOGY_PAYLOAD_FORMAT,
  payload: normalizeRuntimeSpecForSave(runtimeSpec, algorithm)
})

const createEmptyLegacyPayload = (
  questionnaireCode = '',
  questionnaireVersion?: string
): PersonalityPayloadV1 => ({
  dimensions: [],
  outcomes: [],
  questionnaire_binding: { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion },
  scoring_rules: {}
})

export const normalizeAssessmentModelDefinitionPayload = (
  raw: Record<string, unknown>,
  payloadFormat: string,
  questionnaireCode: string,
  questionnaireVersion?: string,
  algorithm?: string
): PersonalityTypologyRuntimeSpec => {
  if (payloadFormat === LEGACY_PERSONALITY_PAYLOAD_FORMAT || isLegacyPayload(raw?.payload)) {
    return normalizeRuntimeSpecForEdit({
      ...createEmptyLegacyPayload(questionnaireCode, questionnaireVersion),
      ...(raw?.payload as PersonalityPayloadV1)
    }, questionnaireCode, questionnaireVersion, algorithm)
  }
  return normalizeRuntimeSpecForEdit(raw?.payload, questionnaireCode, questionnaireVersion, algorithm)
}
