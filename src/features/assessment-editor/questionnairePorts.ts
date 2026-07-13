import { bindQuestionnaireEditingPort, type QuestionnaireEditingPort, type QuestionEditorStatePort } from './contracts'

type LegacyQuestionnaireEditor = QuestionEditorStatePort & { id: string }
type ModelQuestionnaireEditor = QuestionEditorStatePort & { questionnaireCode: string }

/** The legacy survey and scale stores expose their questionnaire code as `id`. */
export const createSurveyQuestionnairePort = (store: LegacyQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => store.id)

export const createScaleQuestionnairePort = (store: LegacyQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => store.id)

/** Personality keeps `id` as a façade over its bound questionnaire code. */
export const createPersonalityQuestionnairePort = (store: LegacyQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => store.id)

/** ModelCatalog code and questionnaire code are distinct for behavior ability. */
export const createBehaviorAbilityQuestionnairePort = (store: ModelQuestionnaireEditor): QuestionnaireEditingPort =>
  bindQuestionnaireEditingPort(store, () => store.questionnaireCode)
