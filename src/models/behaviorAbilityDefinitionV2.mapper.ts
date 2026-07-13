import type { AssessmentModelValidationIssue } from './assessmentModel'
import { cloneDefinitionV2, createEmptyDefinitionV2 } from './definitionV2'
import type {
  DefinitionBrief2Execution,
  DefinitionCalibration,
  DefinitionConclusion,
  DefinitionExecution,
  DefinitionMeasure,
  DefinitionNormRef,
  DefinitionSPMExecution,
  DefinitionV2,
  DefinitionV2Record
} from './definitionV2'

export type BehaviorAbilityDefinitionAlgorithm = 'brief2' | 'spm'
export type BehaviorAbilityConclusionKind = 'norm' | 'ability'

export interface BehaviorAbilityDefinitionForm {
  measure: DefinitionMeasure
  calibration: DefinitionCalibration
  execution: DefinitionExecution
  conclusions: DefinitionConclusion[]
}

export interface QuestionOptionReference {
  code?: string
  content?: string
}

export interface QuestionReference {
  code?: string
  options?: QuestionOptionReference[]
}

const asRecord = (value: unknown): DefinitionV2Record =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as DefinitionV2Record) : {}

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const conclusionKindFor = (algorithm: BehaviorAbilityDefinitionAlgorithm): BehaviorAbilityConclusionKind =>
  algorithm === 'brief2' ? 'norm' : 'ability'

const cloneValue = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const defaultBrief2 = (): DefinitionBrief2Execution => ({
  FormVariant: '',
  PrimaryFactorCode: '',
  IndexFactorCodes: [],
  ValidityFactorCodes: []
})

const defaultSPM = (): DefinitionSPMExecution => ({
  TimeLimitSeconds: 0,
  TotalFactorCode: '',
  ItemSets: []
})

const relevantExecution = (execution: DefinitionExecution, algorithm: BehaviorAbilityDefinitionAlgorithm): DefinitionExecution => {
  if (algorithm === 'brief2') {
    return { ...execution, Brief2: cloneValue(execution.Brief2 || defaultBrief2()) }
  }
  return { ...execution, SPM: cloneValue(execution.SPM || defaultSPM()) }
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
    conclusions: cloneValue(asArray<DefinitionConclusion>(definition.Conclusions).filter((item) => item?.Kind === kind))
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
  definition.Execution =
    algorithm === 'brief2'
      ? { ...execution, ...form.execution, Brief2: cloneValue(form.execution.Brief2 || defaultBrief2()) }
      : { ...execution, ...form.execution, SPM: cloneValue(form.execution.SPM || defaultSPM()) }
  definition.Conclusions = mergeConclusions(
    asArray<DefinitionConclusion>(definition.Conclusions),
    asArray<DefinitionConclusion>(form.conclusions),
    conclusionKindFor(algorithm)
  )
  return definition
}

export const validateSPMDefinitionForm = (form: BehaviorAbilityDefinitionForm, questions: QuestionReference[]): AssessmentModelValidationIssue[] => {
  const spm = form.execution.SPM
  const issues: AssessmentModelValidationIssue[] = []
  if (!spm || spm.TimeLimitSeconds <= 0) {
    issues.push({ field: 'Execution.SPM.TimeLimitSeconds', code: 'spm.time_limit.required', message: 'SPM 时限必须大于 0' })
  }
  if (!spm?.TotalFactorCode) {
    issues.push({ field: 'Execution.SPM.TotalFactorCode', code: 'spm.total_factor.required', message: '请选择总分因子' })
  }
  if (!spm?.ItemSets?.length) {
    issues.push({ field: 'Execution.SPM.ItemSets', code: 'spm.item_sets.required', message: '至少需要一个题组' })
    return issues
  }
  const questionMap = new Map(questions.filter((item) => item.code).map((item) => [String(item.code), item]))
  const seenQuestions = new Set<string>()
  spm.ItemSets.forEach((set, setIndex) => {
    const field = `Execution.SPM.ItemSets[${setIndex}]`
    if (!set.Code || !set.Items?.length) {
      issues.push({ field, code: 'spm.item_set.invalid', message: '题组编码和题目不能为空' })
    }
    const items = set.Items || []
    items.forEach((item, itemIndex) => {
      const itemField = `${field}.Items[${itemIndex}]`
      if (!item.QuestionCode || !item.CorrectOptionCode) {
        issues.push({ field: itemField, code: 'spm.item.invalid', message: '请选择题目和正确选项' })
        return
      }
      if (seenQuestions.has(item.QuestionCode)) {
        issues.push({ field: itemField, code: 'spm.question.duplicate', message: `题目 ${item.QuestionCode} 不能重复配置` })
      }
      seenQuestions.add(item.QuestionCode)
      const question = questionMap.get(item.QuestionCode)
      if (!question) {
        issues.push({ field: itemField, code: 'spm.question.not_found', message: `绑定问卷不存在题目 ${item.QuestionCode}` })
        return
      }
      if (!(question.options || []).some((option) => option.code === item.CorrectOptionCode)) {
        issues.push({ field: itemField, code: 'spm.option.not_found', message: '正确选项必须属于所选题目' })
      }
    })
  })
  return issues
}

export const isNormReferenceMissing = (form: BehaviorAbilityDefinitionForm): boolean =>
  !asArray<DefinitionNormRef>(form.calibration.NormRefs).some((item) => item.FactorCode && item.NormTableVersion)
