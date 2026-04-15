import { get, post } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface IDailyCount {
  date: string
  count: number
}

export interface IStatisticsTimeRange {
  preset: 'today' | '7d' | '30d' | string
  from: string
  to: string
}

export interface IStatisticsQueryParams {
  preset?: 'today' | '7d' | '30d'
  from?: string
  to?: string
  page?: number
  page_size?: number
  clinician_id?: string
  status?: 'active' | 'inactive'
  sort?: string
}

export interface IStatisticsOverviewSnapshot {
  testee_count: number
  clinician_count: number
  active_entry_count: number
  assessment_count: number
  interpreted_assessment_count: number
}

export interface IStatisticsOverviewWindow {
  new_testees: number
  entry_created_count: number
  entry_resolved_count: number
  entry_intake_count: number
  relation_assigned_count: number
  assessment_created_count: number
  assessment_completed_count: number
}

export interface IStatisticsOverviewTrend {
  assessments: IDailyCount[]
  intakes: IDailyCount[]
  assignments: IDailyCount[]
}

export interface IStatisticsOverviewResponse {
  org_id: number
  time_range: IStatisticsTimeRange
  snapshot: IStatisticsOverviewSnapshot
  window: IStatisticsOverviewWindow
  trend: IStatisticsOverviewTrend
}

export interface IClinicianStatisticsSubject {
  id: string
  operator_id?: string | null
  name: string
  department?: string
  title?: string
  clinician_type: string
  is_active: boolean
}

export interface IClinicianStatisticsSnapshot {
  primary_testee_count: number
  attending_testee_count: number
  collaborator_testee_count: number
  total_accessible_testees: number
  active_entry_count: number
}

export interface IClinicianStatisticsWindow {
  intake_count: number
  assigned_count: number
  completed_assessment_count: number
}

export interface IClinicianStatisticsFunnel {
  created_count: number
  resolved_count: number
  intake_count: number
  assigned_count: number
  assessment_count: number
}

export interface IClinicianStatisticsResponse {
  time_range: IStatisticsTimeRange
  clinician: IClinicianStatisticsSubject
  snapshot: IClinicianStatisticsSnapshot
  window: IClinicianStatisticsWindow
  funnel: IClinicianStatisticsFunnel
}

export interface IClinicianStatisticsListResponse {
  items: IClinicianStatisticsResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface IAssessmentEntryStatisticsMeta {
  id: string
  org_id: number
  clinician_id: string
  token: string
  target_type: string
  target_code: string
  target_version?: string
  is_active: boolean
  created_at: string
  expires_at?: string
  clinician_name?: string
}

export interface IAssessmentEntryStatisticsCounts {
  resolve_count: number
  intake_count: number
  assigned_count: number
  assessment_count: number
}

export interface IAssessmentEntryStatisticsResponse {
  time_range: IStatisticsTimeRange
  entry: IAssessmentEntryStatisticsMeta
  snapshot: IAssessmentEntryStatisticsCounts
  window: IAssessmentEntryStatisticsCounts
  last_resolved_at?: string
  last_intake_at?: string
}

export interface IAssessmentEntryStatisticsListResponse {
  items: IAssessmentEntryStatisticsResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface IClinicianTesteeSummaryStatistics {
  time_range: IStatisticsTimeRange
  total_accessible_testees: number
  primary_testee_count: number
  attending_testee_count: number
  collaborator_testee_count: number
  key_focus_testee_count: number
  assessed_in_window_count: number
}

export interface IQuestionnaireBatchStatisticsItem {
  code: string
  total_submissions: number
  total_completions: number
  completion_rate: number
}

export interface IQuestionnaireBatchStatisticsResponse {
  items: IQuestionnaireBatchStatisticsItem[]
}

export interface IPeriodicTaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue' | 'canceled'
  completed_at?: string
  planned_at?: string
  due_date?: string
  assessment_id?: string
}

export interface IPeriodicProject {
  project_id: string
  project_name: string
  scale_name: string
  total_weeks: number
  completed_weeks: number
  completion_rate: number
  current_week: number
  tasks: IPeriodicTaskStatus[]
  start_date?: string
  end_date?: string
}

export interface ITesteePeriodicStatisticsResponse {
  projects: IPeriodicProject[]
  total_projects: number
  active_projects: number
}

// ===== legacy compatibility types =====

export interface ISystemStatistics {
  org_id: number
  questionnaire_count: number
  answer_sheet_count: number
  testee_count: number
  assessment_count: number
  today_new_answer_sheets: number
  today_new_testees: number
  today_new_assessments: number
  assessment_trend: IDailyCount[]
  assessment_status_distribution: Record<string, number>
}

export interface IQuestionnaireStatistics {
  org_id: number
  questionnaire_code: string
  total_submissions: number
  total_completions: number
  completion_rate: number
  last_7_days_count: number
  last_15_days_count: number
  last_30_days_count: number
  daily_trend: IDailyCount[]
  origin_distribution: Record<string, number>
}

export interface IPlanStatistics {
  org_id: number
  plan_id: number
  enrolled_testees: number
  active_testees: number
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  expired_tasks: number
  completion_rate: number
}

export interface ITesteeStatistics {
  org_id: number
  testee_id: number
  total_assessments: number
  completed_assessments: number
  pending_assessments: number
  first_assessment_date?: string
  last_assessment_date?: string
  risk_distribution: Record<string, number>
}

export interface IStatistics {
  totalQuestionSheets: number
  totalAnswerSheets: number
  totalUsers: number
  todayAnswers: number
}

function buildQueryParams(params?: IStatisticsQueryParams) {
  if (!params) return {}
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

export const getOverviewStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IStatisticsOverviewResponse> | undefined]> => {
  return get<IStatisticsOverviewResponse>('/statistics/overview', buildQueryParams(params))
}

export const listClinicianStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianStatisticsListResponse> | undefined]> => {
  return get<IClinicianStatisticsListResponse>('/statistics/clinicians', buildQueryParams(params))
}

