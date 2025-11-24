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
import { api } from '../api'
import { delShowController, postShowController } from '@/api/path/showController'
import { IQuestionShowController } from '@/models/question'

// 问卷编辑步骤
export type SurveyStep = 'create' | 'edit-questions' | 'set-routing' | 'publish'

// localStorage 键名
const STORAGE_KEY = 'surveyStore_data'
const STORAGE_VERSION = 'v1'

// 持久化的数据结构
interface PersistedSurveyData {
  version: string
  id: string
  title: string
  desc: string
  img_url: string
  questions: IQuestion[]
  showControllers: Array<{ code: string; show_controller: IQuestionShowController }>
  deletedShowControllerCodes: string[]
  currentCode: string
  currentStep: SurveyStep
  timestamp: number
}

const surveyInit: IQuestionSheet = {
  id: '',
  title: '',
  desc: '',
  img_url: '',
  questions: []
}

/**
 * 问卷 Store
 * 用于创建和编辑普通调查问卷
 * 编辑流程：创建问卷 -> 编辑问题 -> 设置题目路由 -> 发布
 */
export const surveyStore = makeObservable(
  {
    // 基本信息
    id: surveyInit.id,
    title: surveyInit.title,
    desc: surveyInit.desc,
    img_url: surveyInit.img_url,
    questions: surveyInit.questions,
    // 题目显隐规则（仅前端暂存）
    showControllers: [] as { code: string; show_controller: IQuestionShowController }[],
    deletedShowControllerCodes: [] as string[],
    
    // 当前编辑的问题
    currentCode: '',
    
    // 当前编辑步骤
    currentStep: 'create' as SurveyStep,
    
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
    
    get isStepCompleted() {
      return {
        create: !!this.id && !!this.title,
        'edit-questions': this.questions.length > 0,
        'set-routing': true, // 路由设置是可选的
        publish: false // 发布后完成
      }
    },

    // 保存到 localStorage
    saveToLocalStorage() {
      try {
        // 使用 JSON.parse(JSON.stringify()) 深拷贝，确保 MobX observable 被正确序列化
        const data: PersistedSurveyData = {
          version: STORAGE_VERSION,
          id: this.id || '',
          title: this.title,
          desc: this.desc,
          img_url: this.img_url,
          questions: JSON.parse(JSON.stringify(this.questions)),
          showControllers: JSON.parse(JSON.stringify(this.showControllers)),
          deletedShowControllerCodes: [...this.deletedShowControllerCodes],
          currentCode: this.currentCode,
          currentStep: this.currentStep,
          timestamp: Date.now()
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        console.log('已保存到 localStorage, 题目数:', data.questions.length)
      } catch (error) {
        console.error('保存到 localStorage 失败:', error)
      }
    },

    // 从 localStorage 加载
    loadFromLocalStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const data: PersistedSurveyData = JSON.parse(stored)
          // 检查版本号
          if (data.version === STORAGE_VERSION) {
            this.id = data.id
            this.title = data.title
            this.desc = data.desc
            this.img_url = data.img_url
            this.questions = data.questions || []
            this.showControllers = data.showControllers || []
            this.deletedShowControllerCodes = data.deletedShowControllerCodes || []
            this.currentCode = data.currentCode
            this.currentStep = data.currentStep
            console.log('从 localStorage 恢复数据:', {
              timestamp: new Date(data.timestamp),
              questionCount: data.questions?.length || 0,
              firstQuestion: data.questions?.[0]
            })
            // 验证数据完整性
            if (this.questions.length > 0) {
              const firstQ = this.questions[0] as any
              console.log('第一个题目:', {
                type: firstQ.type,
                title: firstQ.title,
                hasOptions: !!firstQ.options,
                optionCount: firstQ.options?.length || 0
              })
            }
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
          console.log('显隐规则数量:', data.showControllers?.length || 0)
          console.log('当前步骤:', data.currentStep)
          console.log('保存时间:', new Date(data.timestamp))
          if (data.questions?.length > 0) {
            console.log('第一个题目:', data.questions[0])
          }
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
    initSurvey() {
      this.id = surveyInit.id
      this.title = surveyInit.title
      this.desc = surveyInit.desc
      this.img_url = surveyInit.img_url
      this.questions = surveyInit.questions
      this.showControllers = []
      this.deletedShowControllerCodes = []
      this.currentCode = ''
      this.currentStep = 'create'
      this.clearLocalStorage()
    },

    // 设置当前步骤
    setCurrentStep(step: SurveyStep) {
      this.currentStep = step
    },

    // 进入下一步
    nextStep() {
      const steps: SurveyStep[] = ['create', 'edit-questions', 'set-routing', 'publish']
      const currentIndex = steps.indexOf(this.currentStep)
      if (currentIndex < steps.length - 1) {
        this.currentStep = steps[currentIndex + 1]
      }
    },

    // 返回上一步
    prevStep() {
      const steps: SurveyStep[] = ['create', 'edit-questions', 'set-routing', 'publish']
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

    // 设置问卷基本信息
    setSurvey(v?: IQuestionSheet) {
      if (v) {
        this.id = v.id
        this.title = v.title
        this.desc = v.desc
        this.img_url = v.img_url
      }
    },

    // 设置问卷题目列表
    setSurveyQuestions(v: Array<IQuestion>) {
      this.questions = v
      if (v.length > 0) {
        this.currentCode = v[0].code
      }
    },

    // 维护题目显隐规则（前端暂存）
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
    },

    // ============ 业务功能方法 ============

    /**
     * 初始化编辑器 - 用于创建或编辑问卷
     * @param questionsheetid 问卷 ID，如果是 'new' 则初始化为新建模式
     */
    async initEditor(questionsheetid: string) {
      if (!questionsheetid || questionsheetid === 'new') {
        // 新建模式：尝试从 localStorage 恢复或初始化空白问卷
        const restored = this.loadFromLocalStorage()
        if (!restored) {
          this.initSurvey()
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

      // 编辑模式：加载问卷和题目
      const [qe, qr] = await api.getSurvey(questionsheetid)
      if (qe) {
        // 问卷不存在时，初始化为新问卷但保留 ID
        console.warn('问卷不存在，初始化为新问卷:', questionsheetid)
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

    /**
     * 保存问卷基本信息
     * @returns 返回问卷 ID（新建时返回新 ID，编辑时返回原 ID）
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
        throw new Error('创建问卷失败')
      }

      // 已有 ID 时仅更新本地数据，最终发布时统一更新后端
      return this.id
    },

    /**
     * 保存问卷题目列表
     */
    async saveQuestionList(options: { persist?: boolean } = {}) {
      const { persist = false } = options
      if (!this.id) {
        throw new Error('问卷 ID 不能为空')
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
     * 发布问卷到线上
     */
    async publish() {
      if (!this.id) {
        // 如果还没有创建问卷，先创建以获取 ID
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
          throw new Error('创建问卷失败')
        }
      }

      // 此时 this.id 一定存在，使用类型断言
      const surveyId = this.id as string

      // 更新基本信息
      const [infoErr] = await api.updateSurvey({
        questionsheetid: surveyId,
        title: this.title,
        desc: this.desc,
        img_url: this.img_url
      })
      if (infoErr) throw infoErr

      // 保存题目列表
      const [qsErr] = await api.saveSurveyQuestions(surveyId, this.questions)
      if (qsErr) throw qsErr

      // 同步本地暂存的题目显隐规则
      await this.syncShowControllers()

      const [e] = await api.publishSurvey(surveyId)
      if (e) throw e

      runInAction(() => {
        this.currentStep = 'publish'
      })

      // 发布成功后清除 localStorage 缓存
      this.clearLocalStorage()
    },

    /**
     * 取消发布问卷
     */
    async unpublish() {
      if (!this.id) {
        throw new Error('问卷 ID 不能为空')
      }

      const surveyId = this.id as string
      const [e] = await api.unpublishSurvey(surveyId)
      if (e) throw e
    },

    /**
     * 获取问卷信息（用于预览、发布页等）
     */
    async fetchSurveyInfo(questionsheetid: string) {
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
    }
  },
  {
    // 基本信息
    title: observable,
    desc: observable,
    img_url: observable,
    questions: observable,
    showControllers: observable,
    deletedShowControllerCodes: observable,
    currentCode: observable,
    currentStep: observable,
    
    // 计算属性
    currentQuestion: computed,
    currentIndex: computed,
    isStepCompleted: computed,
    
    // 方法
    saveToLocalStorage: action,
    loadFromLocalStorage: action,
    clearLocalStorage: action,
    debugLocalStorage: action,
    initSurvey: action,
    setCurrentStep: action,
    nextStep: action,
    prevStep: action,
    changeQuestionPosition: action,
    setCurrentCode: action,
    addQuestion: action,
    addQuestionByPosition: action,
    deleteQuestion: action,
    updateQuestionDispatch: action,
    setSurvey: action,
    setSurveyQuestions: action,
    setShowControllers: action,
    upsertShowController: action,
    deleteShowController: action,
    
    // 业务功能方法
    initEditor: action,
    saveBasicInfo: action,
    saveQuestionList: action,
    publish: action,
    unpublish: action,
    fetchSurveyInfo: action,
    syncShowControllers: action
  }
)

// 自动保存到 localStorage（使用 reaction 并添加防抖）
let saveTimer: NodeJS.Timeout | null = null
reaction(
  // 追踪这些字段的变化
  () => ({
    id: surveyStore.id,
    title: surveyStore.title,
    desc: surveyStore.desc,
    img_url: surveyStore.img_url,
    questionsLength: surveyStore.questions.length,
    questionsData: JSON.stringify(surveyStore.questions),
    showControllersLength: surveyStore.showControllers.length,
    showControllersData: JSON.stringify(surveyStore.showControllers),
    currentStep: surveyStore.currentStep
  }),
  // 当这些字段变化时执行保存
  (data) => {
    // 清除之前的定时器
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    
    // 防抖：500ms 后保存
    saveTimer = setTimeout(() => {
      const hasData = data.id || data.title || data.questionsLength > 0 || data.showControllersLength > 0
      if (hasData) {
        surveyStore.saveToLocalStorage()
      }
    }, 500)
  },
  {
    // 首次运行时不触发
    fireImmediately: false
  }
)
