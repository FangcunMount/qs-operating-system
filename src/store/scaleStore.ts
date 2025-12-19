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
import { IFactorAnalysis, IInterpretation, IInterpret_rule } from '../models/analysis'
import { api } from '../api'
import { delShowController, postShowController } from '@/api/path/showController'
import { convertQuestionFromDTO } from '@/api/path/questionConverter'
import type { IQuestionDTO } from '@/api/path/survey'

// 量表编辑步骤
export type ScaleStep = 'create' | 'edit-questions' | 'set-routing' | 'edit-factors' | 'set-interpretation' | 'publish'

// localStorage 键名
const STORAGE_KEY = 'scaleStore_data'
const STORAGE_VERSION = 'v1'

// 持久化的数据结构
interface PersistedScaleData {
  version: string
  id: string
  scaleCode?: string // 量表编码（可选，向后兼容）
  title: string
  desc: string
  img_url: string
  category?: string // 主类
  stages?: string[] // 阶段列表（数组）
  applicable_ages?: string[] // 使用年龄列表（数组）
  reporters?: string[] // 填报人列表（数组）
  tags?: string[] // 标签
  questions: IQuestion[]
  showControllers: Array<{ code: string; show_controller: IQuestionShowController }>
  deletedShowControllerCodes: string[]
  factors: IFactor[]
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


/**
 * 量表 Store
 * 用于创建和编辑医学量表
 * 编辑流程：创建量表 -> 编辑问题 -> 设置题目路由 -> 编辑因子 -> 设置解读规则 -> 发布
 */
export const scaleStore = makeObservable(
  {
    // 基本信息
    id: scaleInit.id,
    scaleCode: '', // 量表编码（用于调用量表相关 API）
    title: scaleInit.title,
    desc: scaleInit.desc,
    img_url: scaleInit.img_url,
    category: '', // 主类：ADHD、抽动障碍、感统、执行功能、心理健康、神经发育筛查、慢性病管理、生活质量
    stages: [] as string[], // 阶段列表（数组）：screening(筛查)、deep_assessment(深评)、follow_up(随访)、outcome(结局)
    applicable_ages: [] as string[], // 使用年龄列表（数组）：infant(婴幼儿)、preschool(学龄前)、school_child(学龄儿童)、adolescent(青少年)、adult(成人)
    reporters: [] as string[], // 填报人列表（数组）：parent(家长评)、teacher(教师评)、self(自评)、clinical(临床评定)
    tags: [] as string[], // 标签数组（动态输入）
    questions: scaleInit.questions,
    // 题目显隐规则（前端暂存）
    showControllers: [] as { code: string; show_controller: IQuestionShowController }[],
    deletedShowControllerCodes: [] as string[],
    
    // 因子列表（量表特有）
    factors: [] as IFactor[],
    
    // 解读规则（量表特有）
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
          scaleCode: this.scaleCode || undefined,
          title: this.title,
          desc: this.desc,
          img_url: this.img_url,
          category: this.category,
          stages: this.stages,
          applicable_ages: this.applicable_ages,
          reporters: this.reporters,
          tags: this.tags,
          questions: JSON.parse(JSON.stringify(this.questions)),
          showControllers: JSON.parse(JSON.stringify(this.showControllers)),
          deletedShowControllerCodes: [...this.deletedShowControllerCodes],
          factors: JSON.parse(JSON.stringify(this.factors)),
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
              this.scaleCode = data.scaleCode || ''
              this.title = data.title
              this.desc = data.desc
              this.img_url = data.img_url
              this.category = data.category || ''
              this.stages = data.stages || []
              this.applicable_ages = data.applicable_ages || []
              this.reporters = data.reporters || []
              this.tags = data.tags || []
              this.questions = data.questions || []
              this.showControllers = data.showControllers || []
              this.deletedShowControllerCodes = data.deletedShowControllerCodes || []
              this.factors = data.factors || []
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
      this.scaleCode = ''
      this.title = scaleInit.title
      this.desc = scaleInit.desc
      this.img_url = scaleInit.img_url
      this.category = ''
      this.stages = []
      this.applicable_ages = []
      this.reporters = []
      this.tags = []
      this.questions = scaleInit.questions
      this.showControllers = []
      this.deletedShowControllerCodes = []
      this.factors = []
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
    
    // 设置量表分类信息（从 API 响应中设置）
    setScaleCategoryInfo(data: {
      category?: string
      stages?: string[]
      applicable_ages?: string[]
      reporters?: string[]
      tags?: string[]
    }) {
      if (data.category !== undefined) this.category = data.category
      if (data.stages !== undefined) this.stages = data.stages
      if (data.applicable_ages !== undefined) this.applicable_ages = data.applicable_ages
      if (data.reporters !== undefined) this.reporters = data.reporters
      if (data.tags !== undefined) this.tags = data.tags
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
      // 如果移动的是总分因子，确保它始终在第一位
      const factor = this.factors[oldIndex]
      if (factor.is_total_score === '1' && newIndex !== 0) {
        // 如果总分因子不在第一位，将其移到第一位
        const totalFactor = this.factors.splice(oldIndex, 1)[0]
        this.factors.unshift(totalFactor)
        return
      }
      
      // 如果目标位置是第一位，但第一位已经是总分因子，不允许移动
      if (newIndex === 0 && this.factors[0]?.is_total_score === '1' && oldIndex !== 0) {
        return
      }
      
      this.factors.splice(newIndex, 0, this.factors.splice(oldIndex, 1)[0])
      
      // 移动后，确保总分因子在第一位
      const totalFactorIndex = this.factors.findIndex(f => f.is_total_score === '1')
      if (totalFactorIndex > 0) {
        const totalFactor = this.factors.splice(totalFactorIndex, 1)[0]
        this.factors.unshift(totalFactor)
      }
    },

    // 获取因子
    getFactorById(factorId: string) {
      return this.factors.find((v) => v.code === factorId)
    },

    // ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇ 解读规则相关方法 ⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇⬇
    
    // 初始化解读规则数据
    initAnalysisData(fs: Array<IFactorAnalysis>) {
      this.factor_rules = fs ?? []
    },

    // 设置解读规则数据
    setAnalysisData(factors: Array<IFactorAnalysis>) {
      this.factor_rules = factors
    },

    // 获取因子规则在数组中的索引
    getFactorRuleIndexByCode(code: string) {
      return this.factor_rules.findIndex((v) => v.code === code)
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

      // 新 API 返回格式：IQuestionnaireResponse
      const questionnaire = r?.data
      if (questionnaire) {
        runInAction(() => {
          this.id = questionnaire.code
          this.title = questionnaire.title
          this.desc = questionnaire.description || ''
          this.img_url = questionnaire.img_url || ''
        })
      }
      return questionnaire
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
          img_url: this.img_url,
          type: 'scale'
        })
        if (e) throw e
        // 新 API 返回格式：IQuestionnaireResponse，code 字段是问卷编码
        if (r?.data?.code) {
          runInAction(() => {
            this.id = r.data.code
          })
        } else {
          throw new Error('创建量表失败')
        }
      }

