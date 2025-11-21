import { makeObservable, observable, computed, action } from 'mobx'
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

// 问卷编辑步骤
export type SurveyStep = 'create' | 'edit-questions' | 'set-routing' | 'publish'

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

    // 初始化
    initSurvey() {
      this.id = surveyInit.id
      this.title = surveyInit.title
      this.desc = surveyInit.desc
      this.img_url = surveyInit.img_url
      this.questions = surveyInit.questions
      this.currentCode = ''
      this.currentStep = 'create'
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

    // 添加问题
    addQuestion(question: IQuestion) {
      this.questions.push(question)
    },

    // 在指定位置添加问题
    addQuestionByPosition(question: IQuestion, index: number) {
      this.questions.splice(index, 0, question)
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
    }
  },
  {
    // 基本信息
    title: observable,
    desc: observable,
    img_url: observable,
    questions: observable,
    currentCode: observable,
    currentStep: observable,
    
    // 计算属性
    currentQuestion: computed,
    currentIndex: computed,
    isStepCompleted: computed,
    
    // 方法
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
    setSurveyQuestions: action
  }
)
