import { cloneDefinitionV2, createEmptyDefinitionV2 } from './definitionV2'
import type {
  DefinitionBrief2Execution,
  DefinitionCalibration,
  DefinitionConclusion,
  DefinitionExecution,
  DefinitionMeasure,
  DefinitionNormRef,
  DefinitionOutcome,
  DefinitionReportMap,
  DefinitionSPMExecution,
  DefinitionV2,
  DefinitionV2Record
} from './definitionV2'

export type BehaviorAbilityDefinitionAlgorithm = 'brief2' | 'spm_sensory' | 'spm'
export type BehaviorAbilityConclusionKind = 'norm' | 'ability'

export interface BehaviorAbilityDefinitionForm {
  measure: DefinitionMeasure
  calibration: DefinitionCalibration
  execution: DefinitionExecution
  conclusions: DefinitionConclusion[]
  outcomes: DefinitionOutcome[]
  reportMap: DefinitionReportMap
}

const asRecord = (value: unknown): DefinitionV2Record =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as DefinitionV2Record) : {}

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const conclusionKindFor = (algorithm: BehaviorAbilityDefinitionAlgorithm): BehaviorAbilityConclusionKind =>
  algorithm === 'spm' ? 'ability' : 'norm'

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const defaultBrief2 = (): DefinitionBrief2Execution => ({
  FormVariant: '',
  PrimaryFactorCode: '',
  IndexFactorCodes: [],
  ValidityFactorCodes: []
})

const defaultSPM = (): DefinitionSPMExecution => ({
  TimeLimitSeconds: 900,
  TotalFactorCode: '',
  ItemSets: []
})

const relevantExecution = (execution: DefinitionExecution, algorithm: BehaviorAbilityDefinitionAlgorithm): DefinitionExecution => {
  if (algorithm === 'brief2') {
    const next = { ...execution, Brief2: cloneValue(execution.Brief2 || defaultBrief2()) }
    delete next.SPM
    return next
  }
  if (algorithm === 'spm') {
    const next = { ...execution, SPM: cloneValue(execution.SPM || defaultSPM()) }
    delete next.Brief2
    return next
  }
  const sensoryExecution = cloneValue(execution)
  delete sensoryExecution.SPM
  delete sensoryExecution.Brief2
  return sensoryExecution
}

/** The form projection deliberately exposes only behavior-ability fields. The
 * complete DefinitionV2 remains the object that is eventually PUT. */
export const projectBehaviorAbilityDefinition = (
  source: DefinitionV2,
  algorithm: BehaviorAbilityDefinitionAlgorithm
): BehaviorAbilityDefinitionForm => {
  const definition = source || createEmptyDefinitionV2()
  const calibration = asRecord(definition.Calibration) as DefinitionCalibration
  const kind = conclusionKindFor(algorithm)
  return {
    measure: cloneValue((asRecord(definition.Measure) as DefinitionMeasure) || {}),
    calibration: {
      ...cloneValue(calibration),
      NormRefs: cloneValue(asArray<DefinitionNormRef>(calibration.NormRefs))
    },
    execution: relevantExecution(asRecord(definition.Execution) as DefinitionExecution, algorithm),
    conclusions: cloneValue(asArray<DefinitionConclusion>(definition.Conclusions).filter((item) => item?.Kind === kind)),
    outcomes: cloneValue(asArray<DefinitionOutcome>(definition.Outcomes)),
    reportMap: cloneValue(definition.ReportMap || { Sections: [] })
  }
}

const conclusionIdentity = (item: DefinitionConclusion): string => String(item?.FactorCode || '')

const mergeConclusions = (
  source: DefinitionConclusion[],
  next: DefinitionConclusion[],
  kind: BehaviorAbilityConclusionKind
): DefinitionConclusion[] => {
  const existingByFactor = new Map(source.filter((item) => item?.Kind === kind).map((item) => [conclusionIdentity(item), item]))
  const retained = source.filter((item) => item?.Kind !== kind)
  const merged = next.map((item) => ({
    ...(existingByFactor.get(conclusionIdentity(item)) || {}),
    ...item,
    Kind: kind
  }))

  // A conclusion is removed only when the owning form explicitly removes its
  // factor row. Other conclusion kinds never pass through this editor.
  return [...retained, ...merged]
}

/** Applies only the behavior-ability form-owned fields to a full source
 * document, retaining unknown top-level data and all unrelated conclusions. */
export const applyBehaviorAbilityDefinition = (
  source: DefinitionV2,
  algorithm: BehaviorAbilityDefinitionAlgorithm,
  form: BehaviorAbilityDefinitionForm
): DefinitionV2 => {
  const definition = cloneDefinitionV2(source || createEmptyDefinitionV2())
  const execution = asRecord(definition.Execution) as DefinitionExecution
  definition.Measure = cloneValue(form.measure)
  definition.Calibration = {
    ...asRecord(definition.Calibration),
    ...cloneValue(form.calibration),
    NormRefs: cloneValue(asArray<DefinitionNormRef>(form.calibration.NormRefs))
  }
  definition.Execution = { ...execution, ...form.execution }
  if (algorithm === 'brief2') {
    definition.Execution.Brief2 = cloneValue(form.execution.Brief2 || defaultBrief2())
    delete definition.Execution.SPM
  } else if (algorithm === 'spm') {
    definition.Execution.SPM = cloneValue(form.execution.SPM || defaultSPM())
    delete definition.Execution.Brief2
  } else {
    delete definition.Execution.SPM
    delete definition.Execution.Brief2
  }
  definition.Conclusions = mergeConclusions(
    asArray<DefinitionConclusion>(definition.Conclusions),
    asArray<DefinitionConclusion>(form.conclusions),
    conclusionKindFor(algorithm)
  )
  definition.Outcomes = cloneValue(asArray<DefinitionOutcome>(form.outcomes))
  definition.ReportMap = cloneValue(form.reportMap)
  return definition
}

export const isNormReferenceMissing = (form: BehaviorAbilityDefinitionForm): boolean =>
  !asArray<DefinitionNormRef>(form.calibration.NormRefs).some((item) => item.FactorCode && item.NormTableVersion)
