import { get, put } from '../qsServer'
import type { QSResponse } from '@/types/qs'

// ==================== 新API接口定义 ====================

// 受试者接口请求参数
export interface IListTesteeRequest {
  org_id?: number
  name?: string
  profile_id?: string
  clinician_id?: string
  is_key_focus?: boolean
  created_start_date?: string
  created_end_date?: string
  page?: number
  page_size?: number
  [key: string]: any
}

// 测评统计（与 API 文档 response.AssessmentStatsResponse 匹配）
export interface IAssessmentStats {
  total_count: number
  last_assessment_at?: string
  last_risk_level?: string
  last_risk_level_label?: string
}

// 监护人信息
export interface IGuardian {
  name: string // 监护人姓名
  relation: string // 与受试者关系（如：父亲、母亲、爷爷等）
  phone: string // 联系电话
}

// GET /testees/{id} - 受试者基础信息（完整版）
export interface ITesteeDetail {
  // ===== 基本信息 =====
  id: number // 受试者ID
  name: string // 姓名
  gender: string // 性别：male/female
  gender_label?: string // 性别中文
  birthday?: string // 出生日期，格式：YYYY-MM-DD
  org_id: number // 机构ID
  profile_id?: number // 用户档案ID
  iam_child_id?: number // IAM儿童ID（已废弃，向后兼容）

  // ===== 扩展信息 =====
  is_key_focus: boolean // 是否重点关注
  is_key_focus_label?: string // 是否重点关注中文
  source?: string // 来源
  source_label?: string // 来源中文

  // ===== 监护人信息 =====
  guardians?: IGuardian[] // 监护人列表（建议后端新增此字段）

  // ===== 统计信息 =====
  assessment_stats?: IAssessmentStats // 测评统计

  // ===== 时间戳 =====
  created_at: string // 创建时间
  updated_at: string // 更新时间
}

// 受试者响应数据（简化版，用于列表）
export interface ITestee {
  id: number
  name: string
  gender: string
  gender_label?: string
  birthday?: string
  org_id: number
  profile_id?: number
  iam_child_id?: number
  is_key_focus: boolean
  is_key_focus_label?: string
  source?: string
  source_label?: string
  assessment_stats?: IAssessmentStats
  created_at: string
  updated_at: string
}

export interface ITesteeListResponse {
  items: ITestee[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

// 更新受试者请求参数
export interface IUpdateTesteeRequest {
  name?: string
  gender?: string
  birthday?: string
  is_key_focus?: boolean
}

// ==================== GET /testees/{id}/scale-analysis - 量表趋势分析 ====================

// 因子得分（某次测评中的单个因子）
export interface IFactorScoreInTest {
  factor_code: string // 因子编码
  factor_name: string // 因子名称
  raw_score: number // 原始分
  t_score?: number // T分
  percentile?: number // 百分位
  risk_level?: string // 风险等级：normal/medium/high
  risk_level_label?: string // 风险等级中文
}

// 单次测评记录（用于趋势分析）
export interface ITestRecord {
  assessment_id: number // 测评ID
  test_date: string // 测评日期，格式：YYYY-MM-DD HH:mm:ss
  total_score: number // 总分
  risk_level: string // 风险等级：normal/medium/high
  risk_level_label?: string // 风险等级中文
  result?: string // 结果描述
  factors: IFactorScoreInTest[] // 各因子得分
}

// 单个量表的趋势分析数据
export interface IScaleTrend {
  scale_id: number // 量表ID
  scale_code: string // 量表编码
  scale_name: string // 量表名称
  tests: ITestRecord[] // 测评历史记录（按时间升序排列）
}

// 量表趋势分析响应（可能包含多个量表）
export interface IScaleAnalysisResponse {
  scales: IScaleTrend[] // 量表趋势列表
}

// 受试者API
export const testeeApi = {
  // 查询受试者列表
  listTestees: (params: IListTesteeRequest): Promise<[any, QSResponse<ITesteeListResponse> | undefined]> => {
    return get<ITesteeListResponse>('/testees', params)
  },

  // GET /testees/{id} - 获取受试者详情（含监护人、统计等完整信息）
  getTestee: (id: number | string): Promise<[any, QSResponse<ITesteeDetail> | undefined]> => {
    return get<ITesteeDetail>(`/testees/${id}`)
  },

  // PUT /testees/{id} - 更新受试者
  updateTestee: (id: number | string, data: IUpdateTesteeRequest): Promise<[any, QSResponse<ITesteeDetail> | undefined]> => {
    return put<ITesteeDetail>(`/testees/${id}`, data)
  },

  // GET /testees/{id}/scale-analysis - 获取量表趋势分析
  // 返回该受试者在各个量表上的历史测评数据，用于绘制趋势图表
  getScaleAnalysis: (id: number | string): Promise<[any, QSResponse<IScaleAnalysisResponse> | undefined]> => {
    return get<IScaleAnalysisResponse>(`/testees/${id}/scale-analysis`)
  }
}
