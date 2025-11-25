import { makeObservable, observable, computed, action, runInAction, reaction } from 'mobx'
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
} from '../models/question'
import { IQuestionSheet } from '../models/questionSheet'
import { IFactor } from '../models/factor'
import { IQuestionShowController } from '@/models/question'
import { IFactorAnalysis, IMacroAnalysis, IInterpretation, IInterpret_rule } from '../models/analysis'
import { api } from '../api'
import { delShowController, postShowController } from '@/api/path/showController'

// 量表编辑步骤
export type ScaleStep = 'create' | 'edit-questions' | 'set-routing' | 'edit-factors' | 'set-interpretation' | 'publish'

// localStorage 键名
const STORAGE_KEY = 'scaleStore_data'
const STORAGE_VERSION = 'v1'

// 持久化的数据结构
interface PersistedScaleData {
  version: string
  id: string
  title: string
  desc: string
  img_url: string
  questions: IQuestion[]
  showControllers: Array<{ code: string; show_controller: IQuestionShowController }>
  deletedShowControllerCodes: string[]
  factors: IFactor[]
  macro_rule: IMacroAnalysis
  factor_rules: Array<IFactorAnalysis>
  currentCode: string
  currentFactorId: string
  currentStep: ScaleStep
  timestamp: number
}

const scaleInit: IQuestionSheet = {
  id: '',
  title: '',
  desc: '',
  img_url: '',
  questions: []
}

const initMacroRule: IMacroAnalysis = {
  max_score: 0,
  interpretation: []
}

/**
 * 量表 Store
 * 用于创建和编辑医学量表
 * 编辑流程：创建量表 -> 编辑问题 -> 设置题目路由 -> 编辑因子 -> 设置解读规则 -> 发布
 */