      // 此时 this.id 一定存在，使用类型断言
      const scaleId = this.id as string

      // 保存题目列表
      const [qsErr] = await api.saveSurveyQuestions(scaleId, this.questions)
      if (qsErr) throw qsErr

      // 同步本地暂存的题目显隐规则
      await this.syncShowControllers()

      // 获取量表编码（如果还没有）
      let scaleCode = this.scaleCode
      if (!scaleCode) {
        const { scaleApi } = await import('@/api/path/scale')
        const [se, sr] = await scaleApi.getScaleByQuestionnaire(scaleId)
        if (se || !sr?.data?.code) {
          throw new Error('获取量表编码失败，无法发布')
        }
        scaleCode = sr.data.code
        runInAction(() => {
          this.scaleCode = scaleCode
        })
      }

      // 更新量表基本信息（使用量表的 basic-info 接口）
      const { scaleApi } = await import('@/api/path/scale')
      const [infoErr] = await scaleApi.updateScaleBasicInfo(scaleCode, {
        title: this.title,
        description: this.desc,
        category: this.category || undefined,
        stages: this.stages.length > 0 ? this.stages : undefined,
        applicable_ages: this.applicable_ages.length > 0 ? this.applicable_ages : undefined,
        reporters: this.reporters.length > 0 ? this.reporters : undefined,
        tags: this.tags.length > 0 ? this.tags : undefined
      })
      if (infoErr) throw infoErr

