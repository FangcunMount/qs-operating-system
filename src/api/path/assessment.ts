import { get } from '../qsServer'
import type { QSResponse } from '@/types/qs'

// 测评列表请求参数
export interface IListAssessmentRequest {
  page?: number
  page_size?: number
  status?: string
  testee_id?: number
}

// 测评响应数据
export interface IAssessment {
  id: number
  testee_id: number
  medical_scale_id: number
  medical_scale_code: string
  medical_scale_name: string
  questionnaire_code: string
  questionnaire_version: string
  answer_sheet_id: number
  status: string
  risk_level?: string
  total_score?: string
  submitted_at?: string
  interpreted_at?: string
  failed_at?: string
  failure_reason?: string
  org_id: number
  origin_type?: string
  origin_id?: string
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
  t_score?: number
  percentile?: number
  risk_level?: string
}

// 测评详情
export interface IAssessmentDetail extends IAssessment {
  factor_scores?: IFactorScore[]
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
  
  // 获取测评得分
  getScores: (id: number | string): Promise<[any, QSResponse<{ factors: IFactorScore[] }> | undefined]> => {
    return get<{ factors: IFactorScore[] }>(`/evaluations/assessments/${id}/scores`)
  },
  
  // 获取测评报告
  getReport: (id: number | string): Promise<[any, QSResponse<any> | undefined]> => {
    return get<any>(`/evaluations/assessments/${id}/report`)
  }
}
