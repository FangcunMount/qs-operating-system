import { IOptionKeys, IQuestion, IQuestionKeys, IQuestionShowController } from '@/models/question'

export interface QuestionEditorStore {
  id: string | undefined
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
  updateQuestionDispatch: (type: IQuestionKeys, payload: any) => void
  updateQuestionOptionDispatch: (type: IOptionKeys, payload: any) => void
  getQuestion: (code: string) => { question: IQuestion; index: number }
  getQuestionTitleByCode: (code: string) => string
  getQuestionOptionContent: (questionCode: string, optionCode: string) => string
  getShowController: (code: string) => { code: string; show_controller: IQuestionShowController } | undefined
  upsertShowController: (code: string, showController: IQuestionShowController) => void
  deleteShowController: (code: string) => void
  [key: string]: any
}
