import { get, post, put } from '../qsServer'
import type { QSResponse } from '@/types/qs'
import type { FcResponse, ListResponse } from '../../types/server'

// ==================== 新API接口定义 ====================

// 受试者接口请求参数
export interface IListTesteeRequest {
  org_id: number
  name?: string
  is_key_focus?: boolean
  page?: number
  page_size?: number
  [key: string]: any
}

// 测评统计（与 API 文档 response.AssessmentStatsResponse 匹配）
export interface IAssessmentStats {
  total_count: number
  last_assessment_at?: string
  last_risk_level?: string
}

// 监护人信息
export interface IGuardian {
  name: string          // 监护人姓名
  relation: string      // 与受试者关系（如：父亲、母亲、爷爷等）
  phone: string         // 联系电话
}

// GET /testees/{id} - 受试者基础信息（完整版）
export interface ITesteeDetail {
  // ===== 基本信息 =====
  id: number                      // 受试者ID
  name: string                    // 姓名
  gender: string                  // 性别：male/female
  birthday?: string               // 出生日期，格式：YYYY-MM-DD
  org_id: number                  // 机构ID
  profile_id?: number             // 用户档案ID
  iam_child_id?: number           // IAM儿童ID（已废弃，向后兼容）
  
  // ===== 扩展信息 =====
  is_key_focus: boolean           // 是否重点关注
  tags?: string[]                 // 标签列表
  source?: string                 // 来源
  
  // ===== 监护人信息 =====
  guardians?: IGuardian[]         // 监护人列表（建议后端新增此字段）
  
  // ===== 统计信息 =====
  assessment_stats?: IAssessmentStats  // 测评统计
  
  // ===== 时间戳 =====
  created_at: string              // 创建时间
  updated_at: string              // 更新时间
}

// 受试者响应数据（简化版，用于列表）
export interface ITestee {
  id: number
  name: string
  gender: string
  birthday?: string
  org_id: number
  profile_id?: number
  iam_child_id?: number
  is_key_focus: boolean
  source?: string
  tags?: string[]
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
  tags?: string[]
}

// ==================== GET /testees/{id}/scale-analysis - 量表趋势分析 ====================

// 因子得分（某次测评中的单个因子）
export interface IFactorScoreInTest {
  factor_code: string            // 因子编码
  factor_name: string            // 因子名称
  raw_score: number              // 原始分
  t_score?: number               // T分
  percentile?: number            // 百分位
  risk_level?: string            // 风险等级：normal/medium/high
}

// 单次测评记录（用于趋势分析）
export interface ITestRecord {
  assessment_id: number          // 测评ID
  test_date: string              // 测评日期，格式：YYYY-MM-DD HH:mm:ss
  total_score: number            // 总分
  risk_level: string             // 风险等级：normal/medium/high
  result?: string                // 结果描述
  factors: IFactorScoreInTest[]  // 各因子得分
}

// 单个量表的趋势分析数据
export interface IScaleTrend {
  scale_id: number               // 量表ID
  scale_code: string             // 量表编码
  scale_name: string             // 量表名称
  tests: ITestRecord[]           // 测评历史记录（按时间升序排列）
}

// 量表趋势分析响应（可能包含多个量表）
export interface IScaleAnalysisResponse {
  scales: IScaleTrend[]          // 量表趋势列表
}

// ==================== GET /testees/{id}/periodic-stats - 周期性测评统计 ====================

// 单周任务状态
export interface ITaskStatus {
  week: number                   // 第几周（从1开始）
  status: 'completed' | 'pending' | 'overdue'  // 状态
  completed_at?: string          // 完成时间，格式：YYYY-MM-DD HH:mm:ss
  due_date?: string              // 截止时间，格式：YYYY-MM-DD
  assessment_id?: number         // 关联的测评ID（如已完成）
}

// 单个周期性项目统计
export interface IPeriodicProject {
  project_id: number             // 项目ID
  project_name: string           // 项目名称
  scale_name: string             // 关联的量表名称
  total_weeks: number            // 总周数
  completed_weeks: number        // 已完成周数
  completion_rate: number        // 完成率（0-100）
  current_week: number           // 当前应该完成的周次
  tasks: ITaskStatus[]           // 各周任务状态（按周次升序排列）
  start_date?: string            // 项目开始日期
  end_date?: string              // 项目结束日期
}

// 周期性测评统计响应
export interface IPeriodicStatsResponse {
  projects: IPeriodicProject[]   // 周期性项目列表
  total_projects: number         // 项目总数
  active_projects: number        // 进行中的项目数
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
  },
  
  // GET /testees/{id}/periodic-stats - 获取周期性测评统计
  // 返回该受试者参与的周期性测评项目的完成进度
  getPeriodicStats: (id: number | string): Promise<[any, QSResponse<IPeriodicStatsResponse> | undefined]> => {
    return get<IPeriodicStatsResponse>(`/testees/${id}/periodic-stats`)
  }
}

// ==================== 旧接口兼容层 ====================

// 类型定义
interface Subject {
  id: string
  name: string
  gender: string
  age: number
  businessScenes: string[]
  tags: string[]
  totalTestCount: number
  lastTestCompletedAt: string
  lastTestRiskLevel: 'normal' | 'medium' | 'high'
}

// 辅助函数：计算年龄
function calculateAge(birthday: string): number {
  try {
    const birthDate = new Date(birthday)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  } catch {
    return 0
  }
}

