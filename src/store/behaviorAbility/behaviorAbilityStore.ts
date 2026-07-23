import { action, computed, makeObservable, observable, runInAction } from 'mobx'
import { api } from '@/api'
import { assessmentModelApi } from '@/api/path/assessmentModel'
import { surveyApi } from '@/api/path/survey'
import { QuestionnaireType } from '@/constants/questionnaireType'
import { getBehaviorAbilityProfile, isBehaviorAbilityModel } from '@/constants/behaviorAbility'
import type { BehaviorAbilityAlgorithm, BehaviorAbilityModelProfile } from '@/constants/behaviorAbility'
import { isBehaviorAbilityPublishingEnabled } from '@/constants/behaviorAbilityFeature'
import type {
  AssessmentModelDetail,
  AssessmentModelPreviewReportRequest,
  AssessmentModelPreviewReportResponse,
  AssessmentModelStatus,
  AssessmentModelValidationIssue,
  AssessmentModelValidationResult
} from '@/models/assessmentModel'
import { createEmptyDefinitionV2 } from '@/models/definitionV2'
import type { DefinitionV2 } from '@/models/definitionV2'
import {
  applyBehaviorAbilityDefinition,
  isNormReferenceMissing,
  projectBehaviorAbilityDefinition
} from '@/models/behaviorAbilityDefinitionV2.mapper'
import type { BehaviorAbilityDefinitionForm } from '@/models/behaviorAbilityDefinitionV2.mapper'
import { validateBehaviorAbilityDefinition } from '@/models/behaviorAbilityDefinitionValidation'
import type { IQuestion, IQuestionShowController } from '@/models/question'
import type { IOptionKeys } from '@/models/question'
import { ModelQuestionnaireStore } from '@/store/personality/personalityQuestionnaireStore'
import { ModelCatalogPublishStore } from '@/store/personality/personalityPublishStore'

export type BehaviorAbilityStep = 'create' | 'edit-questions' | 'set-routing' | 'edit-definition' | 'publish'
export type QuestionnaireStrategy = 'create' | 'bind'

const requireModelCode = (code: string): string => {
  if (!code) throw new Error('行为能力测评编码不能为空')
  return code
}

const isPublishedQuestionnaire = (status?: string): boolean => status === 'published'

/** Owns a behavior-ability editing session. It deliberately uses its own
 * questionnaire and publication instances rather than personality singletons. */
export class BehaviorAbilityStore {
  modelCode = ''
  title = ''
  description = ''
  category = ''
  tags: string[] = []
  profile: BehaviorAbilityModelProfile | null = null
  status: AssessmentModelStatus = 'draft'
  questionnaireCode = ''
  questionnaireVersion?: string
  questionnaireStrategy: QuestionnaireStrategy = 'create'
  bindQuestionnaireCode = ''
  customModelCode = ''
  currentStep: BehaviorAbilityStep = 'create'
  definition: DefinitionV2 = createEmptyDefinitionV2()
  definitionForm: BehaviorAbilityDefinitionForm = projectBehaviorAbilityDefinition(this.definition, 'brief2')
  validationIssues: AssessmentModelValidationIssue[] = []
  readonly questionnaire = new ModelQuestionnaireStore()
  readonly publishState = new ModelCatalogPublishStore()

  constructor() {
    makeObservable(this, {
      modelCode: observable,
      title: observable,
      description: observable,
      category: observable,
      tags: observable,
      profile: observable,
      status: observable,
      questionnaireCode: observable,
      questionnaireVersion: observable,
      questionnaireStrategy: observable,
      bindQuestionnaireCode: observable,
      customModelCode: observable,
      currentStep: observable,
      definition: observable,
      definitionForm: observable,
      validationIssues: observable,
      questions: computed,
      showControllers: computed,
      deletedShowControllerCodes: computed,
      currentCode: computed,
      id: computed,
      currentQuestion: computed,
      currentIndex: computed,
      algorithm: computed,
      kind: computed,
      isArchived: computed,
      canEdit: computed,
      canPublish: computed,
      reset: action,
      applyModel: action,
      setProfile: action,
      setDefinition: action,
      updateDefinitionForm: action,
      setCurrentStep: action
    })
  }

