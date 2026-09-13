import type { QSResponse } from '@/types/qs'
import { v2Get } from '../qsServer'
import type { IDailyCount, IOperationsQuery, IStatisticsOverviewResponse } from './statistics'

export interface AnalysisMetadata {
  scope: 'all_stores' | 'stores'
  stores: Array<{ id: string; code: string; name: string; is_active: boolean }>
  from: string
  to_exclusive: string
  data_through: string
  published_at: string
  published_version: string
  current_ownership_read_at: string
}
export type AnalysisOverview = AnalysisMetadata & Pick<IStatisticsOverviewResponse,
  'organization_overview' | 'access_funnel' | 'assessment_service' | 'plan'>
export interface AnalysisClinician {
  id: string; name: string; department?: string; title?: string; clinician_type: string; is_active: boolean
  entry_opened_count: number; intake_confirmed_count: number; care_relationship_established_count: number
  assessment_created_count: number; outcome_committed_count: number; report_generated_count: number
  primary_testee_count: number; attending_testee_count: number; collaborator_testee_count: number
  total_accessible_testees: number; active_entry_count: number
}
export interface AnalysisEntry {
  id: string; clinician_id: string; clinician_name?: string; target_type: string; target_code: string
  target_version?: string; is_active: boolean; created_at: string; expires_at?: string
  entry_opened_count: number; intake_confirmed_count: number; assessment_created_count: number
  outcome_committed_count: number; report_generated_count: number
}
export interface AnalysisPage<T> extends AnalysisMetadata { items: T[]; total: number; page: number; page_size: number }
export interface ClinicianPage extends AnalysisPage<AnalysisClinician> {
  summary: { clinician_count: number; active_clinician_count: number; clinicians_with_intake: number;
    intake_confirmed_count: number; report_generated_count: number }
}
export interface AnalysisQuery extends IOperationsQuery { page?: number; page_size?: number; clinician_id?: string; is_active?: boolean }
const root = '/statistics/operations/analysis'
export const getAnalysisOverview = (query: AnalysisQuery): Promise<[unknown, QSResponse<AnalysisOverview> | undefined]> =>
  v2Get<AnalysisOverview>(`${root}/overview`, query)
export const getAnalysisClinicians = (query: AnalysisQuery): Promise<[unknown, QSResponse<ClinicianPage> | undefined]> =>
  v2Get<ClinicianPage>(`${root}/clinicians`, query)
export const getAnalysisEntries = (query: AnalysisQuery): Promise<[unknown, QSResponse<AnalysisPage<AnalysisEntry>> | undefined]> =>
  v2Get<AnalysisPage<AnalysisEntry>>(`${root}/entries`, query)

export function mergeAnalysisTrend(series: Array<{ key: string; points: IDailyCount[] }>): Array<Record<string, string | number>> {
  const days = new Map<string, Record<string, string | number>>()
  series.forEach(({ key, points }) => points.forEach(point => {
    const day = point.date.slice(0, 10)
    days.set(day, { ...days.get(day), date: day, [key]: point.count })
  }))
  return Array.from(days.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)))
}
