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

export interface IOrganizationOverviewStatistics {
  testee_count: number
  clinician_count: number
  active_entry_count: number
  assessment_count: number
  report_count: number
  content_count: number
  answer_sheet_submission_count: number
  today_answer_sheet_submission_count: number
}

export interface IAccessFunnelWindow {
  entry_opened_count: number
  intake_confirmed_count: number
  testee_created_count: number
  care_relationship_established_count: number
}

export interface IAccessFunnelTrend {
  entry_opened: IDailyCount[]
  intake_confirmed: IDailyCount[]
  testee_created: IDailyCount[]
  care_relationship_established: IDailyCount[]
}

export interface IAccessFunnelStatistics {
  window: IAccessFunnelWindow
  trend: IAccessFunnelTrend
}

export interface IAssessmentServiceWindow {
  answersheet_submitted_count: number
  assessment_created_count: number
  report_generated_count: number
  assessment_failed_count: number
}

export interface IAssessmentServiceTrend {
  answersheet_submitted: IDailyCount[]
  assessment_created: IDailyCount[]
  report_generated: IDailyCount[]
  assessment_failed: IDailyCount[]
}

export interface IAssessmentServiceStatistics {
  window: IAssessmentServiceWindow
  trend: IAssessmentServiceTrend
}

export interface IDimensionAnalysisSummary {
  clinician_count: number
  entry_count: number
  content_count: number
}

export type IPlanTaskActivityWindow = {
  task_created_count: number
  task_opened_count: number
  task_completed_count: number
  task_expired_count: number
  enrolled_testees: number
  active_testees: number
}

export type IPlanTaskActivityTrend = {
  task_created: IDailyCount[]
  task_opened: IDailyCount[]
  task_completed: IDailyCount[]
  task_expired: IDailyCount[]
}

export interface IPlanTaskActivityStatistics {
  window: IPlanTaskActivityWindow
  trend: IPlanTaskActivityTrend
}

export interface IPlanTaskFulfillmentWindow {
  planned_task_count: number
  due_task_count: number
  completed_task_count: number
  overdue_task_count: number
  on_time_completed_count: number
  /** 0-100，completed / due * 100 */
  completion_rate: number
  /** 0-100，on_time_completed / due * 100 */
  on_time_completion_rate: number
}

export interface IPlanTaskFulfillmentTrend {
  planned: IDailyCount[]
  due: IDailyCount[]
  completed: IDailyCount[]
  overdue: IDailyCount[]
}

export interface IPlanTaskFulfillmentStatistics {
  window: IPlanTaskFulfillmentWindow
  trend: IPlanTaskFulfillmentTrend
}

export interface IPlanDomainStatistics {
  activity: IPlanTaskActivityStatistics
  fulfillment: IPlanTaskFulfillmentStatistics
}

export interface IStatisticsOverviewResponse {
  org_id: number
  time_range: IStatisticsTimeRange
  organization_overview: IOrganizationOverviewStatistics
  access_funnel: IAccessFunnelStatistics
  assessment_service: IAssessmentServiceStatistics
  dimension_analysis: IDimensionAnalysisSummary
  plan: IPlanDomainStatistics
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

export type ContentStatisticsType = 'questionnaire' | 'scale'

export interface IContentStatisticsReference {
  type: ContentStatisticsType
  code: string
}

export interface IContentBatchStatisticsItem extends IContentStatisticsReference {
  code: string
  total_submissions: number
  total_completions: number
  completion_rate: number
}

export interface IContentBatchStatisticsResponse {
  items: IContentBatchStatisticsItem[]
}

export interface IPeriodicTaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue' | 'canceled'
  status_label?: string
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

export const batchContentStatistics = async (
  items: IContentStatisticsReference[]
): Promise<[any, QSResponse<IContentBatchStatisticsResponse> | undefined]> => {
  return post<IContentBatchStatisticsResponse>('/statistics/contents/batch', { items })
}

export const statisticsApi = {
  getOverviewStatistics,
  listClinicianStatistics,
  getClinicianStatistics,
  listAssessmentEntryStatistics,
  getAssessmentEntryStatistics,
  getMyClinicianOverviewStatistics,
  listMyClinicianEntryStatistics,
  getMyClinicianTesteeSummaryStatistics,
  getTesteePeriodicStatistics,
  batchContentStatistics
}
