import { action, computed, makeObservable, observable, runInAction } from 'mobx'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { mapRuntimeSpecToFormState } from '@/models/assessmentModel.mapper'
import {
  AssessmentModelDefinition,
  AssessmentModelValidationIssue,
  createEmptyPersonalityDefinition,
  PersonalityPayloadV1,
  PersonalityTypologyRuntimeSpec,
  validateRuntimeSpec
} from '@/models/assessmentModel'
import { buildDefinitionForSave } from '@/models/assessmentModel.mapper'
import type { IQuestion } from '@/models/question'

const hasBlockingIssues = (issues: AssessmentModelValidationIssue[]) =>
  issues.some((issue) => issue.level !== 'warning')

export class PersonalityDefinitionStore {
  definition: AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> = createEmptyPersonalityDefinition()
  validationIssues: AssessmentModelValidationIssue[] = []

  constructor() {
    makeObservable(this, {
      definition: observable,
      validationIssues: observable,
      runtimeSpec: computed,
      payload: computed,
      reset: action,
      setRuntimeSpec: action,
      setValidationIssues: action
    })
  }

  get runtimeSpec(): PersonalityTypologyRuntimeSpec {
    return this.definition.payload
  }

  /** Legacy accessor for pages still using payload.dimensions/outcomes */
  get payload(): PersonalityPayloadV1 {
    return mapRuntimeSpecToFormState(this.runtimeSpec).payload
  }

  reset(questionnaireCode = '', questionnaireVersion?: string): void {
    this.definition = createEmptyPersonalityDefinition(questionnaireCode, questionnaireVersion)
    this.validationIssues = []
  }

  setRuntimeSpec(spec: PersonalityTypologyRuntimeSpec): void {
    this.definition = { ...this.definition, payload: spec }
  }

  setValidationIssues(issues: AssessmentModelValidationIssue[]): void {
    this.validationIssues = issues
  }

  updateQuestionnaireBinding(questionnaireCode: string, questionnaireVersion?: string): void {
    this.definition = {
      ...this.definition,
      payload: {
        ...this.runtimeSpec,
        questionnaire_binding: { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion }
      }
    }
  }

  async loadDefinition(modelCode: string, questionnaireCode = '', questionnaireVersion?: string): Promise<void> {
    const [err, res] = await assessmentModelApi.getAssessmentModelDefinition(modelCode)
    if (err || !res?.data) {
      runInAction(() => this.reset(questionnaireCode, questionnaireVersion))
      return
    }
    runInAction(() => {
      this.definition = res.data as AssessmentModelDefinition<PersonalityTypologyRuntimeSpec>
      if (questionnaireCode) {
        this.updateQuestionnaireBinding(questionnaireCode, questionnaireVersion)
      }
    })
  }

  validateLocal(): AssessmentModelValidationIssue[] {
    return this.validateLocalForPublish()
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
    subKind: string,
    algorithm: string
  ): Promise<AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> | undefined> {
    const nextDefinition = buildDefinitionForSave(this.definition, this.runtimeSpec, subKind, algorithm)
    const [err, res] = await assessmentModelApi.saveAssessmentModelDefinition(modelCode, nextDefinition)
    if (err) throw err
    runInAction(() => {
      if (res?.data) this.definition = res.data as AssessmentModelDefinition<PersonalityTypologyRuntimeSpec>
    })
    return res?.data as AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> | undefined
  }

  async saveAndValidateDefinition(
    modelCode: string,
    subKind: string,
    algorithm: string,
    questions: IQuestion[] = []
  ): Promise<AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> | undefined> {
    const issues = this.validateLocalForPublish(questions, algorithm)
    if (hasBlockingIssues(issues)) {
      throw new Error(issues.find((issue) => issue.level !== 'warning')?.message || '模型定义校验失败')
    }
    return this.saveDraftDefinition(modelCode, subKind, algorithm)
  }

  async saveDefinition(
    modelCode: string,
    subKind: string,
    algorithm: string,
    questions: IQuestion[] = []
  ): Promise<AssessmentModelDefinition<PersonalityTypologyRuntimeSpec> | undefined> {
    return this.saveAndValidateDefinition(modelCode, subKind, algorithm, questions)
  }
}

export const personalityDefinitionStore = new PersonalityDefinitionStore()
