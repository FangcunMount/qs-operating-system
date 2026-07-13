import type { IOptionKeys, IQuestion, IQuestionKeys, IQuestionShowController } from '@/models/question'

export interface QuestionEditorStatePort {
  title: string
  questions: IQuestion[]
  currentCode: string
  currentQuestion: IQuestion | null
  currentIndex: number
  showControllers: Array<{ code: string; show_controller: IQuestionShowController }>
  setCurrentCode: (code: string) => void
  addQuestion: (question: IQuestion) => void
  addQuestionByPosition: (question: IQuestion, index: number) => void
  deleteQuestion: () => void
  changeQuestionPosition: (oldIndex: number, newIndex: number) => void
  updateQuestionDispatch: (type: IQuestionKeys, payload: Record<string, unknown>) => void
  updateQuestionOptionDispatch?: (type: IOptionKeys, payload: Record<string, unknown>) => void
  getQuestion: (code: string) => { question: IQuestion; index: number }
  getQuestionTitleByCode: (code: string) => string
  getQuestionOptionContent: (questionCode: string, optionCode: string) => string
  getShowController: (code: string) => { code: string; show_controller: IQuestionShowController } | undefined
  upsertShowController: (code: string, showController: IQuestionShowController) => void
  deleteShowController: (code: string) => void
}

/**
 * The questionnaire code is deliberately separate from a ModelCatalog code.
 * Question creation and option allocation are always scoped to this code.
 */
export interface QuestionnaireEditingPort extends QuestionEditorStatePort {
  readonly questionnaireCode: string
}

export type RoutingPort = Pick<
  QuestionnaireEditingPort,
  'questions' | 'showControllers' | 'getQuestion' | 'getShowController' | 'upsertShowController' | 'deleteShowController'
>

/**
 * Legacy question widgets still read `id`. Keep that compatibility detail at
 * the boundary so new model editors never accidentally pass their model code.
 */
export interface LegacyQuestionEditorStore extends QuestionEditorStatePort {
  readonly id: string
}

export const bindQuestionnaireEditingPort = (source: QuestionEditorStatePort, questionnaireCode: () => string): QuestionnaireEditingPort => ({
  get questionnaireCode() {
    return questionnaireCode()
  },
  get title() {
    return source.title
  },
  get questions() {
    return source.questions
  },
  get currentCode() {
    return source.currentCode
  },
  get currentQuestion() {
    return source.currentQuestion
  },
  get currentIndex() {
    return source.currentIndex
  },
  get showControllers() {
    return source.showControllers
  },
  setCurrentCode: (code) => source.setCurrentCode(code),
  addQuestion: (question) => source.addQuestion(question),
  addQuestionByPosition: (question, index) => source.addQuestionByPosition(question, index),
  deleteQuestion: () => source.deleteQuestion(),
  changeQuestionPosition: (oldIndex, newIndex) => source.changeQuestionPosition(oldIndex, newIndex),
  updateQuestionDispatch: (type, payload) => source.updateQuestionDispatch(type, payload),
  updateQuestionOptionDispatch: source.updateQuestionOptionDispatch
    ? (type, payload) => source.updateQuestionOptionDispatch?.(type, payload)
    : undefined,
  getQuestion: (code) => source.getQuestion(code),
  getQuestionTitleByCode: (code) => source.getQuestionTitleByCode(code),
  getQuestionOptionContent: (questionCodeValue, optionCode) => source.getQuestionOptionContent(questionCodeValue, optionCode),
  getShowController: (code) => source.getShowController(code),
  upsertShowController: (code, showController) => source.upsertShowController(code, showController),
  deleteShowController: (code) => source.deleteShowController(code)
})

export const toLegacyQuestionEditorStore = (port: QuestionnaireEditingPort): LegacyQuestionEditorStore => ({
  get id() {
    return port.questionnaireCode
  },
  get title() {
    return port.title
  },
  get questions() {
    return port.questions
  },
  get currentCode() {
    return port.currentCode
  },
  get currentQuestion() {
    return port.currentQuestion
  },
  get currentIndex() {
    return port.currentIndex
  },
  get showControllers() {
    return port.showControllers
  },
  setCurrentCode: (code) => port.setCurrentCode(code),
  addQuestion: (question) => port.addQuestion(question),
  addQuestionByPosition: (question, index) => port.addQuestionByPosition(question, index),
  deleteQuestion: () => port.deleteQuestion(),
  changeQuestionPosition: (oldIndex, newIndex) => port.changeQuestionPosition(oldIndex, newIndex),
  updateQuestionDispatch: (type, payload) => port.updateQuestionDispatch(type, payload),
  updateQuestionOptionDispatch: port.updateQuestionOptionDispatch ? (type, payload) => port.updateQuestionOptionDispatch?.(type, payload) : undefined,
  getQuestion: (code) => port.getQuestion(code),
  getQuestionTitleByCode: (code) => port.getQuestionTitleByCode(code),
  getQuestionOptionContent: (questionCode, optionCode) => port.getQuestionOptionContent(questionCode, optionCode),
  getShowController: (code) => port.getShowController(code),
  upsertShowController: (code, showController) => port.upsertShowController(code, showController),
  deleteShowController: (code) => port.deleteShowController(code)
})
