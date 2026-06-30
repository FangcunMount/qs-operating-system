import { action, computed, makeObservable, observable, runInAction } from 'mobx'
import {
  ICheckBoxQuestion,
  IDateQuestion,
  IOptionKeys,
  IQuestion,
  IQuestionKeys,
  IQuestionShowController,
  IRadioOption,
  IRadioQuestion,
  IScoreRadioOption,
  IScoreRadioQuestion,
  ITextQuestion,
  IValidateRules
} from '@/models/question'
import { surveyApi } from '@/api/path/survey'
import { convertQuestionFromDTO, ensureDefaultValidateRules } from '@/api/path/questionConverter'
import type { IQuestionDTO } from '@/api/path/survey'

type QuestionUpdatePayload = Record<string, unknown>
type QuestionOptionUpdatePayload = Record<string, unknown>

const normalizeQuestions = (questions: unknown[]): IQuestion[] =>
  (questions || [])
    .map((q: unknown) => {
      const item = q as Record<string, unknown>
      if (item?.question_type !== undefined) {
        return ensureDefaultValidateRules(convertQuestionFromDTO(q as IQuestionDTO))
      }
      if (item?.type) {
        return ensureDefaultValidateRules(q as IQuestion)
      }
      return null
    })
    .filter((q): q is IQuestion => q !== null)

export class PersonalityQuestionnaireStore {
  questions: IQuestion[] = []
  showControllers: Array<{ code: string; show_controller: IQuestionShowController }> = []
  deletedShowControllerCodes: string[] = []
  currentCode = ''

  constructor() {
    makeObservable(this, {
      questions: observable,
      showControllers: observable,
      deletedShowControllerCodes: observable,
      currentCode: observable,
      currentQuestion: computed,
      currentIndex: computed,
      reset: action,
      loadFromApi: action,
      setCurrentCode: action,
      setShowControllers: action,
      upsertShowController: action,
      deleteShowController: action,
      addQuestion: action,
      addQuestionByPosition: action,
      deleteQuestion: action,
      changeQuestionPosition: action,
      updateQuestionDispatch: action
    })
  }

  get currentQuestion(): IQuestion | null {
    if (!this.currentCode) return null
    return this.questions.find((q) => q.code === this.currentCode) || null
  }

  get currentIndex(): number {
    return this.questions.findIndex((q) => q.code === this.currentCode)
  }

  reset(): void {
    this.questions = []
    this.showControllers = []
    this.deletedShowControllerCodes = []
    this.currentCode = ''
  }

  restore(data: {
    questions?: IQuestion[]
    showControllers?: Array<{ code: string; show_controller: IQuestionShowController }>
    deletedShowControllerCodes?: string[]
    currentCode?: string
  }): void {
    this.questions = data.questions || []
    this.showControllers = data.showControllers || []
    this.deletedShowControllerCodes = data.deletedShowControllerCodes || []
    this.currentCode = data.currentCode || this.questions[0]?.code || ''
  }

  async loadFromApi(questionnaireCode: string): Promise<void> {
    const [err, res] = await surveyApi.getSurvey(questionnaireCode)
    if (err) throw err
    const questionnaire = res?.data
    if (!questionnaire) return

    runInAction(() => {
      this.questions = normalizeQuestions(questionnaire.questions || [])
      this.currentCode = this.questions[0]?.code || ''
    })
  }

  async saveQuestions(questionnaireCode: string, persist = true): Promise<void> {
    if (!questionnaireCode) throw new Error('题目问卷编码不能为空')
    if (persist) {
      const [err] = await surveyApi.saveSurveyQuestions(questionnaireCode, this.questions, this.showControllers)
      if (err) throw err
    }
  }

  async saveRouting(questionnaireCode: string): Promise<void> {
    return this.saveQuestions(questionnaireCode, true)
  }

  validateQuestions(): string | null {
    if (this.questions.length === 0) return '请至少添加一个问题'
    return null
  }

  setCurrentCode(code: string): void {
    this.currentCode = code
  }

  getQuestionTitleByCode(code: string): string {
    return this.questions.find((item) => item.code === code)?.title || ''
  }

  getQuestionOptionContent(questionCode: string, optionCode: string): string {
    const question = this.questions.find((item) => item.code === questionCode) as IRadioQuestion | undefined
    return question?.options?.find((item) => item.code === optionCode)?.content || ''
  }

  getQuestion(code: string): { question: IQuestion; index: number } {
    const index = this.questions.findIndex((item) => item.code === code)
    return { question: this.questions[index], index }
  }

  setShowControllers(list: Array<{ code: string; show_controller: IQuestionShowController }>): void {
    this.showControllers = list
  }

  upsertShowController(code: string, show_controller: IQuestionShowController): void {
    const index = this.showControllers.findIndex((item) => item.code === code)
    if (index > -1) {
      this.showControllers[index] = { code, show_controller }
    } else {
      this.showControllers.push({ code, show_controller })
    }
    this.deletedShowControllerCodes = this.deletedShowControllerCodes.filter((item) => item !== code)
  }