  get algorithm(): BehaviorAbilityAlgorithm {
    return this.profile?.algorithm || 'brief2'
  }
  get kind(): string {
    return this.profile?.kind || 'behavioral_rating'
  }
  get isArchived(): boolean {
    return this.status === 'archived'
  }
  get canEdit(): boolean {
    return !this.isArchived
  }
  get canPublish(): boolean {
    return isBehaviorAbilityPublishingEnabled() && this.canEdit
  }
  get questions(): IQuestion[] {
    return this.questionnaire.questions
  }
  get showControllers(): Array<{ code: string; show_controller: IQuestionShowController }> {
    return this.questionnaire.showControllers
  }
  get deletedShowControllerCodes(): string[] {
    return this.questionnaire.deletedShowControllerCodes
  }
  get currentCode(): string {
    return this.questionnaire.currentCode
  }
  get id(): string {
    return this.questionnaireCode
  }
  get currentQuestion(): IQuestion | null {
    return this.questionnaire.currentQuestion
  }
  get currentIndex(): number {
    return this.questionnaire.currentIndex
  }

  reset(): void {
    this.modelCode = ''
    this.title = ''
    this.description = ''
    this.category = ''
    this.tags = []
    this.profile = null
    this.status = 'draft'
    this.questionnaireCode = ''
    this.questionnaireVersion = undefined
    this.questionnaireStrategy = 'create'
    this.bindQuestionnaireCode = ''
    this.customModelCode = ''
    this.currentStep = 'create'
    this.questionnaire.reset()
    this.publishState.reset()
    this.setDefinition(createEmptyDefinitionV2())
  }

  setProfile(algorithm: BehaviorAbilityAlgorithm): void {
    const profile = getBehaviorAbilityProfile(algorithm)
    if (!profile) throw new Error(`不支持的行为能力算法：${algorithm}`)
    if (this.modelCode && this.profile && this.profile.algorithm !== profile.algorithm) {
      throw new Error('已创建模型不可切换算法')
    }
    this.profile = profile
    this.setDefinition(this.definition)
  }

  applyModel(model: AssessmentModelDetail): void {
    const profile = getBehaviorAbilityProfile(model.algorithm)
	if (!profile || !isBehaviorAbilityModel(model)) {
		throw new Error('该模型不属于行为能力模型')
    }
    this.modelCode = model.code
    this.title = model.title
    this.description = model.description || ''
    this.category = model.category || ''
    this.tags = model.tags || []
    this.profile = profile
    this.status = model.status
    this.questionnaireCode = model.questionnaire_code || ''
    this.questionnaireVersion = model.questionnaire_version
  }

  setDefinition(definition: DefinitionV2): void {
    this.definition = definition || createEmptyDefinitionV2()
    this.definitionForm = projectBehaviorAbilityDefinition(this.definition, this.algorithm)
  }

  updateDefinitionForm(next: BehaviorAbilityDefinitionForm): void {
    this.definitionForm = next
    this.definition = applyBehaviorAbilityDefinition(this.definition, this.algorithm, next)
  }

  setCurrentStep(step: BehaviorAbilityStep): void {
    this.currentStep = step
  }

  async init(modelCode?: string): Promise<void> {
    if (!modelCode || modelCode === 'new') {
      this.reset()
      return
    }
    const [err, res] = await assessmentModelApi.getAssessmentModel(modelCode)
    if (err || !res?.data) throw err || new Error('行为能力测评不存在')
    runInAction(() => this.applyModel(res.data))
    if (this.questionnaireCode) await this.questionnaire.loadFromApi(this.questionnaireCode)
    await this.loadDefinition()
  }

