import { bindQuestionnaireEditingPort } from './contracts'
import type { QuestionnaireEditingPort, QuestionEditorStatePort } from './contracts'

/** Legacy stores mirror IQuestionSheet, so `id` may be unset before init. */
type LegacyQuestionnaireEditor = QuestionEditorStatePort & { id?: string }
type ModelQuestionnaireEditor = QuestionEditorStatePort & { questionnaireCode: string }

const legacyQuestionnaireCode = (store: LegacyQuestionnaireEditor): string => store.id || ''

/** The legacy survey and scale stores expose their questionnaire code as `id`. */
export const createSurveyQuestionnairePort = (store: LegacyQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => legacyQuestionnaireCode(store))

export const createScaleQuestionnairePort = (store: LegacyQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => legacyQuestionnaireCode(store))

/** Personality keeps `id` as a façade over its bound questionnaire code. */
export const createPersonalityQuestionnairePort = (store: LegacyQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => legacyQuestionnaireCode(store))

/** ModelCatalog code and questionnaire code are distinct for behavior ability. */
export const createBehaviorAbilityQuestionnairePort = (store: ModelQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => store.questionnaireCode)
