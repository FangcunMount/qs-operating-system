import { action, computed, makeObservable, observable, runInAction } from 'mobx'
import type {
  AssessmentModelDefinition,
  AssessmentModelPreviewReportRequest,
  AssessmentModelPreviewReportResponse,
  AssessmentModelValidationIssue,
  AssessmentModelValidationResult,
  PersonalityTypologyRuntimeSpec
} from '@/models/assessmentModel'
import type { IQuestion, IQuestionShowController } from '@/models/question'
import type { EditorFlowContext } from '@/utils/editorFlow'
import {
  PERSONALITY_SUB_KIND
} from '@/constants/personalityScope'
import { normalizeAssessmentModelDefinition } from '@/models/assessmentModel.mapper'
import { personalityDraftStorage } from './personalityDraftStorage'
import { personalityDefinitionStore } from './personalityDefinitionStore'
import { personalityModelEditorStore } from './personalityModelEditorStore'
import { personalityPublishStore } from './personalityPublishStore'
import { personalityQuestionnaireStore } from './personalityQuestionnaireStore'

export type PersonalityStep = 'create' | 'edit-questions' | 'set-routing' | 'edit-definition' | 'publish'

const STORAGE_VERSION = 'v2'
const WORKFLOW_STEPS: PersonalityStep[] = ['create', 'edit-questions', 'set-routing', 'edit-definition', 'publish']

interface PersistedPersonalityData {
  version: string
  editor: ReturnType<typeof snapshotEditor>
  questionnaire: {
    questions: IQuestion[]
    showControllers: Array<{ code: string; show_controller: IQuestionShowController }>
    deletedShowControllerCodes: string[]
    currentCode: string
  }
  definition: AssessmentModelDefinition<PersonalityTypologyRuntimeSpec>
  currentStep: PersonalityStep
}

const snapshotEditor = () => ({
  modelCode: personalityModelEditorStore.modelCode,
  title: personalityModelEditorStore.title,
  desc: personalityModelEditorStore.desc,
  category: personalityModelEditorStore.category,
  tags: personalityModelEditorStore.tags,
  algorithm: personalityModelEditorStore.algorithm,
  subKind: personalityModelEditorStore.subKind,
  status: personalityModelEditorStore.status,
  questionnaireCode: personalityModelEditorStore.questionnaireCode,
  questionnaireVersion: personalityModelEditorStore.questionnaireVersion,
  questionnaireStrategy: personalityModelEditorStore.questionnaireStrategy,
  bindQuestionnaireCode: personalityModelEditorStore.bindQuestionnaireCode,
  customModelCode: personalityModelEditorStore.customModelCode
})

const requireModelCode = (): string => {
  if (!personalityModelEditorStore.modelCode) throw new Error('人格测评编码不能为空')
  return personalityModelEditorStore.modelCode
}

export class PersonalityEditorWorkflowStore {
  currentStep: PersonalityStep = 'create'

  constructor() {
    makeObservable(this, {
      currentStep: observable,
      modelCode: computed,
      flowContext: computed,
      setCurrentStep: action,
      nextStep: action,
      initPersonality: action
    })
  }

  get modelCode(): string {
    return personalityModelEditorStore.modelCode
  }

  get flowContext(): Omit<EditorFlowContext, 'modelCode'> {
    const runtimeSpec = personalityDefinitionStore.runtimeSpec
    const payload = personalityDefinitionStore.payload
    return {
      questionnaireCode: personalityModelEditorStore.questionnaireCode,
      hasQuestions: personalityQuestionnaireStore.questions.length > 0,
      hasDefinition: Boolean(
        (runtimeSpec.factor_graph?.factors && Object.keys(runtimeSpec.factor_graph.factors).length > 0)
        || (payload.outcomes?.length && payload.outcomes.length > 0)
      ),
      readonly: personalityModelEditorStore.status === 'archived'
    }
  }

  initPersonality(): void {
    personalityModelEditorStore.reset()
    personalityQuestionnaireStore.reset()
    personalityDefinitionStore.reset()
    personalityPublishStore.reset()
    this.currentStep = 'create'
    personalityDraftStorage.clear('new')
  }