  private async resolveQuestionnaire(): Promise<{ code: string; version: string }> {
    if (this.questionnaireStrategy === 'bind' && this.bindQuestionnaireCode) {
      const [err, res] = await surveyApi.getSurvey(this.bindQuestionnaireCode)
      if (err || !res?.data) throw err || new Error('读取绑定问卷失败')
      if (!isPublishedQuestionnaire(res.data.status)) throw new Error('仅支持绑定已发布问卷')
      if (!res.data.version) throw new Error('绑定问卷缺少版本号')
      return { code: res.data.code, version: res.data.version }
    }
    if (this.questionnaireCode) {
      const [err, res] = await api.updateSurvey({
        questionsheetid: this.questionnaireCode,
        title: this.title,
        desc: this.description,
        type: QuestionnaireType.Survey
      })
      if (err || !res?.data?.version) throw err || new Error('更新题目问卷失败')
      return { code: this.questionnaireCode, version: res.data.version }
    }
    const [err, res] = await api.createSurvey({
      title: this.title,
      desc: this.description,
      type: QuestionnaireType.Survey
    })
    if (err || !res?.data?.code || !res.data.version) throw err || new Error('创建题目问卷失败')
    return { code: res.data.code, version: res.data.version }
  }

  async saveBasicInfo(): Promise<string> {
    if (!this.profile) throw new Error('请选择 BRIEF-2 或 SPM')
    const previousQuestionnaireCode = this.questionnaireCode
    const binding = await this.resolveQuestionnaire()
    if (!this.modelCode) {
      const [err, res] = await assessmentModelApi.createAssessmentModel({
        code: this.customModelCode || undefined,
        title: this.title,
        description: this.description,
        kind: this.profile.kind,
		algorithm: this.profile.algorithm,
        questionnaire_code: binding.code,
        questionnaire_version: binding.version,
        category: this.category || undefined,
        tags: this.tags
      })
      const createdModel = res?.data
      if (err || !createdModel?.code) throw err || new Error('创建行为能力测评失败')
      runInAction(() => {
        this.modelCode = createdModel.code
        this.status = createdModel.status
      })
    } else {
      const [err, res] = await assessmentModelApi.updateAssessmentModelBasicInfo(this.modelCode, {
        title: this.title,
        description: this.description,
		algorithm: this.profile.algorithm,
        category: this.category || undefined,
        tags: this.tags
      })
      if (err) throw err
      if (previousQuestionnaireCode !== binding.code) {
        const [bindErr] = await assessmentModelApi.updateAssessmentModelQuestionnaire(this.modelCode, {
          questionnaire_code: binding.code,
          questionnaire_version: binding.version
        })
        if (bindErr) throw bindErr
      }
      const updatedModel = res?.data
      if (updatedModel?.status)
        runInAction(() => {
          this.status = updatedModel.status
        })
    }
    runInAction(() => {
      this.questionnaireCode = binding.code
      this.questionnaireVersion = binding.version
      this.currentStep = 'edit-questions'
    })
    return this.modelCode
  }

  async loadDefinition(): Promise<void> {
    const code = requireModelCode(this.modelCode)
    const [err, res] = await assessmentModelApi.getAssessmentModelDefinition(code)
    if (err || !res?.data) {
      runInAction(() => this.setDefinition(createEmptyDefinitionV2()))
      return
    }
    runInAction(() => this.setDefinition(res.data))
  }

  validateDefinition(): AssessmentModelValidationIssue[] {
    const issues = validateBehaviorAbilityDefinition(this.definition, this.algorithm, this.questions)
    if (isBehaviorAbilityPublishingEnabled() && isNormReferenceMissing(this.definitionForm)) {
      issues.push({ field: 'Calibration.NormRefs', code: 'norm_ref.required', message: '正式发布前必须选择常模表' })
    }
    this.validationIssues = issues
    return issues
  }

