import { action, computed, makeObservable, observable, reaction, runInAction } from 'mobx'
import {
  ICheckBoxQuestion,
  IDateQuestion,
  IOptionKeys,
  IQuestion,
  IQuestionKeys,
  IRadioOption,
  IRadioQuestion,
  IScoreRadioOption,
  IScoreRadioQuestion,
  ITextQuestion,
  IValidateRules
} from '@/models/question'
import {
  AssessmentModelDefinition,
  AssessmentModelStatus,
  PersonalityPayloadV1,
  createEmptyPersonalityDefinition,
  createEmptyPersonalityPayload
} from '@/models/assessmentModel'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { surveyApi } from '@/api/path/survey'
import { api } from '@/api'
import { QuestionnaireType } from '@/constants/questionnaireType'
import { convertQuestionFromDTO, ensureDefaultValidateRules } from '@/api/path/questionConverter'
import type { IQuestionDTO } from '@/api/path/survey'
import { IQuestionShowController } from '@/models/question'

export type PersonalityStep = 'create' | 'edit-questions' | 'set-routing' | 'edit-definition' | 'publish'

const STORAGE_KEY = 'personalityModelStore_data_v1'
const STORAGE_VERSION = 'v1'

interface PersistedPersonalityModelData {
  version: string
  modelCode: string
  id: string
  title: string
  desc: string
  category: string
  tags: string[]
  algorithm: string
  subKind: string
  status: AssessmentModelStatus
  questions: IQuestion[]
  showControllers: Array<{ code: string; show_controller: IQuestionShowController }>
  deletedShowControllerCodes: string[]
  definition: AssessmentModelDefinition<PersonalityPayloadV1>
  currentCode: string
  currentStep: PersonalityStep
  timestamp: number
}

const normalizeQuestions = (questions: any[]): IQuestion[] =>
  (questions || [])
    .map((q: any) => {
      if (q?.question_type !== undefined) {
        return ensureDefaultValidateRules(convertQuestionFromDTO(q as IQuestionDTO))
      }
      if (q?.type) {
        return ensureDefaultValidateRules(q as IQuestion)
      }
      return null
    })
    .filter((q): q is IQuestion => q !== null)

