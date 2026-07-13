import type { QSResponse } from '@/types/qs'
import type { IFactor } from '@/models/factor'
import type { IFactorAnalysis } from '@/models/analysis'
import type { IQuestionSheetInfo } from '@/models/questionSheet'
import {
  analysisFromScaleResponse,
  factorToEditorModel,
  projectScaleFactorsFromDefinition,
  replaceScaleDefinitionFactors,
} from '@/models/scaleDefinitionV2.adapter'
import type {
  IScaleFactorResponse,
  RawDefinition,
  ScaleAnalysis,
} from '@/models/scaleDefinitionV2.adapter'

export {
  analysisFromScaleResponse,
  factorToEditorModel,
  projectScaleFactorsFromDefinition,
  replaceScaleDefinitionFactors,
} from '@/models/scaleDefinitionV2.adapter'
export type {
  IScaleFactorResponse,
  ScaleAnalysis,
} from '@/models/scaleDefinitionV2.adapter'
import {
  createAssessmentModel,
  getAssessmentModel,
  getAssessmentModelDefinition,
  getAssessmentModelOptions,
  getAssessmentModelQRCode,
  listAssessmentModels,
  publishAssessmentModel,
  saveAssessmentModelDefinition,
  unpublishAssessmentModel,
  updateAssessmentModelBasicInfo,
} from './assessmentModel'

export interface IScaleDefinitionResponse {
  code: string
  title: string
  description?: string
  status: string
  questionnaire_code: string
  questionnaire_version: string
  category?: string
  stages?: string[]
  applicable_ages?: string[]
  reporters?: string[]
  tags?: string[]
  factors?: IScaleFactorResponse[]
}

export interface IScaleDefinitionOptions {
  categories: Array<{ value: string; label: string }>
  stages: Array<{ value: string; label: string }>
  applicable_ages: Array<{ value: string; label: string }>
  reporters: Array<{ value: string; label: string }>
  tags: Array<{ value: string; label: string }>
}

const asArray = <T = any>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []
const asString = (value: unknown): string => value === undefined || value === null ? '' : String(value)

const modelProjection = (model: any, definition?: RawDefinition): IScaleDefinitionResponse => ({
  code: asString(model?.code),
  title: asString(model?.title),
  description: asString(model?.description),
  status: asString(model?.status),
  questionnaire_code: asString(model?.questionnaire_code),
  questionnaire_version: asString(model?.questionnaire_version),
  category: asString(model?.category),
  stages: asArray<string>(model?.stages),
  applicable_ages: asArray<string>(model?.applicable_ages),
  reporters: asArray<string>(model?.reporters),
  tags: asArray<string>(model?.tags),
  factors: definition ? projectScaleFactorsFromDefinition(definition) : undefined,
})

const withMappedResponse = <T, U>(
  response: QSResponse<T> | undefined,
  mapper: (data: T) => U,
): QSResponse<U> | undefined => response ? { ...response, data: mapper(response.data) } : undefined

async function findScaleModel(questionnaireCode: string): Promise<[any, any | undefined]> {
  const [err, response] = await listAssessmentModels({ kind: 'scale', questionnaire_code: questionnaireCode })
  if (err) return [err, undefined]
  const model = response?.data?.models?.[0]
  if (!model) return [new Error('未找到关联的量表模型'), undefined]
  return [null, model]
}

async function loadScaleDefinition(code: string): Promise<[any, RawDefinition | undefined]> {
  const [err, response] = await getAssessmentModelDefinition(code)
  return [err, response?.data as RawDefinition | undefined]
}

export async function getScaleModelByQuestionnaire(questionnaireCode: string): Promise<[any, QSResponse<IScaleDefinitionResponse> | undefined]> {
  const [findErr, summary] = await findScaleModel(questionnaireCode)
  if (findErr || !summary) return [findErr, undefined]
  return getScaleModel(summary.code)
}

export async function getScaleList(
  page = 1,
  pageSize = 10,
  keyword?: string,
  status?: string,
  category?: string,
): Promise<[any, QSResponse<{ scales: IScaleDefinitionResponse[]; page: number; page_size: number; total_count: number }> | undefined]> {
  const [err, response] = await listAssessmentModels({ kind: 'scale', page, page_size: pageSize, keyword, status, category })
  return [err, withMappedResponse(response, (data: any) => ({
    scales: asArray(data?.models).map((model) => modelProjection(model)),
    page: data?.page || page,
    page_size: data?.page_size || pageSize,
    total_count: data?.total_count || 0,
  }))]
}

