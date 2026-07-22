import { v2Get, v2Post } from '../qsServer'
import type { QSResponse } from '@/types/qs'

export interface IDailyCount {
  date: string
  count: number
}

export interface IStatisticsTimeRange {
  preset: 'latest_complete_day' | '7d' | '30d' | 'custom' | string
  from: string
  to: string
}

export interface IStatisticsQueryParams {
  preset?: 'latest_complete_day' | '7d' | '30d' | 'custom'
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
  freshness?: IStatisticsFreshness
}

export interface IStatisticsFreshness {
  as_of_date: string
  snapshot_at: string
  is_stale: boolean
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

export type ContentStatisticsType = 'questionnaire' | 'scale' | 'typology' | 'behavioral_rating' | 'cognitive'

export interface IContentStatisticsReference {
  type: ContentStatisticsType
  code: string
}

export interface IContentBatchStatisticsItem extends IContentStatisticsReference {
  code: string
  total_submissions: number
  total_completions: number
  completion_rate: number
  /** Independent questionnaires do not have an Assessment/Outcome completion fact. */
  has_completion: boolean
}

export interface IContentBatchStatisticsResponse {
  items: IContentBatchStatisticsItem[]
}

function buildQueryParams(params?: IStatisticsQueryParams) {
  if (!params) return {}
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function buildStatisticsQueryParams(params?: IStatisticsQueryParams) {
  const values = buildQueryParams(params) as Record<string, any>
  if (values.from || values.to) {
    values.preset = 'custom'
    if (values.from) values.from = String(values.from).slice(0, 10)
    if (values.to) values.to = String(values.to).slice(0, 10)
  }
  return values
}

type StatisticsClinicianItem = {
  id: number
  operator_id?: number
  name: string
  department?: string
  title?: string
  clinician_type: string
  is_active: boolean
  entry_opened_count: number
  intake_confirmed_count: number
  care_relationship_established_count: number
  assessment_created_count: number
  outcome_committed_count: number
  report_generated_count: number
  primary_testee_count: number
  attending_testee_count: number
  collaborator_testee_count: number
  total_accessible_testees: number
  active_entry_count: number
}

type StatisticsEntryItem = {
  id: number
  clinician_id: number
  clinician_name?: string
  token: string
  target_type: string
  target_code: string
  target_version?: string
  is_active: boolean
  created_at: string
  expires_at?: string
  entry_opened_count: number
  intake_confirmed_count: number
  assessment_created_count: number
  outcome_committed_count: number
  report_generated_count: number
}

type StatisticsPage<T> = {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
  time_range: IStatisticsTimeRange
  freshness: IStatisticsFreshness
}

type StatisticsDetail<T> = {
  item: T
  time_range: IStatisticsTimeRange
  freshness: IStatisticsFreshness
}

type StatisticsContentResponse = {
  items: Array<{
    kind: ContentStatisticsType
    code: string
    total_submissions: number
    total_completions?: number
    completion_rate?: number
    has_completion: boolean
  }>
  freshness: IStatisticsFreshness
}

function adaptClinician(item: StatisticsClinicianItem, timeRange: IStatisticsTimeRange): IClinicianStatisticsResponse {
  return {
    time_range: timeRange,
    clinician: {
      id: String(item.id),
      operator_id: item.operator_id ? String(item.operator_id) : null,
      name: item.name,
      department: item.department,
      title: item.title,
      clinician_type: item.clinician_type,
      is_active: item.is_active
    },
    snapshot: {
      primary_testee_count: item.primary_testee_count,
      attending_testee_count: item.attending_testee_count,
      collaborator_testee_count: item.collaborator_testee_count,
      total_accessible_testees: item.total_accessible_testees,
      active_entry_count: item.active_entry_count
    },
    window: {
      intake_count: item.intake_confirmed_count,
      assigned_count: item.care_relationship_established_count,
      completed_assessment_count: item.report_generated_count
    },
    funnel: {
      created_count: item.active_entry_count,
      resolved_count: item.entry_opened_count,
      intake_count: item.intake_confirmed_count,
      assigned_count: item.care_relationship_established_count,
      assessment_count: item.assessment_created_count
    }
  }
}

function adaptEntry(item: StatisticsEntryItem, timeRange: IStatisticsTimeRange): IAssessmentEntryStatisticsResponse {
  const counts = {
    resolve_count: item.entry_opened_count,
    intake_count: item.intake_confirmed_count,
    assigned_count: 0,
    assessment_count: item.assessment_created_count
  }
  return {
    time_range: timeRange,
    entry: {
      id: String(item.id),
      org_id: 0,
      clinician_id: String(item.clinician_id),
      clinician_name: item.clinician_name,
      token: item.token,
      target_type: item.target_type,
      target_code: item.target_code,
      target_version: item.target_version,
      is_active: item.is_active,
      created_at: item.created_at,
      expires_at: item.expires_at
    },
    snapshot: counts,
    window: counts
  }
}

function mapStatisticsPage<TSource, TTarget>(
  response: QSResponse<StatisticsPage<TSource>>,
  mapper: (item: TSource, range: IStatisticsTimeRange) => TTarget
): QSResponse<any> {
  const data = response.data
  return {
    ...response,
    data: {
      items: data.items.map((item) => mapper(item, data.time_range)),
      total: data.total,
      page: data.page,
      page_size: data.page_size,
      total_pages: data.total_pages,
      freshness: data.freshness
    }
  }
}

export const getOverviewStatistics = async (params?: IStatisticsQueryParams): Promise<[any, QSResponse<IStatisticsOverviewResponse> | undefined]> => {
  return v2Get<IStatisticsOverviewResponse>('/statistics/overview', buildStatisticsQueryParams(params))
}

export const listClinicianStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianStatisticsListResponse> | undefined]> => {
  const query = buildStatisticsQueryParams(params)
  const [error, response] = await v2Get<StatisticsPage<StatisticsClinicianItem>>('/statistics/clinicians', query)
  return [error, response ? (mapStatisticsPage(response, adaptClinician) as QSResponse<IClinicianStatisticsListResponse>) : undefined]
}

export const getClinicianStatistics = async (
  clinicianId: string,
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianStatisticsResponse> | undefined]> => {
  const query = buildStatisticsQueryParams(params)
  const [error, response] = await v2Get<StatisticsDetail<StatisticsClinicianItem>>(`/statistics/clinicians/${clinicianId}`, query)
  return [error, response ? { ...response, data: adaptClinician(response.data.item, response.data.time_range) } : undefined]
}

export const listAssessmentEntryStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IAssessmentEntryStatisticsListResponse> | undefined]> => {
  const query = buildStatisticsQueryParams(params)
  const [error, response] = await v2Get<StatisticsPage<StatisticsEntryItem>>('/statistics/entries', query)
  return [error, response ? (mapStatisticsPage(response, adaptEntry) as QSResponse<IAssessmentEntryStatisticsListResponse>) : undefined]
}

