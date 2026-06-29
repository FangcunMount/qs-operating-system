import { action, computed, makeObservable, observable, runInAction } from 'mobx'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { mapRuntimeSpecToFormState } from '@/models/assessmentModel.mapper'
import {
  AssessmentModelDefinition,
  AssessmentModelValidationIssue,
  createEmptyPersonalityDefinition,
  PersonalityTypologyRuntimeSpec,
  validateRuntimeSpec
} from '@/models/assessmentModel'
import { buildDefinitionForSave } from '@/models/assessmentModel.mapper'

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
  get payload() {
    return mapRuntimeSpecToFormState(this.runtimeSpec).payload
  }

  reset(questionnaireCode = '', questionnaireVersion?: string) {
    this.definition = createEmptyPersonalityDefinition(questionnaireCode, questionnaireVersion)
    this.validationIssues = []
  }

  setRuntimeSpec(spec: PersonalityTypologyRuntimeSpec) {
    this.definition = { ...this.definition, payload: spec }
  }

  setValidationIssues(issues: AssessmentModelValidationIssue[]) {
    this.validationIssues = issues
  }

  updateQuestionnaireBinding(questionnaireCode: string, questionnaireVersion?: string) {
    this.definition = {
      ...this.definition,
      payload: {
        ...this.runtimeSpec,
        questionnaire_binding: { questionnaire_code: questionnaireCode, questionnaire_version: questionnaireVersion }
      }
    }
  }

  async loadDefinition(modelCode: string, questionnaireCode = '', questionnaireVersion?: string) {
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
    const issues = validateRuntimeSpec(this.runtimeSpec)
    this.setValidationIssues(issues)
    return issues
  }

  async applyCode(modelCode: string, target: 'dimension' | 'outcome'): Promise<string> {
    const fallback = `${target}_${Date.now().toString(36)}`
    const [err, res] = await assessmentModelApi.applyAssessmentModelCodes(modelCode, { target, count: 1 })
    if (err || !res?.data?.codes?.[0]) return fallback
    return res.data.codes[0]
  }

  async saveDefinition(modelCode: string, subKind: string, algorithm: string) {
    const issues = this.validateLocal()
    if (issues.length > 0) {
      throw new Error(issues[0].message)
    }
    const nextDefinition = buildDefinitionForSave(this.definition, this.runtimeSpec, subKind, algorithm)
    const [err, res] = await assessmentModelApi.saveAssessmentModelDefinition(modelCode, nextDefinition)
    if (err) throw err
    runInAction(() => {
      if (res?.data) this.definition = res.data as AssessmentModelDefinition<PersonalityTypologyRuntimeSpec>
    })
    return res?.data
  }
}

export const personalityDefinitionStore = new PersonalityDefinitionStore()
