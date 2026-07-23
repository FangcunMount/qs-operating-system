import { action, computed, makeObservable, observable, runInAction } from 'mobx'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { mapRuntimeSpecToFormState } from '@/models/assessmentModel.mapper'
import {
  AssessmentModelValidationIssue,
  PersonalityPayloadV1,
  PersonalityTypologyRuntimeSpec,
  validateRuntimeSpec
} from '@/models/assessmentModel'
import { cloneDefinitionV2, createEmptyDefinitionV2, DefinitionV2, isDefinitionV2 } from '@/models/definitionV2'
import {
  applyPersonalityRuntimeSpec,
  projectPersonalityRuntimeSpec
} from '@/models/personalityDefinitionV2.mapper'
import type { IQuestion } from '@/models/question'

const hasBlockingIssues = (issues: AssessmentModelValidationIssue[]) =>
  issues.some((issue) => issue.level !== 'warning')

/**
 * Keeps the raw DefinitionV2 object as the save source. runtimeSpec is only a
 * form projection, so form edits cannot discard server fields it does not own.
 */
export class PersonalityDefinitionStore {
  definition: DefinitionV2 = createEmptyDefinitionV2()
  runtimeSpec: PersonalityTypologyRuntimeSpec = projectPersonalityRuntimeSpec(this.definition)
  validationIssues: AssessmentModelValidationIssue[] = []

  constructor() {
    makeObservable(this, {
      definition: observable,
      runtimeSpec: observable,
      validationIssues: observable,
      payload: computed,
      reset: action,
      restoreFromDraft: action,
      setDefinition: action,
      setRuntimeSpec: action,
      setValidationIssues: action
    })
  }

  /** Legacy accessor retained for editor-flow completion checks. */
  get payload(): PersonalityPayloadV1 {
    return mapRuntimeSpecToFormState(this.runtimeSpec).payload
  }

  reset(questionnaireCode = '', questionnaireVersion?: string): void {
    this.definition = createEmptyDefinitionV2()
    this.runtimeSpec = projectPersonalityRuntimeSpec(this.definition, questionnaireCode, questionnaireVersion)
    this.validationIssues = []
  }

  restoreFromDraft(definition: DefinitionV2, questionnaireCode = '', questionnaireVersion?: string): void {
    this.setDefinition(definition, questionnaireCode, questionnaireVersion)
  }

  setDefinition(definition: DefinitionV2, questionnaireCode = '', questionnaireVersion?: string): void {
    this.definition = cloneDefinitionV2(isDefinitionV2(definition) ? definition : createEmptyDefinitionV2())
    this.runtimeSpec = projectPersonalityRuntimeSpec(this.definition, questionnaireCode, questionnaireVersion)
  }

  setRuntimeSpec(spec: PersonalityTypologyRuntimeSpec): void {
    this.runtimeSpec = spec
    this.definition = applyPersonalityRuntimeSpec(this.definition, spec)
  }

  setValidationIssues(issues: AssessmentModelValidationIssue[]): void {
    this.validationIssues = issues
  }

  /** Binding is persisted through /questionnaire, not embedded in DefinitionV2. */
  updateQuestionnaireBinding(questionnaireCode: string, questionnaireVersion?: string): void {
    this.runtimeSpec = {
      ...this.runtimeSpec,
      questionnaire_binding: { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion }
    }
  }

  async loadDefinition(modelCode: string, questionnaireCode = '', questionnaireVersion?: string): Promise<void> {
    const [err, res] = await assessmentModelApi.getAssessmentModelDefinition(modelCode)
    if (err || !res?.data) {
      runInAction(() => this.reset(questionnaireCode, questionnaireVersion))
      return
    }
    runInAction(() => this.setDefinition(res.data, questionnaireCode, questionnaireVersion))
  }

  validateLocal(questions: IQuestion[] = [], algorithm?: string): AssessmentModelValidationIssue[] {
    return this.validateLocalForPublish(questions, algorithm)
  }

  validateDraftDefinition(): AssessmentModelValidationIssue[] {
    const issues: AssessmentModelValidationIssue[] = []
    if (!isDefinitionV2(this.definition)) {
      issues.push({ field: 'definition_v2', message: 'DefinitionV2 必须是对象' })
    }
    this.setValidationIssues(issues)
    return issues
  }

  validateLocalForPublish(questions: IQuestion[] = [], algorithm?: string): AssessmentModelValidationIssue[] {
    const issues = validateRuntimeSpec(this.runtimeSpec, { questions, algorithm })
    this.setValidationIssues(issues)
    return issues
  }

  async applyCode(modelCode: string, target: 'dimension' | 'outcome'): Promise<string> {
    const fallback = `${target}_${Date.now().toString(36)}`
    const [err, res] = await assessmentModelApi.applyAssessmentModelCodes(modelCode, { target, count: 1 })
    if (err || !res?.data?.codes?.[0]) return fallback
    return res.data.codes[0]
  }

  async saveDraftDefinition(
    modelCode: string,
    _algorithm: string
  ): Promise<DefinitionV2 | undefined> {
    void _algorithm
    const issues = this.validateDraftDefinition()
    if (hasBlockingIssues(issues)) {
      throw new Error(issues.find((issue) => issue.level !== 'warning')?.message || '模型定义草稿校验失败')
    }
    const [err, res] = await assessmentModelApi.saveAssessmentModelDefinition(modelCode, this.definition)
    if (err) throw err
    runInAction(() => {
      if (res?.data) {
        this.setDefinition(
          res.data,
          this.runtimeSpec.questionnaire_binding?.questionnaire_code,
          this.runtimeSpec.questionnaire_binding?.questionnaire_version
        )
      }
    })
    return res?.data
  }

  async saveAndValidateDefinition(
    modelCode: string,
    algorithm: string,
    questions: IQuestion[] = []
  ): Promise<DefinitionV2 | undefined> {
    const issues = this.validateLocalForPublish(questions, algorithm)
    if (hasBlockingIssues(issues)) {
      throw new Error(issues.find((issue) => issue.level !== 'warning')?.message || '模型定义校验失败')
    }
    return this.saveDraftDefinition(modelCode, algorithm)
  }

  async saveDefinition(
    modelCode: string,
    algorithm: string,
    questions: IQuestion[] = []
  ): Promise<DefinitionV2 | undefined> {
    return this.saveAndValidateDefinition(modelCode, algorithm, questions)
  }

  async validateDefinitionOnly(questions: IQuestion[] = [], algorithm?: string): Promise<AssessmentModelValidationIssue[]> {
    return this.validateLocalForPublish(questions, algorithm)
  }
}

export const personalityDefinitionStore = new PersonalityDefinitionStore()