export const scaleStore = makeObservable(
  {
    // 基本信息
    id: scaleInit.id,
    title: scaleInit.title,
    desc: scaleInit.desc,
    img_url: scaleInit.img_url,
    questions: scaleInit.questions,
    // 题目显隐规则（前端暂存）
    showControllers: [] as { code: string; show_controller: IQuestionShowController }[],
    deletedShowControllerCodes: [] as string[],
    
    // 因子列表（量表特有）
    factors: [] as IFactor[],
    
    // 解读规则（量表特有）
    macro_rule: initMacroRule,
    factor_rules: [] as Array<IFactorAnalysis>,
    
    // 当前编辑的问题
    currentCode: '',
    
    // 当前编辑的因子
    currentFactorId: '',
    
    // 当前编辑步骤
    currentStep: 'create' as ScaleStep,
    
    // 计算属性
    get currentQuestion() {
      if (this.currentCode) {
        return this.questions.filter((v: IQuestion) => v.code === this.currentCode)[0]
      }
      return null
    },
    
    get currentIndex() {
      return this.questions.findIndex((v: IQuestion) => v.code === this.currentCode)
    },
    
    get currentFactor() {
      if (this.currentFactorId) {
        return this.factors.find((v: IFactor) => v.code === this.currentFactorId)
      }
      return null
    },
    
    get isStepCompleted() {
      return {
        create: !!this.id && !!this.title,
        'edit-questions': this.questions.length > 0,
        'set-routing': true, // 路由设置是可选的
        'edit-factors': this.factors.length > 0,
        'set-interpretation': true, // 解读规则是可选的
        publish: false // 发布后完成
      }
    },

    // 保存到 localStorage
    saveToLocalStorage() {
      try {
        const data: PersistedScaleData = {
          version: STORAGE_VERSION,
          id: this.id || '',
          title: this.title,
          desc: this.desc,
          img_url: this.img_url,
          questions: JSON.parse(JSON.stringify(this.questions)),
          showControllers: JSON.parse(JSON.stringify(this.showControllers)),
          deletedShowControllerCodes: [...this.deletedShowControllerCodes],
          factors: JSON.parse(JSON.stringify(this.factors)),
          macro_rule: JSON.parse(JSON.stringify(this.macro_rule)),
          factor_rules: JSON.parse(JSON.stringify(this.factor_rules)),
          currentCode: this.currentCode,
          currentFactorId: this.currentFactorId,
          currentStep: this.currentStep,
          timestamp: Date.now()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        console.log('已保存到 localStorage, 题目数:', data.questions.length, '因子数:', data.factors.length)
      } catch (error) {
        console.error('保存到 localStorage 失败:', error)
      }
    },

    // 从 localStorage 加载
    loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const data: PersistedScaleData = JSON.parse(stored)
          // 检查版本号
          if (data.version === STORAGE_VERSION) {
            runInAction(() => {
              this.id = data.id
              this.title = data.title
              this.desc = data.desc
              this.img_url = data.img_url
              this.questions = data.questions || []
              this.showControllers = data.showControllers || []
              this.deletedShowControllerCodes = data.deletedShowControllerCodes || []
              this.factors = data.factors || []
              this.macro_rule = data.macro_rule || initMacroRule
              this.factor_rules = data.factor_rules || []
              this.currentCode = data.currentCode
              this.currentFactorId = data.currentFactorId
              this.currentStep = data.currentStep
            })
            console.log('从 localStorage 恢复数据:', {
              timestamp: new Date(data.timestamp),
              questionCount: data.questions?.length || 0,
              factorCount: data.factors?.length || 0
            })
            return true
          }
        }
      } catch (error) {
        console.error('从 localStorage 加载失败:', error)
      }
      return false
    },

    // 清除 localStorage
    clearLocalStorage() {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('清除 localStorage 失败:', error)
      }
    },

    // 调试：查看 localStorage 内容
    debugLocalStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          console.log('=== localStorage 数据 ===')
          console.log('ID:', data.id)
          console.log('标题:', data.title)
          console.log('题目数量:', data.questions?.length || 0)
          console.log('因子数量:', data.factors?.length || 0)
          console.log('显隐规则数量:', data.showControllers?.length || 0)
          console.log('当前步骤:', data.currentStep)
          console.log('保存时间:', new Date(data.timestamp))
          return data
        } else {
          console.log('localStorage 中没有数据')
          return null
        }
      } catch (error) {
        console.error('读取 localStorage 失败:', error)
        return null
      }
    },

    // 初始化
    initScale() {
      this.id = scaleInit.id
      this.title = scaleInit.title
      this.desc = scaleInit.desc
      this.img_url = scaleInit.img_url
      this.questions = scaleInit.questions
      this.showControllers = []
      this.deletedShowControllerCodes = []
      this.factors = []
      this.macro_rule = initMacroRule
      this.factor_rules = []
      this.currentCode = ''
      this.currentFactorId = ''
      this.currentStep = 'create'
      this.clearLocalStorage()
    },

    // 设置当前步骤
    setCurrentStep(step: ScaleStep) {
      this.currentStep = step
    },

    // 进入下一步
    nextStep() {
      const steps: ScaleStep[] = ['create', 'edit-questions', 'set-routing', 'edit-factors', 'set-interpretation', 'publish']
      const currentIndex = steps.indexOf(this.currentStep)
      if (currentIndex < steps.length - 1) {
        this.currentStep = steps[currentIndex + 1]
      }
    },

    // 返回上一步
    prevStep() {
      const steps: ScaleStep[] = ['create', 'edit-questions', 'set-routing', 'edit-factors', 'set-interpretation', 'publish']
      const currentIndex = steps.indexOf(this.currentStep)
      if (currentIndex > 0) {
        this.currentStep = steps[currentIndex - 1]
      }
    },

    // 问题位置调整
    changeQuestionPosition(oldIndex: number, newIndex: number) {
      this.questions.splice(newIndex, 0, this.questions.splice(oldIndex, 1)[0])
    },

    // 获取问题标题
    getQuestionTitleByCode(code: string) {
      const i = this.questions.findIndex((v) => v.code === code)
      return this.questions[i]?.title || ''
    },

    // 获取问题选项内容
    getQuestionOptionContent(questionCode: string, optionCode: string) {
      const q = this.questions[this.questions.findIndex((v) => v.code === questionCode)] as IRadioQuestion
      const i = q?.options?.findIndex((v) => v.code === optionCode)
      if (i > -1) {
        return q.options[i].content
      } else {
        return ''
      }
    },

    // 获取问题
    getQuestion(code: string) {
      const i = this.questions.findIndex((v) => v.code === code)
      return {
        question: this.questions[i],
        index: i
      }
    },

    // 设置当前编辑的问题
    setCurrentCode(code: string) {
      this.currentCode = code
    },

    // 设置量表基本信息
    setScale(v?: IQuestionSheet) {
      if (v) {
        this.id = v.id
        this.title = v.title
        this.desc = v.desc
        this.img_url = v.img_url
      }
    },

    // 设置量表题目列表
    setScaleQuestions(v: Array<IQuestion>) {
      this.questions = v
      if (v.length > 0) {
        this.currentCode = v[0].code
      }
    },

    // 显隐规则维护（本地暂存）
    setShowControllers(list: Array<{ code: string; show_controller: IQuestionShowController }>) {
      this.showControllers = list
    },

    upsertShowController(code: string, show_controller: IQuestionShowController) {
      const i = this.showControllers.findIndex((item) => item.code === code)
      if (i > -1) {
        this.showControllers[i] = { code, show_controller }
      } else {
        this.showControllers.push({ code, show_controller })
      }
      // 防止在删除列表中的旧记录影响后续发布
      this.deletedShowControllerCodes = this.deletedShowControllerCodes.filter((v) => v !== code)
    },

    deleteShowController(code: string) {
      this.showControllers = this.showControllers.filter((item) => item.code !== code)
      if (!this.deletedShowControllerCodes.includes(code)) {
        this.deletedShowControllerCodes.push(code)
      }
    },

    getShowController(code: string) {
      return this.showControllers.find((v) => v.code === code)
    },

    // 添加问题
    addQuestion(question: IQuestion) {
      this.questions.push(question)
      this.currentCode = question.code
    },

    // 在指定位置添加问题
    addQuestionByPosition(question: IQuestion, index: number) {
      this.questions.splice(index, 0, question)
      this.currentCode = question.code
    },

    // 删除当前问题
    deleteQuestion() {
      if (this.currentIndex >= 0) {
        this.questions.splice(this.currentIndex, 1)
      }
      this.currentCode = ''
    },

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ 因子相关方法 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    
    // 设置因子列表
    setFactors(factors: IFactor[]) {
      this.factors = factors
    },

    // 添加因子
    addFactor(factor: IFactor) {
      this.factors.push(factor)
    },

    // 删除因子
    deleteFactor(factorId: string) {
      const index = this.factors.findIndex((v) => v.code === factorId)
      if (index > -1) {
        this.factors.splice(index, 1)
      }
      if (this.currentFactorId === factorId) {
        this.currentFactorId = ''
      }
    },

    // 更新因子
    updateFactor(factorId: string, updates: Partial<IFactor>) {
      const index = this.factors.findIndex((v) => v.code === factorId)
      if (index > -1) {
        this.factors[index] = { ...this.factors[index], ...updates }
      }
    },

    // 设置当前编辑的因子
    setCurrentFactorId(factorId: string) {
      this.currentFactorId = factorId
    },

    // 因子位置调整
    changeFactorPosition(oldIndex: number, newIndex: number) {
      this.factors.splice(newIndex, 0, this.factors.splice(oldIndex, 1)[0])
    },

    // 获取因子
    getFactorById(factorId: string) {
      return this.factors.find((v) => v.code === factorId)
    },

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ 解读规则相关方法 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    
    // 初始化解读规则数据
    initAnalysisData(m: IMacroAnalysis | undefined, fs: Array<IFactorAnalysis>) {
      if (m) {
        this.macro_rule = m ?? initMacroRule
      }
      this.factor_rules = fs ?? []
    },

    // 设置解读规则数据
    setAnalysisData(macro: IMacroAnalysis, factors: Array<IFactorAnalysis>) {
      this.macro_rule = macro
      this.factor_rules = factors
    },

    // 获取因子规则在数组中的索引
    getFactorRuleIndexByCode(code: string) {
      return this.factor_rules.findIndex((v) => v.code === code)
    },

    // 修改宏观规则属性
    changeMacroRule(k: keyof IMacroAnalysis, v: any) {
      (this.macro_rule[k] as any) = v
    },

    // 修改宏观规则解读项
    changeMacroRuleInterpretation(i: number, v: IInterpretation) {
      this.macro_rule.interpretation[i] = v
    },

    // 添加宏观规则解读项
    addMacroRuleInterpretation() {
      this.macro_rule.interpretation.push({ start: '', end: '', content: '' })
    },

    // 删除宏观规则解读项
    delMacroRuleInterpretation(i: number) {
      this.macro_rule.interpretation.splice(i, 1)
    },

    // 修改因子规则属性
    changeFactorRulesItem(code: string, k: keyof IInterpret_rule, v: any) {
      const i = this.getFactorRuleIndexByCode(code);
      (this.factor_rules[i].interpret_rule[k] as any) = v
    },

    // 修改因子规则解读项
    changeFactorRulesInterpretation(code: string, i: number, v: IInterpretation) {
      const fi = this.getFactorRuleIndexByCode(code)
      this.factor_rules[fi].interpret_rule.interpretation[i] = v
    },

    // 添加因子规则解读项
    addFactorRulesInterpretation(code: string) {
      const fi = this.getFactorRuleIndexByCode(code)
      this.factor_rules[fi].interpret_rule.interpretation.push({ start: '', end: '', content: '' })
    },

    // 删除因子规则解读项
    delFactorRulesInterpretation(code: string, i: number) {
      const fi = this.getFactorRuleIndexByCode(code)
      this.factor_rules[fi].interpret_rule.interpretation.splice(i, 1)
    },

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ API 相关方法 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇

    /**
     * 获取量表信息（用于预览、发布页等）
     */
    async fetchScaleInfo(questionsheetid: string) {
      const [e, r] = await api.getSurvey(questionsheetid)
      if (e) throw e

      const questionsheet = r?.data.questionsheet
      if (questionsheet) {
        runInAction(() => {
          this.id = questionsheet.id
          this.title = questionsheet.title
          this.desc = questionsheet.desc
          this.img_url = questionsheet.img_url
        })
      }
      return questionsheet
    },

    // 同步显隐规则（发布前统一提交）
    async syncShowControllers() {
      if (!this.id) return

      for (const code of this.deletedShowControllerCodes) {
        await delShowController(this.id, code)
      }
      this.deletedShowControllerCodes = []

      for (const item of this.showControllers) {
        await postShowController(this.id, item)
      }
    },

    /**
     * 发布量表到线上
     */
    async publish() {
      if (!this.id) {
        // 如果还没有创建量表，先创建以获取 ID
        const [e, r] = await api.createSurvey({
          title: this.title,
          desc: this.desc,
          img_url: this.img_url
        })
        if (e) throw e
        if (r?.data.questionsheetid) {
          runInAction(() => {
            this.id = r.data.questionsheetid
          })
        } else {
          throw new Error('创建量表失败')
        }
      }

      // 此时 this.id 一定存在，使用类型断言
      const scaleId = this.id as string

      // 更新基本信息
      const [infoErr] = await api.updateSurvey({
        questionsheetid: scaleId,
        title: this.title,
        desc: this.desc,
        img_url: this.img_url
      })
      if (infoErr) throw infoErr

      // 保存题目列表
      const [qsErr] = await api.saveSurveyQuestions(scaleId, this.questions)
      if (qsErr) throw qsErr

      // 同步本地暂存的题目显隐规则
      await this.syncShowControllers()

      const [e] = await api.publishSurvey(scaleId)
      if (e) throw e

      runInAction(() => {
        this.currentStep = 'publish'
      })

      // 发布成功后清除 localStorage 缓存
      this.clearLocalStorage()
    },

    /**
     * 取消发布量表
     */
    async unpublish() {
      if (!this.id) {
        throw new Error('量表 ID 不能为空')
      }

      const scaleId = this.id as string
      const [e] = await api.unpublishSurvey(scaleId)
      if (e) throw e
    },

    /**
     * 保存量表基本信息
     * @returns 返回量表 ID（新建时返回新 ID，编辑时返回原 ID）
     */
    async saveBasicInfo() {
      const params = {
        title: this.title,
        desc: this.desc,
        img_url: this.img_url
      }

      // 新建时需要生成 ID 供后续题目/显隐规则使用
      if (!this.id || this.id === '') {
        const [e, r] = await api.createSurvey(params)
        if (e) throw e

        if (r?.data.questionsheetid) {
          runInAction(() => {
            this.id = r.data.questionsheetid
            this.currentStep = 'edit-questions'
          })
          return r.data.questionsheetid
        }
        throw new Error('创建量表失败')
      }

      // 已有 ID 时仅更新本地数据，最终发布时统一更新后端
      return this.id
    },

    /**
     * 保存量表题目列表
     */
    async saveQuestionList(options: { persist?: boolean } = {}) {
      const { persist = false } = options
      if (!this.id) {
        throw new Error('量表 ID 不能为空')
      }

      if (persist) {
        const [e] = await api.saveSurveyQuestions(this.id, this.questions)
        if (e) throw e
      }

      runInAction(() => {
        if (this.currentStep === 'edit-questions') {
          this.currentStep = 'set-routing'
        }
      })
    },

    /**
     * 初始化编辑器（问题编辑页面）
     * @param questionsheetid 量表 ID，如果是 'new' 则初始化为新建模式
     */
    async initEditor(questionsheetid: string) {
      if (!questionsheetid || questionsheetid === 'new') {
        // 新建模式：尝试从 localStorage 恢复或初始化空白量表
        const restored = this.loadFromLocalStorage()
        if (!restored) {
          this.initScale()
        }
        return
      }

      // 编辑模式：优先从 localStorage 恢复
      const restored = this.loadFromLocalStorage()
      if (restored && this.id === questionsheetid) {
        console.log('从 localStorage 恢复数据成功')
        return
      }

      // localStorage 没有数据或 ID 不匹配，从服务器加载
      console.log('从服务器加载数据')

      // 编辑模式：加载量表和题目
      const [qe, qr] = await api.getSurvey(questionsheetid)
      if (qe) {
        // 量表不存在时，初始化为新量表但保留 ID
        console.warn('量表不存在，初始化为新量表:', questionsheetid)
        runInAction(() => {
          this.id = questionsheetid
          this.title = ''
          this.desc = ''
          this.img_url = ''
          this.questions = []
          this.currentCode = ''
          this.currentStep = 'edit-questions'
        })
        return
      }

      const questionsheet = qr?.data.questionsheet
      if (questionsheet) {
        runInAction(() => {
          this.id = questionsheet.id
          this.title = questionsheet.title
          this.desc = questionsheet.desc
          this.img_url = questionsheet.img_url
        })
      }

      // 加载题目列表
      const [le, lr] = await api.getSurveyQuestions(questionsheetid)
      if (le) {
        console.warn('加载题目列表失败，使用空列表')
        runInAction(() => {
          this.questions = []
          this.currentCode = ''
          this.currentStep = 'edit-questions'
        })
        return
      }

      const questions = lr?.data.list || []
      runInAction(() => {
        this.questions = questions
        if (questions.length > 0) {
          this.currentCode = questions[0].code
          this.currentStep = 'edit-questions'
        } else {
          this.currentCode = ''
          this.currentStep = 'edit-questions'
        }
      })
    },

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ 问题相关方法 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇

    // 更新问题属性
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

    // 更新选项属性
    updateQuestionOptionDispatch(type: IOptionKeys, payload: any) {
      switch (type) {
      case 'allow_extend_text':
        this.updateQuestionOptionAllowExtend(payload.index, payload.value)
        break
      case 'extend_content':
        this.updateQuestionOptionExtendContent(payload.index, payload.value)
        break
      case 'extend_placeholder':
        this.updateQuestionOptionExtendPlaceholder(payload.index, payload.value)
        break
      case 'score':
        this.updateQuestionOptionScore(payload.index, payload.value)
        break
      case 'content':
        this.updateQuestionOptionContent(payload.index, payload.value)
        break
      case 'image':
        this.updateQuestionOptionImage(payload.index, payload.value)
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

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ 更新问题信息 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    updateQuestionTitle(v: string) {
      this.questions[this.currentIndex].title = v
    },

    updateQuestionTips(v: string) {
      this.questions[this.currentIndex].tips = v
    },

    updateQuestionPlaceholder(v: string) {
      (this.questions[this.currentIndex] as ITextQuestion).placeholder = v
    },

    updateQuestionFormat(v: string) {
      (this.questions[this.currentIndex] as IDateQuestion).format = v
    },

    updateQuestionLeftDesc(desc: string) {
      (this.questions[this.currentIndex] as IScoreRadioQuestion).left_desc = desc
    },
    
    updateQuestionRightDesc(desc: string) {
      (this.questions[this.currentIndex] as IScoreRadioQuestion).right_desc = desc
    },

    updateQuestionValidate(k: keyof IValidateRules, v: any) {
      // 文本类型设置了最小字数，且最小字数 > 0，则打开必填的验证
      if (k == 'min_words' && v > 0) {
        (this.questions[this.currentIndex] as any).validate_rules['required'] = true
      }
      (this.questions[this.currentIndex] as any).validate_rules[k] = v
    },

    updateQuestionFormula(v: 'sum' | 'svg' | 'max') {
      (this.questions[this.currentIndex] as ICheckBoxQuestion).calc_rule.formula = v
    },

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ 更新选项信息 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    updateQuestionOptionAllowExtend(optionIndex: number, v: unknown) {
      this.updateQuestionOption('allow_extend_text', optionIndex, v)
    },

    updateQuestionOptionExtendContent(optionIndex: number, v: unknown) {
      this.updateQuestionOption('extend_content', optionIndex, v)
    },

    updateQuestionOptionExtendPlaceholder(optionIndex: number, v: unknown) {
      this.updateQuestionOption('extend_placeholder', optionIndex, v)
    },

    updateQuestionOptionScore(optionIndex: number, v: unknown) {
      this.updateQuestionOption('score', optionIndex, v)
    },

    updateQuestionOptionContent(i: number, v: unknown) {
      this.updateQuestionOption('content', i, v)
    },

    updateQuestionOptionImage(i: number, url: string) {
      this.updateQuestionOption('img_url', i, url)
    },

    updateQuestionOption(k: string, i: number, v: unknown) {
      (this.questions[this.currentIndex] as any).options[i][k] = v
    },

    addQuestionOption(item: IRadioOption) {
      const options = (this.questions[this.currentIndex] as any).options
      if (options[options.length - 1]?.is_other) {
        options.splice(options.length - 1, 0, item)
      } else {
        options.push(item)
      }
    },

    deleteQuestionOption(i: number) {
      (this.questions[this.currentIndex] as any).options.splice(i, 1)
    }
  },
  {
    // 基本信息
    title: observable,
    desc: observable,
    img_url: observable,
    questions: observable,
    factors: observable,
    showControllers: observable,
    deletedShowControllerCodes: observable,
    macro_rule: observable,
    factor_rules: observable,
    currentCode: observable,
    currentFactorId: observable,
    currentStep: observable,
    
    // 计算属性
    currentQuestion: computed,
    currentIndex: computed,
    currentFactor: computed,
    isStepCompleted: computed,
    
    // 方法
    saveToLocalStorage: action,
    loadFromLocalStorage: action,
    clearLocalStorage: action,
    initScale: action,
    setCurrentStep: action,
    nextStep: action,
    prevStep: action,
    changeQuestionPosition: action,
    setCurrentCode: action,
    setShowControllers: action,
    upsertShowController: action,
    deleteShowController: action,
    addQuestion: action,
    addQuestionByPosition: action,
    deleteQuestion: action,
    updateQuestionDispatch: action,
    setScale: action,
    setScaleQuestions: action,
    setFactors: action,
    addFactor: action,
    deleteFactor: action,
    updateFactor: action,
    setCurrentFactorId: action,
    changeFactorPosition: action,
    initAnalysisData: action,
    setAnalysisData: action,
    changeMacroRule: action,
    changeMacroRuleInterpretation: action,
    addMacroRuleInterpretation: action,
    delMacroRuleInterpretation: action,
    changeFactorRulesItem: action,
    changeFactorRulesInterpretation: action,
    addFactorRulesInterpretation: action,
    delFactorRulesInterpretation: action,
    fetchScaleInfo: action,
    syncShowControllers: action,
    publish: action,
    unpublish: action,
    saveBasicInfo: action,
    saveQuestionList: action,
    initEditor: action
  }
)