export const getClinicianStatistics = async (
  clinicianId: string,
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianStatisticsResponse> | undefined]> => {
  return get<IClinicianStatisticsResponse>(`/statistics/clinicians/${clinicianId}`, buildQueryParams(params))
}

export const listAssessmentEntryStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IAssessmentEntryStatisticsListResponse> | undefined]> => {
  return get<IAssessmentEntryStatisticsListResponse>('/statistics/entries', buildQueryParams(params))
}

export const getAssessmentEntryStatistics = async (
  entryId: string,
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IAssessmentEntryStatisticsResponse> | undefined]> => {
  return get<IAssessmentEntryStatisticsResponse>(`/statistics/entries/${entryId}`, buildQueryParams(params))
}

export const getMyClinicianOverviewStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianStatisticsResponse> | undefined]> => {
  return get<IClinicianStatisticsResponse>('/statistics/clinicians/me/overview', buildQueryParams(params))
}

export const listMyClinicianEntryStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IAssessmentEntryStatisticsListResponse> | undefined]> => {
  return get<IAssessmentEntryStatisticsListResponse>('/statistics/clinicians/me/entries', buildQueryParams(params))
}

export const getMyClinicianTesteeSummaryStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianTesteeSummaryStatistics> | undefined]> => {
  return get<IClinicianTesteeSummaryStatistics>('/statistics/clinicians/me/testees-summary', buildQueryParams(params))
}

export const getTesteePeriodicStatistics = async (
  testeeId: number | string,
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<ITesteePeriodicStatisticsResponse> | undefined]> => {
  return get<ITesteePeriodicStatisticsResponse>(`/statistics/testees/${testeeId}/periodic`, buildQueryParams(params))
}

export const batchQuestionnaireStatistics = async (
  codes: string[]
): Promise<[any, QSResponse<IQuestionnaireBatchStatisticsResponse> | undefined]> => {
  return post<IQuestionnaireBatchStatisticsResponse>('/statistics/questionnaires/batch', { codes })
}

// ===== legacy compatibility endpoints kept for old pages =====

export const getSystemStatistics = async (): Promise<[any, QSResponse<ISystemStatistics> | undefined]> => {
  return get<ISystemStatistics>('/statistics/system')
}

export const getQuestionnaireStatistics = async (
  code: string
): Promise<[any, QSResponse<IQuestionnaireStatistics> | undefined]> => {
  return get<IQuestionnaireStatistics>(`/statistics/questionnaires/${code}`)
}

export const getPlanStatistics = async (
  planId: number | string
): Promise<[any, QSResponse<IPlanStatistics> | undefined]> => {
  return get<IPlanStatistics>(`/statistics/plans/${planId}`)
}

export const getTesteeStatistics = async (
  testeeId: number | string
): Promise<[any, QSResponse<ITesteeStatistics> | undefined]> => {
  return get<ITesteeStatistics>(`/statistics/testees/${testeeId}`)
}

export const getStatistics = async (): Promise<[any, QSResponse<IStatistics> | undefined]> => {
  const [error, data] = await getSystemStatistics()
  if (error || !data?.data) {
    return [error, undefined]
  }

  const legacyStats: IStatistics = {
    totalQuestionSheets: data.data.questionnaire_count,
    totalAnswerSheets: data.data.answer_sheet_count,
    totalUsers: data.data.testee_count,
    todayAnswers: data.data.today_new_answer_sheets
  }

  return [null, { ...data, data: legacyStats }]
}

export const statisticsApi = {
  getStatistics,
  getSystemStatistics,
  getQuestionnaireStatistics,
  getPlanStatistics,
  getTesteeStatistics,
  getOverviewStatistics,
  listClinicianStatistics,
  getClinicianStatistics,
  listAssessmentEntryStatistics,
  getAssessmentEntryStatistics,
  getMyClinicianOverviewStatistics,
  listMyClinicianEntryStatistics,
  getMyClinicianTesteeSummaryStatistics,
  getTesteePeriodicStatistics,
  batchQuestionnaireStatistics
}