// 使用新的 API，并转换为旧格式
export const getSubjectList = async (params: { page?: number; pageSize?: number; keyword?: string }): Promise<FcResponse<ListResponse<Subject>>> => {
  const { page = 1, pageSize = 10, keyword = '' } = params
  
  // 调用新的 testeeApi
  const [err, res] = await testeeApi.listTestees({
    org_id: 1, // TODO: 从用户信息中获取
    name: keyword,
    page,
    page_size: pageSize
  })
  
  if (err || !res) {
    throw new Error('获取受试者列表失败')
  }
  
  // 转换为旧格式以兼容现有页面
  const transformedData: ListResponse<Subject> = {
    list: res.data.items.map(testee => ({
      id: String(testee.id),
      name: testee.name,
      gender: testee.gender === 'male' ? '男' : testee.gender === 'female' ? '女' : testee.gender,
      age: testee.birthday ? calculateAge(testee.birthday) : 0,
      businessScenes: [], // API 没有此字段
      tags: testee.tags || [],
      totalTestCount: testee.assessment_stats?.total_count || 0,
      lastTestCompletedAt: testee.assessment_stats?.last_assessment_at || '',
      lastTestRiskLevel: 'normal' // API 没有此字段，默认normal
    })),
    total: res.data.total,
    page: res.data.page,
    pageSize: res.data.page_size
  }
  
  return {
    errno: '0',
    errmsg: 'success',
    data: transformedData
  }
}

export const getSubjectDetail = async (id: string): Promise<any> => {
  const [err, res] = await get<Subject | null>(`/subject/${id}`, {})
  if (err || !res) {
    throw new Error('获取受试者详情失败')
  }
  return res as unknown as FcResponse<Subject | null>
}

export const createSubject = async (subject: Partial<Subject>): Promise<any> => {
  const [err, res] = await post<{ success: boolean; id: string }>('/subject', subject)
  if (err || !res) {
    throw new Error('创建受试者失败')
  }
  return res as unknown as FcResponse<{ success: boolean; id: string }>
}

export const updateSubject = async (id: string, subject: Partial<Subject>): Promise<any> => {
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}`, subject)
  if (err || !res) {
    throw new Error('更新受试者失败')
  }
  return res as unknown as FcResponse<{ success: boolean }>
}

export const deleteSubject = async (id: string): Promise<any> => {
  const [err, res] = await post<{ success: boolean }>(`/subject/${id}/delete`, {})
  if (err || !res) {
    throw new Error('删除受试者失败')
  }
  return res as unknown as FcResponse<{ success: boolean }>
}

// 受试者详情页相关接口

interface Guardian {
  name: string
  relation: string
  phone: string
}

interface SubjectBasicInfo {
  name: string
  gender: string
  age: number
  tags: string[]
  attentionLevel: string
  guardians: Guardian[]
}

interface TaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue'
  completedAt?: string
  dueDate?: string
}

interface PeriodicProject {
  id: string
  name: string
  totalWeeks: number
  completedWeeks: number
  completionRate: number
  tasks: TaskStatus[]
}

interface SurveyRecord {
  id: string
  questionnaireName: string
  completedAt: string
  status: string
  source: string
}

export interface FactorScore {
  name: string
  score: number
  level: string
}

interface ScaleRecord {
  id: string
  scaleName: string
  completedAt: string
  totalScore: number
  result: string
  riskLevel: string
  source: string
  factors?: FactorScore[]
}

interface TestRecord {
  testId: string
  testDate: string
  totalScore: number
  result: string
  factors: Array<{
    factorName: string
    score: number
    level?: string
  }>
}

interface ScaleAnalysisData {
  scaleId: string
  scaleName: string
  tests: TestRecord[]
}

interface SubjectDetailData {
  basicInfo: SubjectBasicInfo
  periodicStats: PeriodicProject[]
  scaleAnalysis: ScaleAnalysisData[]
  surveys: SurveyRecord[]
  scales: ScaleRecord[]
}

// Mock subject detail data removed; using real API

export const getSubjectDetailPage = async (id: string): Promise<FcResponse<SubjectDetailData>> => {
  const [err, res] = await get<SubjectDetailData>(`/subject/${id}/detail-page`, {})
  if (err || !res) {
    throw new Error('获取受试者详情页数据失败')
  }
  return res as unknown as FcResponse<SubjectDetailData>
}

// 受试者答卷详情类型
export interface SubjectAnswerDetail {
  answerId: string
  subjectName: string
  filledBy: string
  questionSheetName: string
  completedAt: string
  questionCount: number
  answerCount: number
  answers: any[]
}

// 获取受试者答卷详情
export const getSubjectAnswerDetail = async (subjectId: string, answerId: string): Promise<FcResponse<SubjectAnswerDetail>> => {
  const [err, res] = await get<SubjectAnswerDetail>(`/subject/${subjectId}/answer/${answerId}`, {})
  if (err || !res) {
    throw new Error('获取答卷详情失败')
  }
  return res as unknown as FcResponse<SubjectAnswerDetail>
}

// 受试者测评详情类型
export interface FactorScore {
  name: string
  score: number
  level: string
}

export interface SubjectScaleDetail {
  testId: string
  subjectName: string
  scaleName: string
  testDate: string
  totalScore: number
  result: string
  riskLevel: 'normal' | 'medium' | 'high'
  user: string
  source: string
  factors: FactorScore[]
  answerId?: string
  answers?: any[]
  report?: {
    summary: string
    details: Array<{
      title: string
      content: string
    }>
    suggestions: string[]
  }
}

// Mock 测评详情数据已移除，使用真实后端 API

// 获取受试者测评详情
export const getSubjectScaleDetail = async (subjectId: string, testId: string): Promise<FcResponse<SubjectScaleDetail>> => {
  const [err, res] = await get<SubjectScaleDetail>(`/subject/${subjectId}/scale/${testId}`, {})
  if (err || !res) {
    throw new Error('获取测评详情失败')
  }
  return res as unknown as FcResponse<SubjectScaleDetail>
}
