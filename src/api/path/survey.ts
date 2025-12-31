import { get, post, put, del } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import { IQuestion, IQuestionShowController } from '@/models/question'
import { convertQuestionToDTO } from './questionConverter'

// ============ 类型定义 ============

// 问卷响应数据
export interface IQuestionnaireResponse {
  code: string
  title: string
  description?: string
  img_url?: string
  status: number // 0=草稿, 1=已发布, 2=已归档
  type: string
  version: string
  questions: any[] // QuestionDTO[]
}

// 问卷列表响应
export interface IQuestionnaireListResponse {
  questionnaires: IQuestionnaireResponse[]
  page: number
  page_size: number
  total_count: number
}

// 创建问卷请求
export interface ICreateQuestionnaireRequest {
  title: string
  description?: string
  img_url?: string
  type: string
}

// 更新问卷基本信息请求
export interface IUpdateQuestionnaireBasicInfoRequest {
  title?: string
  description?: string
  img_url?: string
  type?: string
}

// 显示控制器条件 DTO
export interface IShowControllerConditionDTO {
  code: string
  select_option_codes: string[]
}

// 显示控制器 DTO
export interface IShowControllerDTO {
  rule: 'and' | 'or'
  questions: IShowControllerConditionDTO[]
}

// 问题 DTO（API 格式）
export interface IQuestionDTO {
  code?: string
  question_type: string
  stem: string
  tips?: string
  placeholder?: string
  options?: IOptionDTO[]
  validation_rules?: IValidationRuleDTO[]
  calculation_rule?: ICalculationRuleDTO
  show_controller?: IShowControllerDTO
}

// 选项 DTO
export interface IOptionDTO {
  code?: string
  content: string
  score?: number
}

// 验证规则 DTO
export interface IValidationRuleDTO {
  rule_type: string
  target_value: string
}

// 计算规则 DTO
export interface ICalculationRuleDTO {
  formula_type?: string
}

// 添加问题请求
export interface IAddQuestionRequest {
  code?: string
  type: string
  stem: string
  description?: string
  options?: IOptionDTO[]
  required?: boolean
}

// 更新问题请求
export interface IUpdateQuestionRequest {
  code?: string
  type: string
  stem: string
  description?: string
  options?: IOptionDTO[]
  required?: boolean
}

// 重排问题请求
export interface IReorderQuestionsRequest {
  question_codes: string[]
}

// ============ API 函数 ============

/**
 * 创建问卷（添加基本信息）
 * POST /questionnaires
 */
export async function createSurvey(data: {
  title: string
  desc?: string
  img_url?: string
  type?: string
}): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  const requestData: ICreateQuestionnaireRequest = {
    title: data.title,
    description: data.desc,
    img_url: data.img_url,
    type: data.type || 'survey'
  }
  return post<IQuestionnaireResponse>('/questionnaires', requestData)
}

/**
 * 更新问卷基本信息
 * PUT /questionnaires/{code}/basic-info
 */
export async function updateSurvey(data: {
  questionsheetid: string
  title: string
  desc?: string
  img_url?: string
  type?: string
}): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  const requestData: IUpdateQuestionnaireBasicInfoRequest = {
    title: data.title,
    description: data.desc,
    img_url: data.img_url,
    type: data.type
  }
  return put<IQuestionnaireResponse>(`/questionnaires/${data.questionsheetid}/basic-info`, requestData)
}

/**
 * 获取问卷信息
 * GET /questionnaires/{code}
 */
export async function getSurvey(
  questionsheetid: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  return get<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}`)
}


/**
 * 保存问卷题目（批量更新）
 * PUT /questionnaires/{code}/questions/batch
 * 包含显隐规则（show_controller）
 */
export async function saveSurveyQuestions(
  questionsheetid: string,
  questions: IQuestion[],
  showControllers?: Array<{ code: string; show_controller: IQuestionShowController }>
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  // 创建显隐规则映射，便于快速查找
  const showControllerMap = new Map<string, IQuestionShowController>()
  if (showControllers) {
    showControllers.forEach((item) => {
      showControllerMap.set(item.code, item.show_controller)
    })
  }
  
  // 转换问题数据为 API 格式，并合并显隐规则
  const questionDTOs = questions.map(q => {
    try {
      const showController = showControllerMap.get(q.code)
      return convertQuestionToDTO(q, showController)
    } catch (error) {
      console.error('转换问题数据失败:', q, error)
      throw error
    }
  })
  
  console.log('批量保存问题（包含显隐规则）:', {
    questionsheetid,
    questionCount: questionDTOs.length,
    questionTypes: questionDTOs.map(q => q.question_type),
    showControllerCount: showControllerMap.size,
    sampleQuestion: questionDTOs[0]
  })
  
  return put<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/questions/batch`, {
    questions: questionDTOs
  })
}

/**
 * 获取问卷题目列表（从问卷详情中获取）
 * GET /questionnaires/{code}
 */
