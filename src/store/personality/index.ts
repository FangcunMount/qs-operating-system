import { computed, makeObservable, reaction } from 'mobx'
import type { EditorFlowContext } from '@/utils/editorFlow'
import {
  PersonalityPayloadV1,
  PersonalityTypologyRuntimeSpec
} from '@/models/assessmentModel'
import { mapRuntimeSpecToFormState } from '@/models/assessmentModel.mapper'
import { personalityDefinitionStore } from './personalityDefinitionStore'
import {
  personalityEditorWorkflowStore,
  PersonalityStep
} from './personalityEditorWorkflowStore'
import { personalityModelEditorStore } from './personalityModelEditorStore'
import { personalityPublishStore } from './personalityPublishStore'
import { personalityQuestionnaireStore } from './personalityQuestionnaireStore'

export type { PersonalityStep } from './personalityEditorWorkflowStore'

/** Read-only facade + questionnaire delegates; workflow lives in personalityEditorWorkflowStore */
class PersonalityModelStoreFacade {
  constructor() {
    makeObservable(this, {
      currentStep: computed,
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
      canEdit: computed
    })
  }

  get currentStep(): PersonalityStep { return personalityEditorWorkflowStore.currentStep }
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

  initPersonality = () => personalityEditorWorkflowStore.initPersonality()
  setCurrentStep = (step: PersonalityStep) => personalityEditorWorkflowStore.setCurrentStep(step)
  nextStep = () => personalityEditorWorkflowStore.nextStep()
  saveToLocalStorage = () => personalityEditorWorkflowStore.saveToLocalStorage()
  loadFromLocalStorage = (expectedModelCode?: string) => personalityEditorWorkflowStore.loadFromLocalStorage(expectedModelCode)
  clearLocalStorage = () => personalityEditorWorkflowStore.clearLocalStorage()
  initEditor = (modelCode?: string) => personalityEditorWorkflowStore.initEditor(modelCode)
  saveBasicInfo = () => personalityEditorWorkflowStore.saveBasicInfoAndQuestionnaire()
  saveQuestionList = (options?: { persist?: boolean }) => personalityEditorWorkflowStore.saveQuestions(options)
  saveRouting = () => personalityEditorWorkflowStore.saveRouting()
  saveDefinition = () => personalityEditorWorkflowStore.saveAndValidateDefinition()
  saveDraftDefinition = () => personalityEditorWorkflowStore.saveDefinitionDraft()
  validateDefinitionLocal = () => personalityEditorWorkflowStore.validateDefinition()
  saveAndValidateDefinition = () => personalityEditorWorkflowStore.saveAndValidateDefinition()
  validateForPublish = () => personalityEditorWorkflowStore.validateForPublish()
  publish = () => personalityEditorWorkflowStore.publish()
  unpublish = () => personalityEditorWorkflowStore.unpublish()

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
    personalityEditorWorkflowStore.setRuntimeSpec(spec)
  }

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
    currentStep: personalityEditorWorkflowStore.currentStep
  }),
  (data) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (data.modelCode || data.title || data.questions !== '[]') {
        personalityEditorWorkflowStore.saveToLocalStorage()
      }
    }, 500)
  },
  { fireImmediately: false }
)

export {
  personalityModelEditorStore,
  personalityQuestionnaireStore,
  personalityDefinitionStore,
  personalityPublishStore,
  personalityEditorWorkflowStore
}

export const getPersonalityEditorFlowContext = (): EditorFlowContext => ({
  modelCode: personalityModelStore.modelCode,
  ...personalityEditorWorkflowStore.flowContext
})