  setCurrentStep(step: PersonalityStep): void {
    this.currentStep = step
  }

  nextStep(): void {
    const idx = WORKFLOW_STEPS.indexOf(this.currentStep)
    if (idx < WORKFLOW_STEPS.length - 1) this.currentStep = WORKFLOW_STEPS[idx + 1]
  }

  goStep(step: PersonalityStep): void {
    this.currentStep = step
  }

  saveToLocalStorage(): void {
    const key = personalityModelEditorStore.modelCode || 'new'
    try {
      const data: PersistedPersonalityData = {
        version: STORAGE_VERSION,
        editor: snapshotEditor(),
        questionnaire: {
          questions: JSON.parse(JSON.stringify(personalityQuestionnaireStore.questions)),
          showControllers: JSON.parse(JSON.stringify(personalityQuestionnaireStore.showControllers)),
          deletedShowControllerCodes: [...personalityQuestionnaireStore.deletedShowControllerCodes],
          currentCode: personalityQuestionnaireStore.currentCode
        },
        definition: JSON.parse(JSON.stringify(personalityDefinitionStore.definition)),
        currentStep: this.currentStep
      }
      localStorage.setItem(`personalityModelDraft_v2:${key}`, JSON.stringify(data))
      personalityModelEditorStore.persistDraft(this.currentStep)
    } catch (error) {
      console.error('保存人格测评草稿失败:', error)
    }
  }

  loadFromLocalStorage(expectedModelCode?: string): boolean {
    const key = expectedModelCode || personalityModelEditorStore.modelCode || 'new'
    try {
      const stored = localStorage.getItem(`personalityModelDraft_v2:${key}`)
      if (!stored) return personalityModelEditorStore.restoreDraft()
      const data: PersistedPersonalityData = JSON.parse(stored)
      if (data.version !== STORAGE_VERSION) return false
      if (expectedModelCode && data.editor.modelCode && data.editor.modelCode !== expectedModelCode) return false

      runInAction(() => {
        personalityModelEditorStore.applyModel({
          code: data.editor.modelCode,
          title: data.editor.title,
          description: data.editor.desc,
          category: data.editor.category,
          tags: data.editor.tags,
          algorithm: data.editor.algorithm,
          sub_kind: PERSONALITY_SUB_KIND,
          status: data.editor.status,
          questionnaire_code: data.editor.questionnaireCode,
          questionnaire_version: data.editor.questionnaireVersion
        })
        personalityModelEditorStore.questionnaireStrategy = data.editor.questionnaireStrategy || 'create'
        personalityModelEditorStore.bindQuestionnaireCode = data.editor.bindQuestionnaireCode || ''
        personalityModelEditorStore.customModelCode = data.editor.customModelCode || ''
        personalityQuestionnaireStore.restore(data.questionnaire)
        personalityDefinitionStore.definition = normalizeAssessmentModelDefinition({
          ...data.definition,
          algorithm: data.editor.algorithm || data.definition?.algorithm || 'mbti'
        }) as AssessmentModelDefinition<PersonalityTypologyRuntimeSpec>
        this.currentStep = data.currentStep || 'create'
      })
      return true
    } catch (error) {
      console.error('恢复人格测评草稿失败:', error)
      return false
    }
  }

  clearLocalStorage(): void {
    const key = personalityModelEditorStore.modelCode || 'new'
    localStorage.removeItem(`personalityModelDraft_v2:${key}`)
    personalityDraftStorage.clear(key)
  }

  async initEditor(modelCode?: string): Promise<void> {
    if (!modelCode || modelCode === 'new') {
      const restored = this.loadFromLocalStorage()
      if (!restored) this.initPersonality()
      return
    }

    const restored = this.loadFromLocalStorage(modelCode)
    if (restored && this.modelCode === modelCode && personalityModelEditorStore.title) return

    await personalityModelEditorStore.init(modelCode)

    if (personalityModelEditorStore.questionnaireCode) {
      await personalityQuestionnaireStore.loadFromApi(personalityModelEditorStore.questionnaireCode)
    }

    await personalityDefinitionStore.loadDefinition(
      modelCode,
      personalityModelEditorStore.questionnaireCode,
      personalityModelEditorStore.questionnaireVersion
    )
  }