  async saveDefinition(): Promise<void> {
    const issues = this.validateDefinition()
    if (issues.some((item) => item.level !== 'warning')) {
      throw new Error(issues[0]?.message || '模型定义校验失败')
    }
    const [err, res] = await assessmentModelApi.saveAssessmentModelDefinition(requireModelCode(this.modelCode), this.definition)
    if (err) throw err
    if (res?.data) runInAction(() => this.setDefinition(res.data))
    runInAction(() => {
      this.currentStep = 'publish'
    })
  }

  async saveQuestions(): Promise<void> {
    if (!this.questions.length) throw new Error('请至少添加一个问题')
    await this.questionnaire.saveQuestions(this.questionnaireCode, true)
    runInAction(() => {
      this.currentStep = 'set-routing'
    })
  }

  async saveRouting(): Promise<void> {
    await this.questionnaire.saveRouting(this.questionnaireCode)
    runInAction(() => {
      this.currentStep = 'edit-definition'
    })
  }

  async validateForPublish(): Promise<AssessmentModelValidationResult> {
    return this.publishState.validate(requireModelCode(this.modelCode))
  }

  async preview(request: AssessmentModelPreviewReportRequest): Promise<AssessmentModelPreviewReportResponse | null> {
    return this.publishState.runPreviewReport(requireModelCode(this.modelCode), request)
  }

  async publish(): Promise<void> {
    if (!isBehaviorAbilityPublishingEnabled()) {
      throw new Error('常模表服务尚未部署，行为能力测评暂不可正式发布')
    }
    const code = requireModelCode(this.modelCode)
    await this.questionnaire.saveQuestions(this.questionnaireCode, true)
    await this.saveDefinition()
    const validation = await this.validateForPublish()
    if (!validation.passed) throw new Error('服务端模型校验未通过')
    const result = await this.publishState.publish(code)
    if (result?.model_status)
      runInAction(() => {
        this.status = result.model_status as AssessmentModelStatus
        this.questionnaireCode = result.questionnaire_code
        this.questionnaireVersion = result.questionnaire_version
      })
  }

  async archive(): Promise<void> {
    const result = await this.publishState.archive(requireModelCode(this.modelCode))
    if (result?.model_status)
      runInAction(() => {
        this.status = result.model_status as AssessmentModelStatus
      })
  }

  // Delegate the existing generic questionnaire editor contract.
  setCurrentCode = (code: string): void => this.questionnaire.setCurrentCode(code)
  setShowControllers = (list: Array<{ code: string; show_controller: IQuestionShowController }>): void => this.questionnaire.setShowControllers(list)
  upsertShowController = (code: string, controller: IQuestionShowController): void => this.questionnaire.upsertShowController(code, controller)
  deleteShowController = (code: string): void => this.questionnaire.deleteShowController(code)
  getShowController = (code: string): ReturnType<ModelQuestionnaireStore['getShowController']> => this.questionnaire.getShowController(code)
  addQuestion = (question: IQuestion): void => this.questionnaire.addQuestion(question)
  addQuestionByPosition = (question: IQuestion, index: number): void => this.questionnaire.addQuestionByPosition(question, index)
  deleteQuestion = (): void => this.questionnaire.deleteQuestion()
  changeQuestionPosition = (oldIndex: number, newIndex: number): void => this.questionnaire.changeQuestionPosition(oldIndex, newIndex)
  updateQuestionDispatch = (...args: Parameters<ModelQuestionnaireStore['updateQuestionDispatch']>): void =>
    this.questionnaire.updateQuestionDispatch(...args)
  updateQuestionOptionDispatch = (type: IOptionKeys, payload: Record<string, unknown>): void =>
    this.questionnaire.updateQuestionOptionDispatch(type, payload)
  getQuestionTitleByCode = (code: string): string => this.questionnaire.getQuestionTitleByCode(code)
  getQuestionOptionContent = (questionCode: string, optionCode: string): string =>
    this.questionnaire.getQuestionOptionContent(questionCode, optionCode)
  getQuestion = (code: string): ReturnType<ModelQuestionnaireStore['getQuestion']> => this.questionnaire.getQuestion(code)
}

export const behaviorAbilityStore = new BehaviorAbilityStore()