  deleteShowController(code: string): void {
    this.showControllers = this.showControllers.filter((item) => item.code !== code)
    if (!this.deletedShowControllerCodes.includes(code)) {
      this.deletedShowControllerCodes.push(code)
    }
  }

  getShowController(code: string): { code: string; show_controller: IQuestionShowController } | undefined {
    return this.showControllers.find((item) => item.code === code)
  }

  addQuestion(question: IQuestion): void {
    this.questions.push(question)
    this.currentCode = question.code
  }

  addQuestionByPosition(question: IQuestion, index: number): void {
    this.questions.splice(index, 0, question)
    this.currentCode = question.code
  }

  deleteQuestion(): void {
    if (this.currentIndex >= 0) {
      this.questions.splice(this.currentIndex, 1)
    }
    this.currentCode = ''
  }

  changeQuestionPosition(oldIndex: number, newIndex: number): void {
    this.questions.splice(newIndex, 0, this.questions.splice(oldIndex, 1)[0])
  }

  updateQuestionDispatch(type: IQuestionKeys, payload: QuestionUpdatePayload): void {
    switch (type) {
    case 'title': this.updateQuestionTitle(String(payload.value || '')); break
    case 'tips': this.updateQuestionTips(String(payload.value || '')); break
    case 'placeholder': this.updateQuestionPlaceholder(String(payload.value || '')); break
    case 'format': this.updateQuestionFormat(String(payload.value || '')); break
    case 'left_desc': this.updateQuestionLeftDesc(String(payload.desc || '')); break
    case 'right_desc': this.updateQuestionRightDesc(String(payload.desc || '')); break
    case 'option': this.updateQuestionOptionDispatch(payload.type as IOptionKeys, {
      index: Number(payload.index),
      value: payload.value
    }); break
    case 'options': this.updateQuestionOptions(payload.options as IScoreRadioOption[]); break
    case 'validate': this.updateQuestionValidate(payload.key as keyof IValidateRules, payload.value); break
    case 'formula': this.updateQuestionFormula(payload.value as 'sum' | 'svg' | 'max'); break
    default: break
    }
  }

  updateQuestionOptionDispatch(type: IOptionKeys, payload: QuestionOptionUpdatePayload): void {
    const index = Number(payload.index)
    switch (type) {
    case 'allow_extend_text': this.updateQuestionOption('allow_extend_text', index, payload.value); break
    case 'extend_content': this.updateQuestionOption('extend_content', index, payload.value); break
    case 'extend_placeholder': this.updateQuestionOption('extend_placeholder', index, payload.value); break
    case 'score': this.updateQuestionOption('score', index, payload.value); break
    case 'content': this.updateQuestionOption('content', index, payload.value); break
    case 'image': this.updateQuestionOption('img_url', index, payload.value); break
    case 'add': this.addQuestionOption(payload.value as IRadioOption); break
    case 'delete': this.deleteQuestionOption(index); break
    default: break
    }
  }

  updateQuestionOptions(options: IScoreRadioOption[]): void {
    (this.questions[this.currentIndex] as IScoreRadioQuestion).options = options
  }

  updateQuestionTitle(value: string): void { this.questions[this.currentIndex].title = value }
  updateQuestionTips(value: string): void { this.questions[this.currentIndex].tips = value }
  updateQuestionPlaceholder(value: string): void { (this.questions[this.currentIndex] as ITextQuestion).placeholder = value }
  updateQuestionFormat(value: string): void { (this.questions[this.currentIndex] as IDateQuestion).format = value }
  updateQuestionLeftDesc(value: string): void { (this.questions[this.currentIndex] as IScoreRadioQuestion).left_desc = value }
  updateQuestionRightDesc(value: string): void { (this.questions[this.currentIndex] as IScoreRadioQuestion).right_desc = value }

  updateQuestionValidate(key: keyof IValidateRules, value: unknown): void {
    const question = this.questions[this.currentIndex] as IQuestion & { validate_rules?: IValidateRules }
    question.validate_rules = question.validate_rules || {}
    if (key === 'min_length' && Number(value) > 0) question.validate_rules.required = true
    question.validate_rules[key] = value as never
  }

  updateQuestionFormula(value: 'sum' | 'svg' | 'max'): void {
    (this.questions[this.currentIndex] as ICheckBoxQuestion).calc_rule.formula = value
  }

  updateQuestionOption(key: string, index: number, value: unknown): void {
    (this.questions[this.currentIndex] as IRadioQuestion).options[index][key as keyof IRadioOption] = value as never
  }

  addQuestionOption(item: IRadioOption): void {
    const options = (this.questions[this.currentIndex] as IRadioQuestion).options
    if (options[options.length - 1]?.is_other) {
      options.splice(options.length - 1, 0, item)
    } else {
      options.push(item)
    }
  }

  deleteQuestionOption(index: number): void {
    (this.questions[this.currentIndex] as IRadioQuestion).options.splice(index, 1)
  }
}

export const personalityQuestionnaireStore = new PersonalityQuestionnaireStore()