  async saveBasicInfoAndQuestionnaire(): Promise<string> {
    const code = await personalityModelEditorStore.saveBasicInfo()
    personalityDefinitionStore.updateQuestionnaireBinding(
      personalityModelEditorStore.questionnaireCode,
      personalityModelEditorStore.questionnaireVersion
    )
    this.currentStep = 'edit-questions'
    return code
  }

  async saveQuestions(options: { persist?: boolean } = {}): Promise<void> {
    const { persist = false } = options
    await personalityQuestionnaireStore.saveQuestions(personalityModelEditorStore.questionnaireCode, persist)
    if (this.currentStep === 'edit-questions') this.currentStep = 'set-routing'
  }

  async saveRouting(): Promise<void> {
    await personalityQuestionnaireStore.saveRouting(personalityModelEditorStore.questionnaireCode)
    this.currentStep = 'edit-definition'
  }

  setRuntimeSpec(spec: PersonalityTypologyRuntimeSpec): void {
    personalityDefinitionStore.setRuntimeSpec(spec)
  }

  async saveDefinitionDraft(): Promise<void> {
    const modelCode = requireModelCode()
    await personalityDefinitionStore.saveDraftDefinition(
      modelCode,
      personalityModelEditorStore.subKind,
      personalityModelEditorStore.algorithm
    )
  }

  validateDefinition(): AssessmentModelValidationIssue[] {
    return personalityDefinitionStore.validateLocal(
      personalityQuestionnaireStore.questions,
      personalityModelEditorStore.algorithm
    )
  }

  async saveAndValidateDefinition(): Promise<void> {
    const modelCode = requireModelCode()
    await personalityDefinitionStore.saveAndValidateDefinition(
      modelCode,
      personalityModelEditorStore.subKind,
      personalityModelEditorStore.algorithm,
      personalityQuestionnaireStore.questions
    )
    this.currentStep = 'publish'
  }

  async validateForPublish(): Promise<AssessmentModelValidationResult> {
    return personalityPublishStore.validate(requireModelCode())
  }

  async previewReport(
    request: AssessmentModelPreviewReportRequest
  ): Promise<AssessmentModelPreviewReportResponse | null> {
    return personalityPublishStore.runPreviewReport(requireModelCode(), request)
  }

  async loadQRCode(modelCode?: string): Promise<void> {
    await personalityPublishStore.loadQRCode(modelCode || requireModelCode())
  }

  async publish(): Promise<void> {
    const modelCode = requireModelCode()
    if (personalityModelEditorStore.questionnaireCode) {
      await personalityQuestionnaireStore.saveQuestions(personalityModelEditorStore.questionnaireCode, true)
    }
    await this.saveAndValidateDefinition()
    const validation = await this.validateForPublish()
    if (!validation.passed) {
      throw Object.assign(new Error('人格测评校验失败'), { validation })
    }
    const result = await personalityPublishStore.publish(modelCode)
    runInAction(() => {
      if (result?.status) personalityModelEditorStore.status = result.status
      this.currentStep = 'publish'
    })
    this.clearLocalStorage()
  }

  async unpublish(): Promise<void> {
    const result = await personalityPublishStore.unpublish(requireModelCode())
    runInAction(() => {
      if (result?.status) personalityModelEditorStore.status = result.status
    })
    personalityPublishStore.setQrCode(null)
  }

  async archive(modelCode?: string): Promise<void> {
    const result = await personalityPublishStore.archive(modelCode || requireModelCode())
    runInAction(() => {
      if (result?.status) personalityModelEditorStore.status = result.status
    })
    personalityPublishStore.setQrCode(null)
  }
}

export const personalityEditorWorkflowStore = new PersonalityEditorWorkflowStore()
