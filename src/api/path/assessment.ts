import { get } from '../qsServer'
import type { QSResponse } from '@/types/qs'

// 测评列表请求参数
export interface IListAssessmentRequest {
  page?: number
  page_size?: number
  status?: string
  testee_id?: number
}

// 测评响应数据（根据 API 文档 response.AssessmentResponse）
export interface IAssessment {
  id: string                    // 测评ID
  answer_sheet_id: string       // 答卷ID
  testee_id: string            // 受试者ID
  medical_scale_code: string   // 量表编码
  medical_scale_id: string     // 量表ID
  medical_scale_name: string   // 量表名称
  questionnaire_code: string   // 问卷编码（唯一标识）
  questionnaire_version: string // 问卷版本
  total_score: number          // 总分
  risk_level: string           // 风险等级
  status: string               // 状态
  submitted_at: string         // 提交时间
  interpreted_at?: string      // 解读时间
  failed_at?: string           // 失败时间
  failure_reason?: string      // 失败原因
  org_id: string               // 组织ID
  origin_id?: string           // 来源ID
  origin_type?: string         // 来源类型
}

// 测评列表响应
export interface IAssessmentListResponse {
  items: IAssessment[]
  page: number
  page_size: number
  total: number
  total_pages: number
}

// 因子得分项（根据 API 文档 response.FactorScoreItem）
export interface IFactorScoreItem {
  factor_code: string
  factor_name: string
  raw_score: number
  max_score?: number
  risk_level?: string
  conclusion?: string
  suggestion?: string
  is_total_score?: boolean
}

// 因子得分（向后兼容，保留旧接口）
export interface IFactorScore {
  factor_code: string
  factor_name: string
  raw_score: number
  max_score?: number
  t_score?: number
  percentile?: number
  risk_level?: string
}

// 得分响应（根据 API 文档 response.ScoreResponse）
export interface IScoreResponse {
  assessment_id: string
  factor_scores: IFactorScoreItem[]
  total_score: number
  risk_level: string
}

// 维度项（根据 API 文档 response.DimensionItem）
export interface IDimensionItem {
  factor_code: string
  factor_name: string
  raw_score: number
  max_score?: number
  risk_level: string
  description?: string
  suggestion?: string
}

// 建议项（根据 API 文档 response.SuggestionItem）
export interface ISuggestionItem {
  category?: string
  content: string
  factor_code?: string
}

// 报告响应（根据 API 文档 response.ReportResponse）
export interface IReportResponse {
  assessment_id: string
  conclusion?: string
  created_at?: string
  dimensions: IDimensionItem[]
  risk_level: string
  scale_code: string
  scale_name: string
  suggestions: ISuggestionItem[]
  total_score: number
}

// 高风险因子响应（根据 API 文档 response.HighRiskFactorsResponse）
export interface IHighRiskFactorsResponse {
  assessment_id: string
  has_high_risk: boolean
  high_risk_factors: IFactorScoreItem[]
  needs_urgent_care: boolean
}

// 测评详情（扩展 IAssessment，包含得分和报告信息）
export interface IAssessmentDetail extends IAssessment {
  factor_scores?: IFactorScoreItem[]  // 因子得分列表（从 /scores 接口获取）
  report?: IReportResponse
}

// 测评 API
export const assessmentApi = {
  // 查询测评列表
  list: (params: IListAssessmentRequest): Promise<[any, QSResponse<IAssessmentListResponse> | undefined]> => {
    return get<IAssessmentListResponse>('/evaluations/assessments', params)
  },
  
  // 获取测评详情
  get: (id: number | string): Promise<[any, QSResponse<IAssessmentDetail> | undefined]> => {
    return get<IAssessmentDetail>(`/evaluations/assessments/${id}`)
  },
  
  // 获取测评得分（根据 API 文档 response.ScoreResponse）
  getScores: (id: number | string): Promise<[any, QSResponse<IScoreResponse> | undefined]> => {
    return get<IScoreResponse>(`/evaluations/assessments/${id}/scores`)
  },
  
  // 获取测评报告（根据 API 文档 response.ReportResponse）
  getReport: (id: number | string): Promise<[any, QSResponse<IReportResponse> | undefined]> => {
    return get<IReportResponse>(`/evaluations/assessments/${id}/report`)
  },
  
  // 获取高风险因子（根据 API 文档 response.HighRiskFactorsResponse）
  getHighRiskFactors: (id: number | string): Promise<[any, QSResponse<IHighRiskFactorsResponse> | undefined]> => {
    return get<IHighRiskFactorsResponse>(`/evaluations/assessments/${id}/high-risk-factors`)
  }
}