export const getAssessmentEntryStatistics = async (
  entryId: string,
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IAssessmentEntryStatisticsResponse> | undefined]> => {
  const query = buildStatisticsQueryParams(params)
  const [error, response] = await v2Get<StatisticsDetail<StatisticsEntryItem>>(`/statistics/entries/${entryId}`, query)
  return [error, response ? { ...response, data: adaptEntry(response.data.item, response.data.time_range) } : undefined]
}

export const getMyClinicianOverviewStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianStatisticsResponse> | undefined]> => {
  const query = buildStatisticsQueryParams(params)
  const [error, response] = await v2Get<StatisticsDetail<StatisticsClinicianItem>>('/statistics/clinicians/me/overview', query)
  return [error, response ? { ...response, data: adaptClinician(response.data.item, response.data.time_range) } : undefined]
}

export const listMyClinicianEntryStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IAssessmentEntryStatisticsListResponse> | undefined]> => {
  const query = buildStatisticsQueryParams(params)
  const [error, response] = await v2Get<StatisticsPage<StatisticsEntryItem>>('/statistics/clinicians/me/entries', query)
  return [error, response ? (mapStatisticsPage(response, adaptEntry) as QSResponse<IAssessmentEntryStatisticsListResponse>) : undefined]
}

export const getMyClinicianTesteeSummaryStatistics = async (
  params?: IStatisticsQueryParams
): Promise<[any, QSResponse<IClinicianTesteeSummaryStatistics> | undefined]> => {
  return v2Get<IClinicianTesteeSummaryStatistics>('/statistics/clinicians/me/testees-summary', buildStatisticsQueryParams(params))
}

export const batchContentStatistics = async (
  items: IContentStatisticsReference[]
): Promise<[any, QSResponse<IContentBatchStatisticsResponse> | undefined]> => {
  const [error, response] = await v2Post<StatisticsContentResponse>('/statistics/contents/batch', {
    items: items.map((item) => ({ kind: item.type, code: item.code }))
  })
  if (!response) return [error, undefined]
  return [
    error,
    {
      ...response,
      data: {
        items: response.data.items.map((item) => ({
          type: item.kind,
          code: item.code,
          total_submissions: item.total_submissions,
          total_completions: item.total_completions || 0,
          completion_rate: item.completion_rate || 0,
          has_completion: item.has_completion
        }))
      }
    }
  ]
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
  batchContentStatistics
}