export async function getScaleListCompat(
  pageSize: string,
  page: string,
  keyword?: string,
  status?: string,
  category?: string,
): Promise<[any, { data: { pagesize: string; pagenum: string; total_count: string; list: IQuestionSheetInfo[] } } | undefined]> {
  const [err, response] = await getScaleList(Number(page), Number(pageSize), keyword, status, category)
  if (err || !response?.data) return [err, undefined]
  return [null, {
    data: {
      pagesize: String(response.data.page_size),
      pagenum: String(response.data.page),
      total_count: String(response.data.total_count),
      list: response.data.scales.map((scale) => ({
        id: scale.questionnaire_code,
        title: scale.title,
        desc: scale.description || '',
        img_url: '',
        question_cnt: '0',
        answersheet_cnt: '0',
        create_user: '',
        last_update_user: '',
        createtime: '',
        last_update_time: '',
        status: scale.status,
        category: scale.category || '',
        reporters: scale.reporters || [],
        stages: scale.stages || [],
        tags: scale.tags || [],
        scaleCode: scale.code,
      }) as IQuestionSheetInfo),
    },
  }]
}

export async function getScaleModel(code: string): Promise<[any, QSResponse<IScaleDefinitionResponse> | undefined]> {
  const [modelErr, modelResponse] = await getAssessmentModel(code)
  if (modelErr || !modelResponse?.data) return [modelErr, undefined]
  const [definitionErr, definition] = await loadScaleDefinition(code)
  if (definitionErr) return [definitionErr, undefined]
  return [null, withMappedResponse(modelResponse, (model) => modelProjection(model, definition))]
}

export async function createScaleModel(data: {
  title: string
  description?: string
  questionnaire_code?: string
  questionnaire_version?: string
  category?: string
  stages?: string[]
  applicable_ages?: string[]
  reporters?: string[]
  tags?: string[]
}): Promise<[any, QSResponse<IScaleDefinitionResponse> | undefined]> {
  const [err, response] = await createAssessmentModel({
    kind: 'scale',
    sub_kind: '',
    algorithm: 'scale_default',
    product_channel: 'medical_scale',
    title: data.title,
    description: data.description,
    questionnaire_code: data.questionnaire_code,
    questionnaire_version: data.questionnaire_version,
    category: data.category,
    tags: data.tags,
    stages: data.stages,
    applicable_ages: data.applicable_ages,
    reporters: data.reporters,
  } as any)
  return [err, withMappedResponse(response, (model) => modelProjection(model))]
}

export async function updateScaleModelBasicInfo(
  code: string,
  data: Omit<Parameters<typeof createScaleModel>[0], 'questionnaire_code' | 'questionnaire_version'>,
): Promise<[any, QSResponse<IScaleDefinitionResponse> | undefined]> {
  const [err, response] = await updateAssessmentModelBasicInfo(code, data as any)
  return [err, withMappedResponse(response, (model) => modelProjection(model))]
}

export async function publishScaleModel(code: string): Promise<[any, QSResponse<any> | undefined]> {
  return publishAssessmentModel(code)
}

export async function unpublishScaleModel(code: string): Promise<[any, QSResponse<any> | undefined]> {
  return unpublishAssessmentModel(code)
}

export async function getScaleDefinitionOptions(): Promise<[any, QSResponse<IScaleDefinitionOptions> | undefined]> {
  const [err, response] = await getAssessmentModelOptions('scale')
  return [err, withMappedResponse(response, (options: any) => ({
    categories: asArray(options?.categories),
    stages: asArray(options?.stages),
    applicable_ages: asArray(options?.applicable_ages),
    reporters: asArray(options?.reporters),
    tags: [],
  }))]
}

export async function getScaleModelQRCode(code: string): Promise<[any, QSResponse<any> | undefined]> {
  return getAssessmentModelQRCode(code)
}

type FactorListResponse = QSResponse<{ factors: IFactor[]; rawFactors: IScaleFactorResponse[] }>

export async function getFactorsByScaleCode(code: string): Promise<[any, FactorListResponse | undefined]> {
  const [err, response] = await getScaleModel(code)
  if (err || !response?.data) return [err, undefined]
  const rawFactors = response.data.factors || []
  return [null, {
    code: response.code,
    message: response.message,
    data: { factors: rawFactors.map(factorToEditorModel), rawFactors },
  }]
}

export async function getFactorsByQuestionnaire(questionnaireCode: string): Promise<[any, FactorListResponse | undefined]> {
  const [err, response] = await getScaleModelByQuestionnaire(questionnaireCode)
  if (err || !response?.data) return [err, undefined]
  const rawFactors = response.data.factors || []
  return [null, {
    code: response.code,
    message: response.message,
    data: { factors: rawFactors.map(factorToEditorModel), rawFactors },
  }]
}

