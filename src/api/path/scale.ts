import { get, post, put } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import { IQuestionSheetInfo } from '@/models/questionSheet'
import { IFactor } from '@/models/factor'

// ============ 类型定义 ============

// 因子响应数据（API 格式）
export interface IFactorResponse {
  code: string
  title: string
  factor_type: string
  question_codes: string[]
  scoring_strategy: string
  is_total_score: boolean
  scoring_params?: Record<string, any> // map[string]interface{}，cnt 策略包含 cnt_option_contents (string[])
  interpret_rules?: Array<{
    min_score: number
    max_score: number
    conclusion: string
    suggestion: string
    risk_level: string
  }>
}

// 量表响应数据
export interface IScaleResponse {
  code: string
  title: string
  description?: string
  status: string
  questionnaire_code: string
  questionnaire_version: string
  category?: string // 主类：ADHD、抽动障碍、感统、执行功能、心理健康、神经发育筛查、慢性病管理、生活质量
  stages?: string[] // 阶段列表（数组）：screening(筛查)、deep_assessment(深评)、follow_up(随访)、outcome(结局)
  applicable_ages?: string[] // 使用年龄列表（数组）：infant(婴幼儿)、preschool(学龄前)、school_child(学龄儿童)、adolescent(青少年)、adult(成人)
  reporters?: string[] // 填报人列表（数组）：parent(家长评)、teacher(教师评)、self(自评)、clinical(临床评定)
  tags?: string[] // 标签数组（动态输入）
  factors?: IFactorResponse[]
}

// 量表列表响应
export interface IScaleListResponse {
  scales: IScaleResponse[]
  page: number
  page_size: number
  total_count: number
}

// 分类选项响应
export interface ICategoryOption {
  label: string
  value: string
}

export interface IStageOption {
  label: string
  value: string
}

export interface IApplicableAgeOption {
  label: string
  value: string
}

export interface IReporterOption {
  label: string
  value: string
}

export interface ITagOption {
  category: string
  label: string
  value: string
}

// 量表分类响应
export interface IScaleCategoriesResponse {
  categories: ICategoryOption[]
  stages: IStageOption[]
  applicable_ages: IApplicableAgeOption[]
  reporters: IReporterOption[]
  tags: ITagOption[]
}

// ============ API 函数 ============

/**
 * 获取量表列表
 * GET /scales
 */
export async function getScaleList(
  page = 1,
  page_size = 10,
  keyword?: string
): Promise<[any, QSResponse<IScaleListResponse> | undefined]> {
  const params: any = {
    page,
    page_size
  }
  if (keyword) {
    params.title = keyword
  }
  return get<IScaleListResponse>('/scales', params)
}

/**
 * 将 ScaleResponse 转换为 IQuestionSheetInfo
 * 注意：使用 questionnaire_code 作为 id，因为量表关联的问卷才是实际的数据源
 */
function convertScaleToQuestionSheetInfo(scale: IScaleResponse): IQuestionSheetInfo & { scaleCode?: string } {
  return {
    id: scale.questionnaire_code, // 使用问卷编码作为 id，用于获取问卷详情和统计
    title: scale.title,
    desc: scale.description || '',
    img_url: '',
    question_cnt: '0', // 需要从问卷接口获取
    answersheet_cnt: '0', // 需要从统计接口获取
    create_user: '',
    last_update_user: '',
    createtime: '',
    scaleCode: scale.code // 保存量表编码，用于编辑量表
  } as IQuestionSheetInfo & { scaleCode?: string }
}

/**
 * 获取量表列表（兼容旧格式）
 * 返回格式与旧 API 保持一致
 */
export async function getScaleListCompat(
  pagesize: string,
  pagenum: string,
  keyword?: string
): Promise<[any, { data: { pagesize: string; pagenum: string; total_count: string; list: IQuestionSheetInfo[] } } | undefined]> {
  const [err, res] = await getScaleList(
    parseInt(pagenum, 10),
    parseInt(pagesize, 10),
    keyword
  )
  
  if (err || !res?.data) {
    return [err, undefined]
  }

  // 转换数据格式
  const list = res.data.scales.map(convertScaleToQuestionSheetInfo)
  
  return [null, {
    data: {
      pagesize: String(res.data.page_size),
      pagenum: String(res.data.page),
      total_count: String(res.data.total_count),
      list
    }
  }]
}

/**
 * 获取量表详情（根据问卷编码）
 * GET /scales/by-questionnaire
 */
export async function getScaleByQuestionnaire(
  questionnaireCode: string
): Promise<[any, QSResponse<IScaleResponse> | undefined]> {
  console.log('调用 getScaleByQuestionnaire，questionnaireCode:', questionnaireCode)
  const [err, res] = await get<IScaleResponse>('/scales/by-questionnaire', { questionnaireCode })
  console.log('getScaleByQuestionnaire 返回:', { 
    hasError: !!err, 
    hasData: !!res?.data,
    factorsCount: res?.data?.factors?.length 
  })
  return [err, res]
}

/**
 * 获取量表详情（根据量表编码）
 * GET /scales/{code}
 */
export async function getScaleDetail(
  scaleCode: string
): Promise<[any, QSResponse<IScaleResponse> | undefined]> {
  return get<IScaleResponse>(`/scales/${scaleCode}`)
}

/**
 * 将 API 返回的 FactorResponse 转换为前端的 IFactor
 */
