/**
 * 问题数据转换工具
 * 统一处理前端 IQuestion 和 API QuestionDTO 之间的转换
 */

import { IQuestion, IQuestionShowController, IValidateRules } from '@/models/question'
import type { IQuestionDTO, IValidationRuleDTO, IShowControllerDTO } from './survey'

// ============ 类型映射 ============

/**
 * 规范支持的问题类型
 */
const STANDARD_QUESTION_TYPES = ['Radio', 'Checkbox', 'Text', 'Textarea', 'Number', 'Section'] as const

/**
 * 扩展类型到规范类型的映射（用于提交到 API）
 */
const EXTENDED_TYPE_TO_STANDARD: Record<string, string> = {
  'Select': 'Radio',
  'ScoreRadio': 'Radio',
  'ImageRadio': 'Radio',
  'AddressSelect': 'Radio',
  'CascaderSelect': 'Radio',
  'ImageCheckBox': 'Checkbox',
  // Date, Upload 等映射为 Text
}

/**
 * API 类型到前端类型的映射（用于从 API 读取）
 */
const API_TYPE_TO_FRONTEND: Record<string, string> = {
  // 规范格式直接使用
  'Radio': 'Radio',
  'Checkbox': 'Checkbox',
  'Text': 'Text',
  'Textarea': 'Textarea',
  'Number': 'Number',
  'Section': 'Section',
  // 向后兼容旧格式
  'single_choice': 'Radio',
  'multi_choice': 'Checkbox',
  'text': 'Text',
  'textarea': 'Textarea',
  'number': 'Number',
  'date': 'Date',
  'upload': 'Upload',
  'section': 'Section',
  'select': 'Select',
  'score_radio': 'ScoreRadio',
  'image_radio': 'ImageRadio',
  'image_checkbox': 'ImageCheckBox',
  'address_select': 'AddressSelect',
  'cascader_select': 'CascaderSelect'
}

/**
 * 将前端问题类型映射为 API 规范类型
 */
export function mapQuestionTypeToAPI(type: string): string {
  if (STANDARD_QUESTION_TYPES.includes(type as any)) {
    return type
  }
  return EXTENDED_TYPE_TO_STANDARD[type] || 'Text'
}

/**
 * 将 API 问题类型映射为前端类型
 */
export function mapQuestionTypeFromAPI(apiType: string): string {
  return API_TYPE_TO_FRONTEND[apiType] || apiType
}

// ============ 验证规则转换 ============

/**
 * 将前端验证规则对象转换为 API 验证规则数组
 */
export function convertValidationRulesToDTO(rules: IValidateRules): IValidationRuleDTO[] {
  const result: IValidationRuleDTO[] = []
  
  if (rules.required) {
    const isRequired = rules.required === true || 
                       rules.required === 'true' || 
                       rules.required === '1' || 
                       (typeof rules.required === 'number' && rules.required === 1)
    result.push({ 
      rule_type: 'required', 
      target_value: isRequired ? '0' : '1'
    })
  }
  
  if (rules.min_selections !== null && rules.min_selections !== undefined) {
    result.push({ 
      rule_type: 'min_selections', 
      target_value: String(rules.min_selections) 
    })
  }
  
  if (rules.max_selections !== null && rules.max_selections !== undefined) {
    result.push({ 
      rule_type: 'max_selections', 
      target_value: String(rules.max_selections) 
    })
  }
  
  if (rules.min_length !== null && rules.min_length !== undefined) {
    result.push({ 
      rule_type: 'min_length', 
      target_value: String(rules.min_length) 
    })
  }
  
  if (rules.max_length !== null && rules.max_length !== undefined) {
    result.push({ 
      rule_type: 'max_length', 
      target_value: String(rules.max_length) 
    })
  }
  
  if (rules.min_value !== null && rules.min_value !== undefined) {
    result.push({ 
      rule_type: 'min_value', 
      target_value: String(rules.min_value) 
    })
  }
  
  if (rules.max_value !== null && rules.max_value !== undefined) {
    result.push({ 
      rule_type: 'max_value', 
      target_value: String(rules.max_value) 
    })
  }
  
  return result
}

/**
 * 将 API 验证规则数组转换为前端验证规则对象
 */
