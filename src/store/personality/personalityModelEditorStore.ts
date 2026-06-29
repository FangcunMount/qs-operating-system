import { action, makeObservable, observable, runInAction } from 'mobx'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { api } from '@/api'
import { surveyApi } from '@/api/path/survey'
import { QuestionnaireType } from '@/constants/questionnaireType'
import type { AssessmentModelStatus, AssessmentModelSubKind } from '@/models/assessmentModel'
import { personalityDraftStorage, QuestionnaireBindingStrategy } from './personalityDraftStorage'

export class PersonalityModelEditorStore {
  modelCode = ''
  title = ''
  desc = ''
  category = ''
  tags: string[] = []
  algorithm = 'mbti'
  subKind: AssessmentModelSubKind | string = 'typology'
  status: AssessmentModelStatus = 'draft'
  questionnaireCode = ''
  questionnaireVersion?: string
  questionnaireStrategy: QuestionnaireBindingStrategy = 'create'
  bindQuestionnaireCode = ''
  customModelCode = ''

  constructor() {
    makeObservable(this, {
      modelCode: observable,
      title: observable,
      desc: observable,
      category: observable,
      tags: observable,
      algorithm: observable,
      subKind: observable,
      status: observable,
      questionnaireCode: observable,
      questionnaireVersion: observable,
      questionnaireStrategy: observable,
      bindQuestionnaireCode: observable,
      customModelCode: observable,
      reset: action,
      applyModel: action,
      setQuestionnaireStrategy: action
    })
  }

  get isArchived(): boolean {
    return this.status === 'archived'
  }

  get isPublished(): boolean {
    return this.status === 'published'
  }

  get canEdit(): boolean {
    return this.status !== 'archived'
  }

  get canPublish(): boolean {
    return this.status === 'draft' || this.status === 'published'
  }

  reset() {
    this.modelCode = ''
    this.title = ''
    this.desc = ''
    this.category = ''
    this.tags = []
    this.algorithm = 'mbti'
    this.subKind = 'typology'
    this.status = 'draft'
    this.questionnaireCode = ''
    this.questionnaireVersion = undefined
    this.questionnaireStrategy = 'create'
    this.bindQuestionnaireCode = ''
    this.customModelCode = ''
  }

  applyModel(model: {
    code: string
    title: string
    description?: string
    category?: string
    tags?: string[]
    algorithm?: string
    sub_kind?: string
    status: AssessmentModelStatus
    questionnaire_code?: string
    questionnaire_version?: string
  }) {
    this.modelCode = model.code
    this.title = model.title
    this.desc = model.description || ''
    this.category = model.category || ''
    this.tags = model.tags || []
    this.algorithm = model.algorithm || 'mbti'
    this.subKind = model.sub_kind || 'typology'
    this.status = model.status
    this.questionnaireCode = model.questionnaire_code || ''
    this.questionnaireVersion = model.questionnaire_version
  }

  setQuestionnaireStrategy(strategy: QuestionnaireBindingStrategy) {
    this.questionnaireStrategy = strategy
  }

  restoreDraft() {
    const draft = personalityDraftStorage.load(this.modelCode || 'new')
    if (!draft) return false
    runInAction(() => {
      this.modelCode = draft.modelCode || ''
      this.title = draft.title || ''
      this.desc = draft.desc || ''
      this.category = draft.category || ''
      this.tags = draft.tags || []
      this.algorithm = draft.algorithm || 'mbti'
      this.subKind = draft.subKind || 'typology'
      this.status = draft.status || 'draft'
      this.questionnaireCode = draft.questionnaireCode || ''
      this.questionnaireVersion = draft.questionnaireVersion
      this.questionnaireStrategy = draft.questionnaireStrategy || 'create'
      this.bindQuestionnaireCode = draft.bindQuestionnaireCode || ''
    })
    return true
  }

  persistDraft(currentStep: string) {
    personalityDraftStorage.save(this.modelCode || 'new', {
      modelCode: this.modelCode,
      title: this.title,
      desc: this.desc,
      category: this.category,
      tags: this.tags,
      algorithm: this.algorithm,
      subKind: this.subKind,
      status: this.status,
      questionnaireCode: this.questionnaireCode,
      questionnaireVersion: this.questionnaireVersion,
      questionnaireStrategy: this.questionnaireStrategy,
      bindQuestionnaireCode: this.bindQuestionnaireCode,
      currentStep,
      timestamp: Date.now()
    })
  }

  async init(modelCode?: string) {
    if (!modelCode || modelCode === 'new') {
      const restored = this.restoreDraft()
      if (!restored) this.reset()
      return
    }

    const restored = this.restoreDraft()
    if (restored && this.modelCode === modelCode && this.title) return

    const [modelErr, modelRes] = await assessmentModelApi.getAssessmentModel(modelCode)
    if (modelErr) throw modelErr
    const model = modelRes?.data
    if (!model) throw new Error('人格测评不存在')
    runInAction(() => this.applyModel(model))
  }

  ensureQuestionnaireVersion(version?: string): string {
    if (!version) {
      throw new Error('绑定问卷缺少版本号，请先选择带版本的问卷')
    }
    return version
  }

  async resolveQuestionnaireCode(): Promise<{ code: string; version: string }> {
    if (this.questionnaireStrategy === 'bind' && this.bindQuestionnaireCode) {
      const [err, res] = await surveyApi.getSurvey(this.bindQuestionnaireCode)
      if (err) throw err
      return {
        code: this.bindQuestionnaireCode,
        version: this.ensureQuestionnaireVersion(res?.data?.version)
      }
    }

    if (this.questionnaireCode) {
      const [surveyErr, surveyRes] = await api.updateSurvey({
        questionsheetid: this.questionnaireCode,
        title: this.title,
        desc: this.desc,
        type: QuestionnaireType.Survey
      })
      if (surveyErr) throw surveyErr
      return {
        code: this.questionnaireCode,
        version: this.ensureQuestionnaireVersion(surveyRes?.data?.version)
      }
    }

    const [surveyErr, surveyRes] = await api.createSurvey({
      title: this.title,
      desc: this.desc,
      type: QuestionnaireType.Survey
    })
    if (surveyErr) throw surveyErr
    if (!surveyRes?.data?.code) throw new Error('创建题目问卷失败')
    return {
      code: surveyRes.data.code,
      version: this.ensureQuestionnaireVersion(surveyRes.data.version)
    }
  }

  async saveBasicInfo(): Promise<string> {
    const { code: questionnaireCode, version: questionnaireVersion } = await this.resolveQuestionnaireCode()

    if (!this.modelCode) {
      const [modelErr, modelRes] = await assessmentModelApi.createAssessmentModel({
        code: this.customModelCode || undefined,
        title: this.title,
        description: this.desc,
        kind: 'personality',
        sub_kind: this.subKind as AssessmentModelSubKind,
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
      this.questionnaireCode = questionnaireCode
      this.questionnaireVersion = questionnaireVersion
    })

    return this.modelCode
  }

  async bindQuestionnaire(code: string, version?: string) {
    if (!this.modelCode) throw new Error('人格测评编码不能为空')
    const questionnaireVersion = this.ensureQuestionnaireVersion(version)
    const [err] = await assessmentModelApi.updateAssessmentModelQuestionnaire(this.modelCode, {
      questionnaire_code: code,
      questionnaire_version: questionnaireVersion
    })
    if (err) throw err
    runInAction(() => {
      this.questionnaireCode = code
      this.questionnaireVersion = questionnaireVersion
    })
  }
}

export const personalityModelEditorStore = new PersonalityModelEditorStore()