// 自动保存到 localStorage（使用 reaction 并添加防抖）
let saveTimer: NodeJS.Timeout | null = null
reaction(
  // 追踪这些字段的变化
  () => ({
    id: scaleStore.id,
    title: scaleStore.title,
    desc: scaleStore.desc,
    img_url: scaleStore.img_url,
    questionsLength: scaleStore.questions.length,
    questionsData: JSON.stringify(scaleStore.questions),
    factorsLength: scaleStore.factors.length,
    factorsData: JSON.stringify(scaleStore.factors),
    showControllersLength: scaleStore.showControllers.length,
    showControllersData: JSON.stringify(scaleStore.showControllers),
    macroRuleData: JSON.stringify(scaleStore.macro_rule),
    factorRulesData: JSON.stringify(scaleStore.factor_rules),
    currentStep: scaleStore.currentStep
  }),
  // 当这些字段变化时执行保存
  (data) => {
    // 清除之前的定时器
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    // 防抖：500ms 后保存
    saveTimer = setTimeout(() => {
      const hasData = data.id || data.title || data.questionsLength > 0 || data.factorsLength > 0 || data.showControllersLength > 0
      if (hasData) {
        scaleStore.saveToLocalStorage()
      }
    }, 500)
  },
  {
    // 首次运行时不触发
    fireImmediately: false
  }
)