export function convertValidationRulesFromDTO(dtoRules: IValidationRuleDTO[] | undefined): IValidateRules {
  const rules: IValidateRules = {}
  
  if (!dtoRules) {
    return rules
  }
  
  for (const rule of dtoRules) {
    switch (rule.rule_type) {
    case 'required':
      rules.required = rule.target_value === '0' || rule.target_value === 'true' || rule.target_value === '1'
      break
    case 'min_selections':
      rules.min_selections = parseInt(rule.target_value, 10)
      break
    case 'max_selections':
      rules.max_selections = parseInt(rule.target_value, 10)
      break
    case 'min_length':
      rules.min_length = parseInt(rule.target_value, 10)
      break
    case 'max_length':
      rules.max_length = parseInt(rule.target_value, 10)
      break
    case 'min_value':
      rules.min_value = parseFloat(rule.target_value)
      break
    case 'max_value':
      rules.max_value = parseFloat(rule.target_value)
      break
    }
  }
  
  return rules
}

// ============ 显隐规则转换 ============

/**
 * 将前端显隐规则转换为 API 格式
 */
export function convertShowControllerToDTO(
  showController: IQuestionShowController
): IShowControllerDTO {
  return {
    rule: showController.rule || 'and',
    questions: showController.questions.map((q) => ({
      code: q.code,
      select_option_codes: q.option_controller.select_option_codes
    }))
  }
}

// ============ 完整转换函数 ============

/**
 * 将前端 IQuestion 转换为 API QuestionDTO
 */
export function convertQuestionToDTO(
  question: IQuestion,
  showController?: IQuestionShowController
): IQuestionDTO {
  const questionType = mapQuestionTypeToAPI(question.type)
  
  // 转换选项（仅选择题需要）
  let options: Array<{ code?: string; content: string; score?: number }> | undefined = undefined
  const needsOptions = ['Radio', 'Checkbox'].includes(questionType)
  
  if (needsOptions && 'options' in question && question.options && Array.isArray(question.options)) {
    const optionList = question.options
      .filter((opt: any) => opt && opt.content)
      .map((opt: any) => ({
        code: opt.code || '',
        content: opt.content || '',
        score: opt.score !== undefined && opt.score !== null ? opt.score : undefined
      }))
    
    // 选择题必须提供至少 2 个选项
    if (optionList.length >= 2) {
      options = optionList
    } else {
      console.warn(`问题 ${question.code} 类型为 ${questionType}，但选项数量不足 2 个，将被忽略`)
    }
  }
  
  // 转换验证规则
  const validationRules = question.validate_rules
    ? convertValidationRulesToDTO(question.validate_rules)
    : undefined
  
  // 转换计算规则
  const calculationRule = (question as any).calc_rule ? {
    formula_type: (question as any).calc_rule?.formula || ''
  } : undefined
  
  // 转换显隐规则
  const showControllerDTO: IShowControllerDTO | undefined = showController
    ? convertShowControllerToDTO(showController)
    : undefined
  
  return {
    code: question.code,
    question_type: questionType,
    stem: question.title || '',
    tips: question.tips || '',
    placeholder: (question as any).placeholder,
    options,
    validation_rules: validationRules && validationRules.length > 0 ? validationRules : undefined,
    calculation_rule: calculationRule,
    show_controller: showControllerDTO
  }
}

/**
 * 将 API QuestionDTO 转换为前端 IQuestion
 */
export function convertQuestionFromDTO(dto: IQuestionDTO): IQuestion {
  const frontendType = mapQuestionTypeFromAPI(dto.question_type)
  
  // 转换验证规则
  const validateRules = convertValidationRulesFromDTO(dto.validation_rules)
  
  // 构建基础问题对象
  const question: any = {
    code: dto.code || '',
    type: frontendType,
    title: dto.stem || '',
    tips: dto.tips || ''
  }
  
  // 只有存在验证规则时才添加
  if (Object.keys(validateRules).length > 0) {
    question.validate_rules = validateRules
  }
  
  // 对于需要验证规则的问题类型，确保至少有一个空的验证规则对象
  if (['Radio', 'Checkbox', 'Text', 'Textarea', 'Number', 'Date'].includes(frontendType)) {
    if (!question.validate_rules) {
      question.validate_rules = {}
    }
  }
  
  // 添加特定属性
  if (dto.placeholder) {
    question.placeholder = dto.placeholder
  }
  
  // 转换选项
  if (dto.options && dto.options.length > 0) {
    question.options = dto.options.map(opt => ({
      code: opt.code,
      content: opt.content || '',
      score: opt.score,
      is_other: false,
      allow_extend_text: false
    }))
  }
  
  // 转换计算规则
  if (dto.calculation_rule) {
    question.calc_rule = {
      formula: dto.calculation_rule.formula_type || ''
    }
  }
  
  return question as IQuestion
}