export async function getSurveyQuestions(
  questionsheetid: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  return get<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}`)
}

/**
 * 发布问卷
 * POST /questionnaires/{code}/publish
 * 注意：此接口不需要请求体，只需要路径参数 code
 */
export async function publishSurvey(
  questionsheetid: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  // POST 请求可以不传请求体（传递 undefined 或 null）
  return post<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/publish`, undefined)
}

/**
 * 下架问卷
 * POST /questionnaires/{code}/unpublish
 * 注意：此接口不需要请求体，只需要路径参数 code
 */
export async function unpublishSurvey(
  questionsheetid: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  // POST 请求可以不传请求体（传递 undefined 或 null）
  return post<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/unpublish`, undefined)
}

/**
 * 保存草稿
 * POST /questionnaires/{code}/draft
 * 注意：此接口不需要请求体，只需要路径参数 code
 */
export async function saveDraft(
  questionsheetid: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  // POST 请求可以不传请求体（传递 undefined 或 null）
  return post<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/draft`, undefined)
}

/**
 * 删除问卷
 * DELETE /questionnaires/{code}
 */
export async function deleteSurvey(
  questionsheetid: string
): Promise<[any, QSResponse<void> | undefined]> {
  return del<void>(`/questionnaires/${questionsheetid}`)
}

/**
 * 归档问卷
 * POST /questionnaires/{code}/archive
 */
export async function archiveSurvey(
  questionsheetid: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  return post<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/archive`, {})
}

/**
 * 查询问卷列表
 * GET /questionnaires
 */
export async function listQuestionnaires(params: {
  page?: number
  page_size?: number
  status?: string
  title?: string
}): Promise<[any, QSResponse<IQuestionnaireListResponse> | undefined]> {
  return get<IQuestionnaireListResponse>('/questionnaires', params)
}

/**
 * 添加问题
 * POST /questionnaires/{code}/questions
 */
export async function addQuestion(
  questionsheetid: string,
  question: IQuestion
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  const questionDTO = convertQuestionToDTO(question)
  const requestData: IAddQuestionRequest = {
    code: questionDTO.code,
    type: questionDTO.question_type,
    stem: questionDTO.stem,
    description: questionDTO.tips,
    options: questionDTO.options,
    required: questionDTO.validation_rules?.some(r => r.rule_type === 'required') || false
  }
  return post<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/questions`, requestData)
}

/**
 * 更新问题
 * PUT /questionnaires/{code}/questions/{questionCode}
 */
export async function updateQuestion(
  questionsheetid: string,
  questionCode: string,
  question: IQuestion
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  const questionDTO = convertQuestionToDTO(question)
  const requestData: IUpdateQuestionRequest = {
    code: questionDTO.code,
    type: questionDTO.question_type,
    stem: questionDTO.stem,
    description: questionDTO.tips,
    options: questionDTO.options,
    required: questionDTO.validation_rules?.some(r => r.rule_type === 'required') || false
  }
  return put<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/questions/${questionCode}`, requestData)
}

/**
 * 删除问题
 * DELETE /questionnaires/{code}/questions/{questionCode}
 */
export async function deleteQuestion(
  questionsheetid: string,
  questionCode: string
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  return del<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/questions/${questionCode}`)
}

/**
 * 重排问题顺序
 * POST /questionnaires/{code}/questions/reorder
 */
export async function reorderQuestions(
  questionsheetid: string,
  questionCodes: string[]
): Promise<[any, QSResponse<IQuestionnaireResponse> | undefined]> {
  const requestData: IReorderQuestionsRequest = {
    question_codes: questionCodes
  }
  return post<IQuestionnaireResponse>(`/questionnaires/${questionsheetid}/questions/reorder`, requestData)
}

/**
 * 保存问卷路由配置（保留旧接口兼容性）
 */
export async function saveSurveyRouting(
  questionsheetid: string,
  routingConfig: IQuestion[]
): Promise<[any, QSResponse<any> | undefined]> {
  // 此接口不在新 API 文档中，保留兼容性
  return post<any>('/api/survey/routing/save', {
    questionsheetid,
    routing: routingConfig
  })
}

// 小程序码响应
export interface IQRCodeResponse {
  qrcode_url: string
}

/**
 * 获取问卷小程序码
 * GET /questionnaires/{code}/qrcode?version=v1.0  # 指定版本
 * GET /questionnaires/{code}/qrcode               # 使用最新版本
 */
export async function getQuestionnaireQRCode(
  code: string,
  version?: string
): Promise<[any, QSResponse<IQRCodeResponse> | undefined]> {
  const params = version ? { version } : undefined
  return get<IQRCodeResponse>(`/questionnaires/${code}/qrcode`, params)
}

export const surveyApi = {
  createSurvey,
  updateSurvey,
  getSurvey,
  saveSurveyQuestions,
  getSurveyQuestions,
  publishSurvey,
  unpublishSurvey,
  saveDraft,
  deleteSurvey,
  archiveSurvey,
  listQuestionnaires,
  saveSurveyRouting,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getQuestionnaireQRCode
}
