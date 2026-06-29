import { action, computed, makeObservable, observable, reaction, runInAction } from 'mobx'
import { IQuestion, IQuestionShowController } from '@/models/question'
import {
  AssessmentModelDefinition,
  PersonalityPayloadV1,
  PersonalityTypologyRuntimeSpec
} from '@/models/assessmentModel'
import { mapRuntimeSpecToFormState } from '@/models/assessmentModel.mapper'
import { personalityDraftStorage } from './personalityDraftStorage'
import { personalityDefinitionStore } from './personalityDefinitionStore'
import { personalityModelEditorStore } from './personalityModelEditorStore'
import { personalityPublishStore } from './personalityPublishStore'
import { personalityQuestionnaireStore } from './personalityQuestionnaireStore'

export type PersonalityStep = 'create' | 'edit-questions' | 'set-routing' | 'edit-definition' | 'publish'

const STORAGE_VERSION = 'v2'

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

/** Facade preserving the legacy personalityModelStore API */
class PersonalityModelStoreFacade {
  currentStep: PersonalityStep = 'create'

  constructor() {
    makeObservable(this, {
      currentStep: observable,
      id: computed,
      modelCode: computed,
      title: computed,
      desc: computed,
      category: computed,
      tags: computed,
      algorithm: computed,
      subKind: computed,
      status: computed,
      questions: computed,
      showControllers: computed,
      deletedShowControllerCodes: computed,
      definition: computed,
      payload: computed,
      currentCode: computed,
      currentQuestion: computed,
      currentIndex: computed,
      isPublished: computed,
      isArchived: computed,
      canEdit: computed,
      setCurrentStep: action,
      nextStep: action,
      initPersonality: action
    })
  }

  get id() { return personalityModelEditorStore.questionnaireCode }
  get modelCode() { return personalityModelEditorStore.modelCode }
  get title() { return personalityModelEditorStore.title }
  get desc() { return personalityModelEditorStore.desc }
  get category() { return personalityModelEditorStore.category }
  get tags() { return personalityModelEditorStore.tags }
  get algorithm() { return personalityModelEditorStore.algorithm }
  get subKind() { return personalityModelEditorStore.subKind }
  get status() { return personalityModelEditorStore.status }
  get questions() { return personalityQuestionnaireStore.questions }
  get showControllers() { return personalityQuestionnaireStore.showControllers }
  get deletedShowControllerCodes() { return personalityQuestionnaireStore.deletedShowControllerCodes }
  get definition() { return personalityDefinitionStore.definition }
  get payload() { return personalityDefinitionStore.payload }
  get runtimeSpec() { return personalityDefinitionStore.runtimeSpec }
  get currentCode() { return personalityQuestionnaireStore.currentCode }
  get currentQuestion() { return personalityQuestionnaireStore.currentQuestion }
  get currentIndex() { return personalityQuestionnaireStore.currentIndex }
  get isPublished() { return personalityModelEditorStore.isPublished }
  get isArchived() { return personalityModelEditorStore.isArchived }
  get canEdit() { return personalityModelEditorStore.canEdit }

  initPersonality() {
    personalityModelEditorStore.reset()
    personalityQuestionnaireStore.reset()
    personalityDefinitionStore.reset()
    personalityPublishStore.reset()
    this.currentStep = 'create'
    personalityDraftStorage.clear('new')
  }

  setCurrentStep(step: PersonalityStep) {
    this.currentStep = step
  }

  nextStep() {
    const steps: PersonalityStep[] = ['create', 'edit-questions', 'set-routing', 'edit-definition', 'publish']
    const idx = steps.indexOf(this.currentStep)
    if (idx < steps.length - 1) this.currentStep = steps[idx + 1]
  }

