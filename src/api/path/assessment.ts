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

// 因子得分
export interface IFactorScore {
  factor_code: string
  factor_name: string
  raw_score: number
  max_score?: number
  t_score?: number
  percentile?: number
  risk_level?: string
}

// 测评详情（扩展 IAssessment，包含得分和报告信息）
export interface IAssessmentDetail extends IAssessment {
  factor_scores?: IFactorScore[]  // 因子得分列表（从 /scores 接口获取）
  report?: {
    summary?: string
    interpretation?: string
    suggestions?: string[]
  }
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
  getScores: (id: number | string): Promise<
    [any, QSResponse<{ factor_scores: IFactorScore[]; total_score: number; risk_level: string }> | undefined]
  > => {
    return get<{ factor_scores: IFactorScore[]; total_score: number; risk_level: string }>(
      `/evaluations/assessments/${id}/scores`
    )
  },
  
  // 获取测评报告
  getReport: (id: number | string): Promise<[any, QSResponse<any> | undefined]> => {
    return get<any>(`/evaluations/assessments/${id}/report`)
  }
}