export const personalityModelStore = makeObservable(
  {
    id: '',
    modelCode: '',
    title: '',
    desc: '',
    category: '',
    tags: [] as string[],
    algorithm: 'typology_v1',
    subKind: 'typology',
    status: 'draft' as AssessmentModelStatus,
    questions: [] as IQuestion[],
    showControllers: [] as Array<{ code: string; show_controller: IQuestionShowController }>,
    deletedShowControllerCodes: [] as string[],
    definition: createEmptyPersonalityDefinition(),
    currentCode: '',
    currentStep: 'create' as PersonalityStep,

    get payload() {
      return this.definition.payload
    },

    get currentQuestion() {
      if (!this.currentCode) return null
      return this.questions.find((question: IQuestion) => question.code === this.currentCode) || null
    },

    get currentIndex() {
      return this.questions.findIndex((question: IQuestion) => question.code === this.currentCode)
    },

    get isPublished() {
      return this.status === 'published'
    },

    initPersonality() {
      this.id = ''
      this.modelCode = ''
      this.title = ''
      this.desc = ''
      this.category = ''
      this.tags = []
      this.algorithm = 'typology_v1'
      this.subKind = 'typology'
      this.status = 'draft'
      this.questions = []
      this.showControllers = []
      this.deletedShowControllerCodes = []
      this.definition = createEmptyPersonalityDefinition()
      this.currentCode = ''
      this.currentStep = 'create'
      this.clearLocalStorage()
    },

    setCurrentStep(step: PersonalityStep) {
      this.currentStep = step
    },

    nextStep() {
      const steps: PersonalityStep[] = ['create', 'edit-questions', 'set-routing', 'edit-definition', 'publish']
      const currentIndex = steps.indexOf(this.currentStep)
      if (currentIndex < steps.length - 1) {
        this.currentStep = steps[currentIndex + 1]
      }
    },

    saveToLocalStorage() {
      try {
        const data: PersistedPersonalityModelData = {
          version: STORAGE_VERSION,
          modelCode: this.modelCode,
          id: this.id,
          title: this.title,
          desc: this.desc,
          category: this.category,
          tags: this.tags,
          algorithm: this.algorithm,
          subKind: this.subKind,
          status: this.status,
          questions: JSON.parse(JSON.stringify(this.questions)),
          showControllers: JSON.parse(JSON.stringify(this.showControllers)),
          deletedShowControllerCodes: [...this.deletedShowControllerCodes],
          definition: JSON.parse(JSON.stringify(this.definition)),
          currentCode: this.currentCode,
          currentStep: this.currentStep,
          timestamp: Date.now()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (error) {
        console.error('保存人格测评草稿失败:', error)
      }
    },

    loadFromLocalStorage(expectedModelCode?: string) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return false
        const data: PersistedPersonalityModelData = JSON.parse(stored)
        if (data.version !== STORAGE_VERSION) return false
        if (expectedModelCode && data.modelCode && data.modelCode !== expectedModelCode) return false

        runInAction(() => {
          this.modelCode = data.modelCode || ''
          this.id = data.id || ''
          this.title = data.title || ''
          this.desc = data.desc || ''
          this.category = data.category || ''
          this.tags = data.tags || []
          this.algorithm = data.algorithm || 'typology_v1'
          this.subKind = data.subKind || 'typology'
          this.status = data.status || 'draft'
          this.questions = data.questions || []
          this.showControllers = data.showControllers || []
          this.deletedShowControllerCodes = data.deletedShowControllerCodes || []
          this.definition = data.definition || createEmptyPersonalityDefinition(this.id)
          this.currentCode = data.currentCode || ''
          this.currentStep = data.currentStep || 'create'
        })
        return true
      } catch (error) {
        console.error('恢复人格测评草稿失败:', error)
        return false
      }
    },

    clearLocalStorage() {
      localStorage.removeItem(STORAGE_KEY)
    },

    async initEditor(modelCode?: string) {
      if (!modelCode || modelCode === 'new') {
        const restored = this.loadFromLocalStorage()
        if (!restored) this.initPersonality()
        return
      }

      const restored = this.loadFromLocalStorage(modelCode)
      if (restored && this.modelCode === modelCode && this.title) return

      const [modelErr, modelRes] = await assessmentModelApi.getAssessmentModel(modelCode)
      if (modelErr) throw modelErr

      const model = modelRes?.data
      if (!model) throw new Error('人格测评不存在')

      runInAction(() => {
        this.modelCode = model.code
        this.title = model.title
        this.desc = model.description || ''
        this.category = model.category || ''
        this.tags = model.tags || []
        this.algorithm = model.algorithm || 'typology_v1'
        this.subKind = model.sub_kind || 'typology'
        this.status = model.status
        this.id = model.questionnaire_code || ''
      })

      if (model.questionnaire_code) {
        await this.loadQuestionnaire(model.questionnaire_code)
      }

      await this.loadDefinition(model.code)
    },

    async loadQuestionnaire(questionnaireCode: string) {
      const [err, res] = await surveyApi.getSurvey(questionnaireCode)
      if (err) throw err
      const questionnaire = res?.data
      if (!questionnaire) return

      runInAction(() => {
        this.id = questionnaire.code
        this.title = this.title || questionnaire.title
        this.desc = this.desc || questionnaire.description || ''
        this.questions = normalizeQuestions(questionnaire.questions || [])
        this.currentCode = this.questions[0]?.code || ''
        this.definition.payload.questionnaire_binding = {
          questionnaire_code: questionnaire.code,
          questionnaire_version: questionnaire.version
        }
      })
    },

    async loadDefinition(modelCode: string) {
      const [err, res] = await assessmentModelApi.getAssessmentModelDefinition(modelCode)
      if (err || !res?.data) {
        runInAction(() => {
          this.definition = createEmptyPersonalityDefinition(this.id)
        })
        return
      }

      runInAction(() => {
        this.definition = {
          ...res.data,
          payload: {
            ...createEmptyPersonalityPayload(this.id),
            ...(res.data.payload as PersonalityPayloadV1)
          }
        } as AssessmentModelDefinition<PersonalityPayloadV1>
      })
    },

    async saveBasicInfo() {
      let questionnaireCode = this.id
      let questionnaireVersion: string | undefined

      if (!questionnaireCode) {
        const [surveyErr, surveyRes] = await api.createSurvey({
          title: this.title,
          desc: this.desc,
          type: QuestionnaireType.Survey
        })
        if (surveyErr) throw surveyErr
        if (!surveyRes?.data?.code) throw new Error('创建题目问卷失败')
        questionnaireCode = surveyRes.data.code
        questionnaireVersion = surveyRes.data.version
      } else {
        const [surveyErr, surveyRes] = await api.updateSurvey({
          questionsheetid: questionnaireCode,
          title: this.title,
          desc: this.desc,
          type: QuestionnaireType.Survey
        })
        if (surveyErr) throw surveyErr
        questionnaireVersion = surveyRes?.data?.version
      }

      if (!this.modelCode) {
        const [modelErr, modelRes] = await assessmentModelApi.createAssessmentModel({
          title: this.title,
          description: this.desc,
          kind: 'personality',
          sub_kind: this.subKind,
          algorithm: this.algorithm,
          questionnaire_code: questionnaireCode,
          questionnaire_version: questionnaireVersion,
          category: this.category || undefined,
          tags: this.tags
        })
        if (modelErr) throw modelErr
        if (!modelRes?.data?.code) throw new Error('创建人格测评失败')
        runInAction(() => {
          this.modelCode = modelRes.data.code
          this.status = modelRes.data.status
        })
      } else {
        const [infoErr, infoRes] = await assessmentModelApi.updateAssessmentModelBasicInfo(this.modelCode, {
          title: this.title,
          description: this.desc,
          sub_kind: this.subKind,
          algorithm: this.algorithm,
          category: this.category || undefined,
          tags: this.tags
        })
        if (infoErr) throw infoErr

        const [bindingErr] = await assessmentModelApi.updateAssessmentModelQuestionnaire(this.modelCode, {
          questionnaire_code: questionnaireCode,
          questionnaire_version: questionnaireVersion
        })
        if (bindingErr) throw bindingErr

        if (infoRes?.data) {
          runInAction(() => {
            this.status = infoRes.data.status
          })
        }
      }

      runInAction(() => {
        this.id = questionnaireCode
        this.definition.payload.questionnaire_binding = {
          questionnaire_code: questionnaireCode,
          questionnaire_version: questionnaireVersion
        }
        this.currentStep = 'edit-questions'
      })

      return this.modelCode
    },

    async saveQuestionList(options: { persist?: boolean } = {}) {
      const { persist = false } = options
      if (!this.id) throw new Error('题目问卷编码不能为空')
      if (persist) {
        const [err] = await surveyApi.saveSurveyQuestions(this.id, this.questions, this.showControllers)
        if (err) throw err
      }
      runInAction(() => {
        if (this.currentStep === 'edit-questions') this.currentStep = 'set-routing'
      })
    },

    async saveDefinition() {
      if (!this.modelCode) throw new Error('人格测评编码不能为空')
      const nextDefinition: AssessmentModelDefinition<PersonalityPayloadV1> = {
        ...this.definition,
        kind: 'personality',
        sub_kind: this.subKind,
        algorithm: this.algorithm,
        payload_format: 'personality_payload_v1',
        payload: {
          ...this.definition.payload,
          questionnaire_binding: {
            questionnaire_code: this.id,
            questionnaire_version: this.definition.payload.questionnaire_binding.questionnaire_version
          }
        }
      }
      const [err, res] = await assessmentModelApi.saveAssessmentModelDefinition(this.modelCode, nextDefinition)
      if (err) throw err
      runInAction(() => {
        this.definition = (res?.data || nextDefinition) as AssessmentModelDefinition<PersonalityPayloadV1>
        this.currentStep = 'publish'
      })
    },

    async validateForPublish() {
      if (!this.modelCode) throw new Error('人格测评编码不能为空')
      const [err, res] = await assessmentModelApi.validateAssessmentModel(this.modelCode)
      if (err) throw err
      return res?.data || { passed: false, issues: [{ field: 'unknown', message: '后端未返回校验结果' }] }
    },

    async publish() {
      if (!this.modelCode) throw new Error('人格测评编码不能为空')
      if (this.id) {
        const [questionErr] = await surveyApi.saveSurveyQuestions(this.id, this.questions, this.showControllers)
        if (questionErr) throw questionErr
      }
      await this.saveDefinition()
      const validation = await this.validateForPublish()
      if (!validation.passed) {
        throw Object.assign(new Error('人格测评校验失败'), { validation })
      }
      const [err, res] = await assessmentModelApi.publishAssessmentModel(this.modelCode)
      if (err) throw err
      runInAction(() => {
        this.status = res?.data?.status || 'published'
        this.currentStep = 'publish'
      })
      this.clearLocalStorage()
    },

    async unpublish() {
      if (!this.modelCode) throw new Error('人格测评编码不能为空')
      const [err, res] = await assessmentModelApi.unpublishAssessmentModel(this.modelCode)
      if (err) throw err
      runInAction(() => {
        this.status = res?.data?.status || 'draft'
      })
    },

    setDefinitionPayload(payload: PersonalityPayloadV1) {
      this.definition = {
        ...this.definition,
        payload
      }
    },

    setCurrentCode(code: string) {
      this.currentCode = code
    },

    changeQuestionPosition(oldIndex: number, newIndex: number) {
      this.questions.splice(newIndex, 0, this.questions.splice(oldIndex, 1)[0])
    },

    getQuestionTitleByCode(code: string) {
      const question = this.questions.find((item) => item.code === code)
      return question?.title || ''
    },

    getQuestionOptionContent(questionCode: string, optionCode: string) {
      const question = this.questions.find((item) => item.code === questionCode) as IRadioQuestion | undefined
      const option = question?.options?.find((item) => item.code === optionCode)
      return option?.content || ''
    },

    getQuestion(code: string) {
      const index = this.questions.findIndex((item) => item.code === code)
      return {
        question: this.questions[index],
        index
      }
    },

    setShowControllers(list: Array<{ code: string; show_controller: IQuestionShowController }>) {
      this.showControllers = list
    },

    upsertShowController(code: string, show_controller: IQuestionShowController) {
      const index = this.showControllers.findIndex((item) => item.code === code)
      if (index > -1) {
        this.showControllers[index] = { code, show_controller }
      } else {
        this.showControllers.push({ code, show_controller })
      }
      this.deletedShowControllerCodes = this.deletedShowControllerCodes.filter((item) => item !== code)
    },

    deleteShowController(code: string) {
      this.showControllers = this.showControllers.filter((item) => item.code !== code)
      if (!this.deletedShowControllerCodes.includes(code)) {
        this.deletedShowControllerCodes.push(code)
      }
    },

    getShowController(code: string) {
      return this.showControllers.find((item) => item.code === code)
    },

    addQuestion(question: IQuestion) {
      this.questions.push(question)
      this.currentCode = question.code
    },

    addQuestionByPosition(question: IQuestion, index: number) {
      this.questions.splice(index, 0, question)
      this.currentCode = question.code
    },

    deleteQuestion() {
      if (this.currentIndex >= 0) {
        this.questions.splice(this.currentIndex, 1)
      }
      this.currentCode = ''
    },

    updateQuestionDispatch(type: IQuestionKeys, payload: any) {
      switch (type) {
      case 'title':
        this.updateQuestionTitle(payload.value)
        break
      case 'tips':
        this.updateQuestionTips(payload.value)
        break
      case 'placeholder':
        this.updateQuestionPlaceholder(payload.value)
        break
      case 'format':
        this.updateQuestionFormat(payload.value)
        break
      case 'left_desc':
        this.updateQuestionLeftDesc(payload.desc)
        break
      case 'right_desc':
        this.updateQuestionRightDesc(payload.desc)
        break
      case 'option':
        this.updateQuestionOptionDispatch(payload.type, { index: payload.index, value: payload.value })
        break
      case 'options':
        this.updateQuestionOptions(payload.options)
        break
      case 'validate':
        this.updateQuestionValidate(payload.key, payload.value)
        break
      case 'formula':
        this.updateQuestionFormula(payload.value)
        break
      default:
        break
      }
    },

    updateQuestionOptionDispatch(type: IOptionKeys, payload: any) {
      switch (type) {
      case 'allow_extend_text':
        this.updateQuestionOption('allow_extend_text', payload.index, payload.value)
        break
      case 'extend_content':
        this.updateQuestionOption('extend_content', payload.index, payload.value)
        break
      case 'extend_placeholder':
        this.updateQuestionOption('extend_placeholder', payload.index, payload.value)
        break
      case 'score':
        this.updateQuestionOption('score', payload.index, payload.value)
        break
      case 'content':
        this.updateQuestionOption('content', payload.index, payload.value)
        break
      case 'image':
        this.updateQuestionOption('img_url', payload.index, payload.value)
        break
      case 'add':
        this.addQuestionOption(payload.value)
        break
      case 'delete':
        this.deleteQuestionOption(payload.index)
        break
      default:
        break
      }
    },

    updateQuestionOptions(options: IScoreRadioOption[]) {
      (this.questions[this.currentIndex] as IScoreRadioQuestion).options = options
    },

    updateQuestionTitle(value: string) {
      this.questions[this.currentIndex].title = value
    },

    updateQuestionTips(value: string) {
      this.questions[this.currentIndex].tips = value
    },

    updateQuestionPlaceholder(value: string) {
      (this.questions[this.currentIndex] as ITextQuestion).placeholder = value
    },

    updateQuestionFormat(value: string) {
      (this.questions[this.currentIndex] as IDateQuestion).format = value
    },

    updateQuestionLeftDesc(value: string) {
      (this.questions[this.currentIndex] as IScoreRadioQuestion).left_desc = value
    },

    updateQuestionRightDesc(value: string) {
      (this.questions[this.currentIndex] as IScoreRadioQuestion).right_desc = value
    },

    updateQuestionValidate(key: keyof IValidateRules, value: any) {
      const question = this.questions[this.currentIndex] as any
      question.validate_rules = question.validate_rules || {}
      if (key === 'min_length' && value > 0) {
        question.validate_rules.required = true
      }
      question.validate_rules[key] = value
    },

    updateQuestionFormula(value: 'sum' | 'svg' | 'max') {
      (this.questions[this.currentIndex] as ICheckBoxQuestion).calc_rule.formula = value
    },

    updateQuestionOption(key: string, index: number, value: unknown) {
      (this.questions[this.currentIndex] as any).options[index][key] = value
    },

    addQuestionOption(item: IRadioOption) {
      const options = (this.questions[this.currentIndex] as any).options
      if (options[options.length - 1]?.is_other) {
        options.splice(options.length - 1, 0, item)
      } else {
        options.push(item)
      }
    },

    deleteQuestionOption(index: number) {
      (this.questions[this.currentIndex] as any).options.splice(index, 1)
    }
  },
  {
    id: observable,
    modelCode: observable,
    title: observable,
    desc: observable,
    category: observable,
    tags: observable,
    algorithm: observable,
    subKind: observable,
    status: observable,
    questions: observable,
    showControllers: observable,
    deletedShowControllerCodes: observable,
    definition: observable,
    currentCode: observable,
    currentStep: observable,
    payload: computed,
    currentQuestion: computed,
    currentIndex: computed,
    isPublished: computed,
    initPersonality: action,
    setCurrentStep: action,
    nextStep: action,
    saveToLocalStorage: action,
    loadFromLocalStorage: action,
    clearLocalStorage: action,
    setDefinitionPayload: action,
    setCurrentCode: action,
    changeQuestionPosition: action,
    setShowControllers: action,
    upsertShowController: action,
    deleteShowController: action,
    addQuestion: action,
    addQuestionByPosition: action,
    deleteQuestion: action,
    updateQuestionDispatch: action
  }
)

let saveTimer: NodeJS.Timeout | null = null
reaction(
  () => ({
    modelCode: personalityModelStore.modelCode,
    id: personalityModelStore.id,
    title: personalityModelStore.title,
    desc: personalityModelStore.desc,
    category: personalityModelStore.category,
    tags: JSON.stringify(personalityModelStore.tags),
    questions: JSON.stringify(personalityModelStore.questions),
    showControllers: JSON.stringify(personalityModelStore.showControllers),
    definition: JSON.stringify(personalityModelStore.definition),
    currentStep: personalityModelStore.currentStep
  }),
  (data) => {
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      if (data.modelCode || data.id || data.title || data.questions !== '[]') {
        personalityModelStore.saveToLocalStorage()
      }
    }, 500)
  },
  { fireImmediately: false }
)
