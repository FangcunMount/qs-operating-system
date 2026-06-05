import type { IClinicianStatisticsResponse } from '@/api/path/statistics'

export type ClinicianJourneyRow = {
  name: string
  opened: number
  intake: number
  connected: number
  assessments: number
}

export type ClinicianIntakeRankRow = {
  name: string
  intake: number
  opened: number
}

export const CLINICIAN_DIMENSION_SAMPLE_NOTE =
  '以下图表与 KPI 基于当前列表 Top 10 样本；窗口指标为旅程发生次数，明细表按完成接入降序。'

export function buildClinicianJourneyRows(
  clinicians: IClinicianStatisticsResponse[],
  limit = 8
): ClinicianJourneyRow[] {
  return [...clinicians]
    .sort((a, b) => b.window.intake_count - a.window.intake_count)
    .slice(0, limit)
    .map((item) => ({
      name: item.clinician.name,
      opened: item.funnel.resolved_count,
      intake: item.window.intake_count,
      connected: item.window.assigned_count,
      assessments: item.funnel.assessment_count
    }))
}

export function buildClinicianIntakeRankRows(
  clinicians: IClinicianStatisticsResponse[],
  limit = 8
): ClinicianIntakeRankRow[] {
  return [...clinicians]
    .filter((item) => item.window.intake_count > 0)
    .sort((a, b) => b.window.intake_count - a.window.intake_count)
    .slice(0, limit)
    .map((item) => ({
      name: item.clinician.name,
      intake: item.window.intake_count,
      opened: item.funnel.resolved_count
    }))
}

export function countCliniciansWithWindowIntake(clinicians: IClinicianStatisticsResponse[]): number {
  return clinicians.filter((item) => item.window.intake_count > 0).length
}

export function sortCliniciansByIntake(
  clinicians: IClinicianStatisticsResponse[]
): IClinicianStatisticsResponse[] {
  return [...clinicians].sort((a, b) => b.window.intake_count - a.window.intake_count)
}