export async function saveScaleFactors(code: string, factors: any[]): Promise<[any, QSResponse<RawDefinition> | undefined]> {
  const [loadErr, definition] = await loadScaleDefinition(code)
  if (loadErr || !definition) return [loadErr || new Error('量表定义不存在'), undefined]
  const next = replaceScaleDefinitionFactors(definition, factors)
  return saveAssessmentModelDefinition(code, next as any) as Promise<[any, QSResponse<RawDefinition> | undefined]>
}

export async function saveScaleFactorsByQuestionnaire(
  questionnaireCode: string,
  factors: any[],
): Promise<[any, QSResponse<RawDefinition> | undefined]> {
  const [err, model] = await findScaleModel(questionnaireCode)
  if (err || !model) return [err, undefined] as [any, QSResponse<RawDefinition> | undefined]
  return saveScaleFactors(model.code, factors)
}

export async function getScaleAnalysis(
  questionnaireCode: string,
): Promise<[any, QSResponse<ScaleAnalysis> | undefined]> {
  const [err, response] = await getScaleModelByQuestionnaire(questionnaireCode)
  return [err, withMappedResponse(response, analysisFromScaleResponse)]
}

export async function saveScaleAnalysis(
  questionnaireCode: string,
  rules: IFactorAnalysis[],
): Promise<[any, QSResponse<RawDefinition> | undefined]> {
  const [detailErr, response] = await getScaleModelByQuestionnaire(questionnaireCode)
  if (detailErr || !response?.data) return [detailErr, undefined]
  const factors = (response.data.factors || []).map((factor) => {
    const rule = rules.find((item) => item.code === factor.code)
    return {
      ...factorToEditorModel(factor),
      is_show: rule?.interpret_rule.is_show !== '0',
      interpret_rules: rule?.interpret_rule.interpretation.map((item) => ({
        min_score: Number(item.start) || 0,
        max_score: Number(item.end) || 0,
        conclusion: item.conclusion,
        suggestion: item.suggestion,
        risk_level: item.risk_level || 'none',
      })) || factor.interpret_rules,
    }
  })
  return saveScaleFactors(response.data.code, factors)
}

export const getScaleByQuestionnaire = getScaleModelByQuestionnaire
export const getScaleDetail = getScaleModel
export const createScale = createScaleModel
export const updateScaleBasicInfo = updateScaleModelBasicInfo
export const publishScale = publishScaleModel
export const unpublishScale = unpublishScaleModel
export const getScaleCategories = getScaleDefinitionOptions
export const getScaleQRCode = getScaleModelQRCode
export const getFactorListByScaleCode = getFactorsByScaleCode
export const getFactorListByQuestionnaire = getFactorsByQuestionnaire

export async function modifyFactorList(
  scaleCodeOrQuestionnaireCode: string,
  factors: any[],
  isQuestionnaireCode = false,
  _questions?: unknown[],
): Promise<[any, QSResponse<RawDefinition> | undefined]> {
  void _questions
  if (isQuestionnaireCode) {
    return saveScaleFactorsByQuestionnaire(scaleCodeOrQuestionnaireCode, factors)
  }
  return saveScaleFactors(scaleCodeOrQuestionnaireCode, factors)
}

export const getFactorList = getFactorsByQuestionnaire
export const getAnalysis = getScaleAnalysis
export const modifyAnalysis = saveScaleAnalysis
export type IScaleResponse = IScaleDefinitionResponse

export const scaleDefinitionApi = {
  getScaleList,
  getScaleListCompat,
  getScaleModelByQuestionnaire,
  getScaleModel,
  createScaleModel,
  updateScaleModelBasicInfo,
  publishScaleModel,
  unpublishScaleModel,
  getScaleDefinitionOptions,
  getScaleModelQRCode,
  getFactorsByScaleCode,
  getFactorsByQuestionnaire,
  saveScaleFactors,
  saveScaleFactorsByQuestionnaire,
  getScaleAnalysis,
  saveScaleAnalysis,
  getScaleByQuestionnaire,
  getScaleDetail,
  createScale,
  updateScaleBasicInfo,
  publishScale,
  unpublishScale,
  getScaleCategories,
  getScaleQRCode,
  getFactorListByScaleCode,
  getFactorListByQuestionnaire,
  getFactorList,
  modifyFactorList,
  getAnalysis,
  modifyAnalysis,
}