      // 使用量表编码调用发布接口
      const [e] = await scaleApi.publishScale(scaleCode)
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

      // 获取量表编码（如果还没有）
      let scaleCode = this.scaleCode
      if (!scaleCode) {
        const { scaleApi } = await import('@/api/path/scale')
        const [se, sr] = await scaleApi.getScaleByQuestionnaire(scaleId)
        if (se || !sr?.data?.code) {
          throw new Error('获取量表编码失败，无法取消发布')
        }
        scaleCode = sr.data.code
        runInAction(() => {
          this.scaleCode = scaleCode
        })
      }

      // 使用量表编码调用取消发布接口
      const { scaleApi } = await import('@/api/path/scale')
      const [e] = await scaleApi.unpublishScale(scaleCode)
      if (e) throw e
    },

    /**
     * 保存量表基本信息
     * @returns 返回量表 ID（新建时返回新 ID，编辑时返回原 ID）
     */
    async saveBasicInfo() {
      // 新建量表：先创建问卷，再创建量表
      if (!this.id || this.id === '') {
        // 1. 先创建问卷
        const [qe, qr] = await api.createSurvey({
          title: this.title,
          desc: this.desc,
          img_url: this.img_url,
          type: 'scale'
        })
        if (qe) throw qe

        // 新 API 返回格式：IQuestionnaireResponse，code 字段是问卷编码
        if (!qr?.data?.code) {
          throw new Error('创建问卷失败')
        }

        const questionnaireCode = qr.data.code
        const questionnaireVersion = qr.data.version || '1.0'

        // 2. 创建量表（关联问卷）
        const { scaleApi } = await import('@/api/path/scale')
        const [se, sr] = await scaleApi.createScale({
          title: this.title,
          description: this.desc,
          questionnaire_code: questionnaireCode,
          questionnaire_version: questionnaireVersion,
          category: this.category || undefined,
          stages: this.stages.length > 0 ? this.stages : undefined,
          applicable_ages: this.applicable_ages.length > 0 ? this.applicable_ages : undefined,
          reporters: this.reporters.length > 0 ? this.reporters : undefined,
          tags: this.tags.length > 0 ? this.tags : undefined
        })
        if (se) throw se

        if (!sr?.data?.code) {
          throw new Error('创建量表失败')
        }

        runInAction(() => {
          this.id = questionnaireCode
          this.scaleCode = sr.data.code
          this.currentStep = 'edit-questions'
        })
        return questionnaireCode
      }

      // 编辑模式：更新量表基本信息
      if (this.scaleCode) {
        const { scaleApi } = await import('@/api/path/scale')
        const [e] = await scaleApi.updateScaleBasicInfo(this.scaleCode, {
          title: this.title,
          description: this.desc,
          category: this.category || undefined,
          stages: this.stages.length > 0 ? this.stages : undefined,
          applicable_ages: this.applicable_ages.length > 0 ? this.applicable_ages : undefined,
          reporters: this.reporters.length > 0 ? this.reporters : undefined,
          tags: this.tags.length > 0 ? this.tags : undefined
        })
        if (e) throw e
      }

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
     * @param scaleCode 量表编码（可选），如果提供则直接使用 getScaleDetail 获取量表详情
     */
    async initEditor(questionsheetid: string, scaleCode?: string) {
      if (!questionsheetid || questionsheetid === 'new') {
        // 新建模式：尝试从 localStorage 恢复或初始化空白量表
        const restored = this.loadFromLocalStorage()
        if (!restored) {
          this.initScale()
        }
        return
      }

      // 编辑模式：优先从 localStorage 恢复（但仅在问题列表不为空时）
      const restored = this.loadFromLocalStorage()
      console.log('initEditor - localStorage 恢复检查:', {
        restored,
        storedId: this.id,
        questionsheetid,
        scaleCode,
        questionsLength: this.questions.length,
        shouldLoadFromServer: !restored || this.id !== questionsheetid || this.questions.length === 0 || !this.scaleCode
      })
      
      // 只有在 localStorage 有数据、ID 匹配、问题列表不为空且 scaleCode 存在时，才使用缓存数据
      if (restored && this.id === questionsheetid && this.questions.length > 0 && this.scaleCode) {
        console.log('从 localStorage 恢复数据成功，问题数量:', this.questions.length, '量表编码:', this.scaleCode)
        return
      }

      // localStorage 没有数据、ID 不匹配或问题列表为空，从服务器加载
      console.log('从服务器加载数据，questionsheetid:', questionsheetid, 'scaleCode:', scaleCode)

      // 如果 ID 不匹配，先清空基本信息字段，避免显示旧数据
      if (this.id !== questionsheetid) {
        runInAction(() => {
          this.id = questionsheetid
          this.scaleCode = ''
          this.title = ''
          this.desc = ''
          this.img_url = ''
          this.category = ''
          this.stages = []
          this.applicable_ages = []
          this.reporters = []
          this.tags = []
        })
      }

      // 如果提供了 scaleCode，优先使用 getScaleDetail 获取量表详情
      if (scaleCode) {
        try {
          const { scaleApi } = await import('@/api/path/scale')
          console.log('使用 scaleCode 调用 getScaleDetail，scaleCode:', scaleCode)
          const [se, sr] = await scaleApi.getScaleDetail(scaleCode)
          console.log('getScaleDetail 调用结果:', {
            hasError: !!se,
            error: se,
            hasData: !!sr?.data,
            scaleCode: sr?.data?.code,
            questionnaireCode: sr?.data?.questionnaire_code
          })
          
          if (!se && sr?.data) {
            const scale = sr.data
            runInAction(() => {
              this.scaleCode = scale.code
              // 设置量表分类信息
              this.setScaleCategoryInfo({
                category: scale.category,
                stages: scale.stages,
                applicable_ages: scale.applicable_ages,
                reporters: scale.reporters,
                tags: scale.tags
              })
            })
            
            // 从量表详情中获取问卷编码，然后加载问卷详情
            const questionnaireCode = scale.questionnaire_code || questionsheetid
            console.log('从量表详情获取问卷编码:', questionnaireCode)
            
            // 加载问卷详情（包含问题列表）
            const { surveyApi } = await import('@/api/path/survey')
            const [qe, qr] = await surveyApi.getSurvey(questionnaireCode)
            if (qe) {
              console.warn('加载问卷详情失败:', qe)
              return
            }
            
            const questionnaire = qr?.data
            if (questionnaire) {
              runInAction(() => {
                this.id = questionnaire.code
                this.title = questionnaire.title
                this.desc = questionnaire.description || ''
                this.img_url = questionnaire.img_url || ''
              })
              
              // 处理问题列表
              const questionDTOs = questionnaire?.questions || []
              console.log('原始问题数据 (QuestionDTO):', questionDTOs.length, questionDTOs.slice(0, 2))
              
              const questions = questionDTOs.map((q: any) => {
                if (q.question_type !== undefined) {
                  try {
                    const converted = convertQuestionFromDTO(q as IQuestionDTO)
                    return converted
                  } catch (error) {
                    console.warn('转换问题失败:', q, error)
                    return null
                  }
                }
                return q
              }).filter((q: any) => q !== null) as IQuestion[]
              
              runInAction(() => {
                this.questions = questions
                this.currentCode = questions.length > 0 ? questions[questions.length - 1].code : ''
              })
              
              console.log('从量表详情加载完成，问题数量:', this.questions.length)
              return
            }
          } else if (se) {
            console.warn('获取量表详情失败，降级使用问卷编码:', se)
            // 降级：使用问卷编码
          }
        } catch (error) {
          console.warn('获取量表详情异常，降级使用问卷编码:', error)
          // 降级：使用问卷编码
        }
      }

      // 如果没有 scaleCode 或获取失败，使用原来的逻辑：通过问卷编码获取
      // 编辑模式：加载量表和题目
      // 使用 surveyApi.getSurvey 确保正确调用
      const { surveyApi } = await import('@/api/path/survey')
      console.log('准备调用 surveyApi.getSurvey，questionsheetid:', questionsheetid)
      const [qe, qr] = await surveyApi.getSurvey(questionsheetid)
      console.log('surveyApi.getSurvey 调用完成:', { 
        hasError: !!qe, 
        error: qe, 
        hasData: !!qr?.data,
        dataCode: qr?.data?.code,
        questionsCount: qr?.data?.questions?.length 
      })
      console.log('API 调用结果:', { error: qe, hasData: !!qr?.data, questionsCount: qr?.data?.questions?.length })
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

      // 新 API 返回格式：IQuestionnaireResponse
      const questionnaire = qr?.data
      if (questionnaire) {
        runInAction(() => {
          this.id = questionnaire.code
          this.title = questionnaire.title
          this.desc = questionnaire.description || ''
          this.img_url = questionnaire.img_url || ''
        })
        
        // 获取量表信息以获取量表编码
        try {
          const { scaleApi } = await import('@/api/path/scale')
          const [se, sr] = await scaleApi.getScaleByQuestionnaire(questionnaire.code)
          console.log('getScaleByQuestionnaire 调用结果:', {
            hasError: !!se,
            error: se,
            hasData: !!sr?.data,
            scaleCode: sr?.data?.code,
            fullResponse: sr
          })
          if (!se && sr?.data?.code) {
            runInAction(() => {
              this.scaleCode = sr.data.code
              // 设置量表分类信息
              this.setScaleCategoryInfo({
                category: sr.data.category,
                stages: sr.data.stages,
                applicable_ages: sr.data.applicable_ages,
                reporters: sr.data.reporters,
                tags: sr.data.tags
              })
            })
            console.log('获取到量表编码:', sr.data.code)
          } else if (se) {
            console.warn('获取量表信息失败:', se)
          } else if (!sr?.data?.code) {
            console.warn('量表信息中没有编码字段，返回数据:', sr?.data)
          }
        } catch (error) {
          console.warn('获取量表信息异常（可能量表尚未创建）:', error)
        }
      }

      // 新 API 中 questions 直接在问卷响应中
      // 将 API 返回的 QuestionDTO 转换为前端的 IQuestion
      const questionDTOs = questionnaire?.questions || []
      console.log('原始问题数据 (QuestionDTO):', questionDTOs.length, questionDTOs.slice(0, 2))
      
      const questions = questionDTOs.map((q: any) => {
        // API 返回的是 QuestionDTO 格式，需要转换为前端 IQuestion 格式
        if (q.question_type !== undefined) {
          try {
            const converted = convertQuestionFromDTO(q as IQuestionDTO)
            console.log('转换问题:', { code: q.code, type: q.question_type, convertedType: converted.type })
            return converted
          } catch (error) {
            console.error('转换问题失败:', q, error)
            throw error
          }
        }
        // 如果已经是前端格式（向后兼容），直接使用
        if (q.type) {
          return q as IQuestion
        }
        // 未知格式，尝试直接使用
        console.warn('未知的问题数据格式:', q)
        return q as IQuestion
      })
      
      console.log('转换后的问题列表:', questions.length, questions.slice(0, 2))
      
      runInAction(() => {
        // 先清空数组，然后逐个添加，确保 MobX 能正确检测变化
        this.questions.length = 0
        this.questions.push(...questions)
        console.log('设置 questions 到 store:', questions.length)
        if (questions.length > 0) {
          this.currentCode = questions[0].code
          this.currentStep = 'edit-questions'
          console.log('设置当前问题:', this.currentCode)
        } else {
          this.currentCode = ''
          this.currentStep = 'edit-questions'
          console.log('问题列表为空')
        }
        console.log('store 状态更新完成:', {
          questionsCount: this.questions.length,
          currentCode: this.currentCode,
          currentStep: this.currentStep
        })
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
      if (k == 'min_length' && v > 0) {
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
    scaleCode: observable,
    title: observable,
    desc: observable,
    img_url: observable,
    questions: observable,
    factors: observable,
    showControllers: observable,
    deletedShowControllerCodes: observable,
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
    setScaleCategoryInfo: action,
    setScaleQuestions: action,
    setFactors: action,
    addFactor: action,
    deleteFactor: action,
    updateFactor: action,
    setCurrentFactorId: action,
    changeFactorPosition: action,
    initAnalysisData: action,
    setAnalysisData: action,
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

