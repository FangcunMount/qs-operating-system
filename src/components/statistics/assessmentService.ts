import type { IDailyCount } from '@/api/path/statistics'

export type ReportTrendPoint = {
  date: string
  label: string
  reports: number
}

export function formatAssessmentFailureRate(failedCount: number, createdCount: number): string {
  const denominator = createdCount + failedCount
  if (denominator <= 0) return '-'
  return `${((failedCount / denominator) * 100).toFixed(1)}%`
}

export function buildReportTrendSeries(reportGenerated: IDailyCount[]): ReportTrendPoint[] {
  return [...reportGenerated]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((point) => ({
      date: point.date,
      label: point.date.slice(5, 10),
      reports: point.count
    }))
}

export function hasReportTrendData(reportGenerated: IDailyCount[]): boolean {
  return reportGenerated.length > 0
}