function convertFactorFromAPI(apiFactor: IFactorResponse): IFactor {
  // 映射因子类型
  const typeMap: Record<string, 'first_grade' | 'multi_grade'> = {
    'first_grade': 'first_grade',
    'multi_grade': 'multi_grade'
  }
  
  // 映射计算公式
  const formulaMap: Record<string, 'sum' | 'avg' | 'cnt'> = {
    'sum': 'sum',
    'avg': 'avg',
    'cnt': 'cnt'
  }
  
  const scoringParams = apiFactor.scoring_params || {}
  const cntOptionContents = scoringParams.cnt_option_contents
  
  return {
    code: apiFactor.code,
    title: apiFactor.title,
    type: typeMap[apiFactor.factor_type] || 'first_grade',
    source_codes: Array.isArray(apiFactor.question_codes) ? apiFactor.question_codes : [],
    calc_rule: {
      formula: formulaMap[apiFactor.scoring_strategy] || 'sum',
      append_params: {
        cnt_option_contents: Array.isArray(cntOptionContents) ? cntOptionContents : []
      }
    },
    is_total_score: apiFactor.is_total_score ? '1' : '0'
  }
}

/**
 * 获取因子列表（根据量表编码）
 * GET /scales/{code}/factors
 * 响应格式：FactorListResponse { factors: FactorResponse[] }
 */
export async function getFactorListByScaleCode(
  scaleCode: string
): Promise<[any, QSResponse<{ factors: IFactor[]; rawFactors?: IFactorResponse[] }> | undefined]> {
  const [err, res] = await get<{ factors: IFactorResponse[] }>(`/scales/${scaleCode}/factors`)
  
  if (err || !res?.data) {
    return [err, undefined]
  }
  
  // API 返回格式：{ factors: IFactorResponse[] }
  const apiFactors = res.data.factors || []
  const factors = apiFactors.map(convertFactorFromAPI)
  
  console.log('获取因子列表（通过量表编码）:', {
    scaleCode,
    apiFactorsCount: apiFactors.length,
    convertedFactorsCount: factors.length
  })
  
  return [null, {
    code: res.code,
    message: res.message,
    data: { 
      factors,
      rawFactors: apiFactors // 保留原始 API 数据，用于获取 interpret_rules
    }
  }]
}

/**
 * 获取因子列表（根据问卷编码）
 * 从量表详情中提取因子列表（兼容旧接口）
 */
export async function getFactorListByQuestionnaire(
  questionnaireCode: string
): Promise<[any, QSResponse<{ factors: IFactor[] }> | undefined]> {
  const [err, res] = await getScaleByQuestionnaire(questionnaireCode)
  
  if (err || !res?.data) {
    return [err, undefined]
  }
  
  // 如果有量表编码，优先使用新接口
  if (res.data.code) {
    return getFactorListByScaleCode(res.data.code)
  }
  
  // 否则从量表详情中提取因子列表
  const apiFactors = res.data.factors || []
  const factors = apiFactors.map(convertFactorFromAPI)
  
  console.log('获取因子列表（通过问卷编码）:', {
    questionnaireCode,
    apiFactorsCount: apiFactors.length,
    convertedFactorsCount: factors.length
  })
  
  return [null, {
    code: res.code,
    message: res.message,
    data: { factors }
  }]
}

/**
 * 创建量表
 * POST /scales
 */
export async function createScale(
  data: {
    title: string
    description?: string
    questionnaire_code?: string
    questionnaire_version?: string
    category?: string
    stages?: string[]
    applicable_ages?: string[]
    reporters?: string[]
    tags?: string[]
  }
): Promise<[any, QSResponse<IScaleResponse> | undefined]> {
  return post<IScaleResponse>('/scales', {
    title: data.title,
    description: data.description,
    questionnaire_code: data.questionnaire_code,
    questionnaire_version: data.questionnaire_version,
    category: data.category,
    stages: data.stages || [],
    applicable_ages: data.applicable_ages || [],
    reporters: data.reporters || [],
    tags: data.tags || []
  })
}

/**
 * 更新量表基本信息
 * PUT /scales/{code}/basic-info
 */
export async function updateScaleBasicInfo(
  scaleCode: string,
  data: {
    title: string
    description?: string
    category?: string
    stages?: string[]
    applicable_ages?: string[]
    reporters?: string[]
    tags?: string[]
  }
): Promise<[any, QSResponse<IScaleResponse> | undefined]> {
  return put<IScaleResponse>(`/scales/${scaleCode}/basic-info`, {
    title: data.title,
    description: data.description,
    category: data.category,
    stages: data.stages || [],
    applicable_ages: data.applicable_ages || [],
    reporters: data.reporters || [],
    tags: data.tags || []
  })
}

/**
 * 发布量表
 * POST /scales/{code}/publish
 * 注意：需要在请求体中传递 code 参数
 */
export async function publishScale(
  scaleCode: string
): Promise<[any, QSResponse<IScaleResponse> | undefined]> {
  return post<IScaleResponse>(`/scales/${scaleCode}/publish`, { code: scaleCode })
}

/**
 * 取消发布量表
 * POST /scales/{code}/unpublish
 * 注意：需要在请求体中传递 code 参数
 */
export async function unpublishScale(
  scaleCode: string
): Promise<[any, QSResponse<IScaleResponse> | undefined]> {
  return post<IScaleResponse>(`/scales/${scaleCode}/unpublish`, { code: scaleCode })
}

/**
 * 获取量表分类列表
 * GET /scales/categories
 */
export async function getScaleCategories(): Promise<[any, QSResponse<IScaleCategoriesResponse> | undefined]> {
  return get<IScaleCategoriesResponse>('/scales/categories')
}

export const scaleApi = {
  getScaleList,
  getScaleListCompat,
  getScaleByQuestionnaire,
  getScaleDetail,
  getFactorListByScaleCode,
  getFactorListByQuestionnaire,
  createScale,
  updateScaleBasicInfo,
  publishScale,
  unpublishScale,
  getScaleCategories
}