  saveToLocalStorage() {
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
          sub_kind: data.editor.subKind,
          status: data.editor.status,
          questionnaire_code: data.editor.questionnaireCode,
          questionnaire_version: data.editor.questionnaireVersion
        })
        personalityModelEditorStore.questionnaireStrategy = data.editor.questionnaireStrategy || 'create'
        personalityModelEditorStore.bindQuestionnaireCode = data.editor.bindQuestionnaireCode || ''
        personalityModelEditorStore.customModelCode = data.editor.customModelCode || ''
        personalityQuestionnaireStore.restore(data.questionnaire)
        personalityDefinitionStore.definition = data.definition
        this.currentStep = data.currentStep || 'create'
      })
      return true
    } catch (error) {
      console.error('恢复人格测评草稿失败:', error)
      return false
    }
  }

  clearLocalStorage() {
    const key = personalityModelEditorStore.modelCode || 'new'
    localStorage.removeItem(`personalityModelDraft_v2:${key}`)
    personalityDraftStorage.clear(key)
  }

  async initEditor(modelCode?: string) {
    if (!modelCode || modelCode === 'new') {
      const restored = this.loadFromLocalStorage()
      if (!restored) this.initPersonality()
      return
    }

    const restored = this.loadFromLocalStorage(modelCode)
    if (restored && this.modelCode === modelCode && this.title) return

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

  async saveBasicInfo() {
    const code = await personalityModelEditorStore.saveBasicInfo()
    personalityDefinitionStore.updateQuestionnaireBinding(
      personalityModelEditorStore.questionnaireCode,
      personalityModelEditorStore.questionnaireVersion
    )
    this.currentStep = 'edit-questions'
    return code
  }

  async saveQuestionList(options: { persist?: boolean } = {}) {
    const { persist = false } = options
    await personalityQuestionnaireStore.saveQuestions(personalityModelEditorStore.questionnaireCode, persist)
    if (this.currentStep === 'edit-questions') this.currentStep = 'set-routing'
  }

  async saveRouting() {
    await personalityQuestionnaireStore.saveRouting(personalityModelEditorStore.questionnaireCode)
    this.currentStep = 'edit-definition'
  }

  async saveDefinition() {
    if (!this.modelCode) throw new Error('人格测评编码不能为空')
    await personalityDefinitionStore.saveDefinition(this.modelCode, this.subKind, this.algorithm)
    this.currentStep = 'publish'
  }

  async validateForPublish() {
    return personalityPublishStore.validate(this.modelCode)
  }

  async publish() {
    if (!this.modelCode) throw new Error('人格测评编码不能为空')
    if (this.id) {
      await personalityQuestionnaireStore.saveQuestions(this.id, true)
    }
    await this.saveDefinition()
    const validation = await this.validateForPublish()
    if (!validation.passed) {
      throw Object.assign(new Error('人格测评校验失败'), { validation })
    }
    const result = await personalityPublishStore.publish(this.modelCode)
    runInAction(() => {
      if (result?.status) personalityModelEditorStore.status = result.status
      this.currentStep = 'publish'
    })
    this.clearLocalStorage()
  }

  async unpublish() {
    const result = await personalityPublishStore.unpublish(this.modelCode)
    runInAction(() => {
      if (result?.status) personalityModelEditorStore.status = result.status
    })
  }

  setDefinitionPayload(payload: PersonalityPayloadV1) {
    const { payload: _p, scoringRulesSource } = mapRuntimeSpecToFormState(personalityDefinitionStore.runtimeSpec)
    void _p
    try {
      const scoringRules = JSON.parse(scoringRulesSource || '{}')
      personalityDefinitionStore.setRuntimeSpec({
        ...personalityDefinitionStore.runtimeSpec,
        factor_graph: {
          ...personalityDefinitionStore.runtimeSpec.factor_graph,
          dimension_order: payload.dimensions.map((d) => d.code),
          dimensions: Object.fromEntries(payload.dimensions.map((d) => [d.code, d])),
          factors: Object.fromEntries(payload.dimensions.map((d) => [d.code, {
            id: d.code, code: d.code, name: d.title, kind: 'leaf' as const
          }])),
          roots: payload.dimensions.map((d) => d.code)
        },
        outcome_mapping: { outcomes: payload.outcomes },
        questionnaire_binding: payload.questionnaire_binding,
        decision: { ...personalityDefinitionStore.runtimeSpec.decision, ...(scoringRules.decision || {}) }
      })
    } catch {
      personalityDefinitionStore.setRuntimeSpec({
        ...personalityDefinitionStore.runtimeSpec,
        factor_graph: {
          ...personalityDefinitionStore.runtimeSpec.factor_graph,
          dimension_order: payload.dimensions.map((d) => d.code),
          dimensions: Object.fromEntries(payload.dimensions.map((d) => [d.code, d]))
        },
        outcome_mapping: { outcomes: payload.outcomes },
        questionnaire_binding: payload.questionnaire_binding
      })
    }
  }

  setRuntimeSpec(spec: PersonalityTypologyRuntimeSpec) {
    personalityDefinitionStore.setRuntimeSpec(spec)
  }

  // Delegate questionnaire methods
  setCurrentCode = (code: string) => personalityQuestionnaireStore.setCurrentCode(code)
  changeQuestionPosition = (a: number, b: number) => personalityQuestionnaireStore.changeQuestionPosition(a, b)
  getQuestionTitleByCode = (code: string) => personalityQuestionnaireStore.getQuestionTitleByCode(code)
  getQuestionOptionContent = (a: string, b: string) => personalityQuestionnaireStore.getQuestionOptionContent(a, b)
  getQuestion = (code: string) => personalityQuestionnaireStore.getQuestion(code)
  setShowControllers = personalityQuestionnaireStore.setShowControllers.bind(personalityQuestionnaireStore)
  upsertShowController = personalityQuestionnaireStore.upsertShowController.bind(personalityQuestionnaireStore)
  deleteShowController = personalityQuestionnaireStore.deleteShowController.bind(personalityQuestionnaireStore)
  getShowController = personalityQuestionnaireStore.getShowController.bind(personalityQuestionnaireStore)
  addQuestion = personalityQuestionnaireStore.addQuestion.bind(personalityQuestionnaireStore)
  addQuestionByPosition = personalityQuestionnaireStore.addQuestionByPosition.bind(personalityQuestionnaireStore)
  deleteQuestion = personalityQuestionnaireStore.deleteQuestion.bind(personalityQuestionnaireStore)
  updateQuestionDispatch = personalityQuestionnaireStore.updateQuestionDispatch.bind(personalityQuestionnaireStore)
  updateQuestionOptionDispatch = personalityQuestionnaireStore.updateQuestionOptionDispatch.bind(personalityQuestionnaireStore)
}

export const personalityModelStore = new PersonalityModelStoreFacade()

let saveTimer: NodeJS.Timeout | null = null
reaction(
  () => ({
    modelCode: personalityModelStore.modelCode,
    title: personalityModelStore.title,
    questions: JSON.stringify(personalityModelStore.questions),
    definition: JSON.stringify(personalityModelStore.definition),
    currentStep: personalityModelStore.currentStep
  }),
  (data) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (data.modelCode || data.title || data.questions !== '[]') {
        personalityModelStore.saveToLocalStorage()
      }
    }, 500)
  },
  { fireImmediately: false }
)

export {
  personalityModelEditorStore,
  personalityQuestionnaireStore,
  personalityDefinitionStore,
  personalityPublishStore
}
