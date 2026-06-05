import type {
  IDailyCount,
  IPlanDomainStatistics,
  IPlanTaskActivityStatistics,
  IPlanTaskActivityTrend,
  IPlanTaskActivityWindow,
  IPlanTaskFulfillmentStatistics,
  IPlanTaskFulfillmentTrend,
  IPlanTaskFulfillmentWindow
} from '@/api/path/statistics'

export type PlanBarDatum = {
  name: string
  value: number
  fill: string
}

export type PlanDualMetricsPanelProps = {
  activity: IPlanTaskActivityStatistics
  fulfillment?: IPlanTaskFulfillmentStatistics | null
  compact?: boolean
}

export const PLAN_ACTIVITY_COLORS = {
  created: '#faad14',
  opened: '#4096ff',
  completed: '#ff7a45'
} as const

export const PLAN_FULFILLMENT_COLORS = {
  planned: '#b37feb',
  due: '#722ed1',
  completed: '#52c41a',
  overdue: '#cf1322'
} as const

export function resolvePlanActivity(plan?: IPlanDomainStatistics | null): IPlanTaskActivityStatistics {
  return {
    window: plan?.activity?.window ?? plan?.window ?? emptyActivityWindow(),
    trend: plan?.activity?.trend ?? plan?.trend ?? emptyActivityTrend()
  }
}

export function resolvePlanFulfillment(plan?: IPlanDomainStatistics | null): IPlanTaskFulfillmentStatistics | null {
  if (!plan?.fulfillment) return null
  return plan.fulfillment
}

function emptyActivityWindow(): IPlanTaskActivityWindow {
  return {
    task_created_count: 0,
    task_opened_count: 0,
    task_completed_count: 0,
    task_expired_count: 0,
    enrolled_testees: 0,
    active_testees: 0
  }
}

function emptyActivityTrend(): IPlanTaskActivityTrend {
  return {
    task_created: [],
    task_opened: [],
    task_completed: [],
    task_expired: []
  }
}

export function buildPlanActivityBars(window: IPlanTaskActivityWindow): PlanBarDatum[] {
  return [
    { name: '任务发放', value: window.task_created_count, fill: PLAN_ACTIVITY_COLORS.created },
    { name: '任务打开', value: window.task_opened_count, fill: PLAN_ACTIVITY_COLORS.opened },
    { name: '任务完成', value: window.task_completed_count, fill: PLAN_ACTIVITY_COLORS.completed }
  ]
}

export function buildPlanFulfillmentBars(window: IPlanTaskFulfillmentWindow): PlanBarDatum[] {
  return [
    { name: '应完成', value: window.due_task_count, fill: PLAN_FULFILLMENT_COLORS.due },
    { name: '已完成', value: window.completed_task_count, fill: PLAN_FULFILLMENT_COLORS.completed },
    { name: '逾期', value: window.overdue_task_count, fill: PLAN_FULFILLMENT_COLORS.overdue }
  ]
}

/** 后端 completion_rate 已是 0-100 的百分比，勿再乘 100 */
export function formatPlanRate(rate?: number | null): string {
  if (rate === undefined || rate === null || Number.isNaN(rate)) return '-'
  return `${rate.toFixed(1)}%`
}

export function hasPlanBarData(data: PlanBarDatum[]): boolean {
  return data.some((item) => item.value > 0)
}

export function hasPlanTrendData(
  data: Array<Record<string, string | number>>,
  keys: string[]
): boolean {
  return data.some((row) => keys.some((key) => Number(row[key]) > 0))
}

export function mergePlanActivityTrend(trend: IPlanTaskActivityTrend): Array<Record<string, string | number>> {
  return mergeDailySeries([
    { key: 'created', source: trend.task_created },
    { key: 'opened', source: trend.task_opened },
    { key: 'completed', source: trend.task_completed }
  ])
}

export function mergePlanFulfillmentTrend(trend: IPlanTaskFulfillmentTrend): Array<Record<string, string | number>> {
  return mergeDailySeries([
    { key: 'planned', source: trend.planned },
    { key: 'due', source: trend.due },
    { key: 'completed', source: trend.completed },
    { key: 'overdue', source: trend.overdue }
  ])
}

type DailySeries = {
  key: string
  source: IDailyCount[]
}

function mergeDailySeries(series: DailySeries[]) {
  const maps = series.map((item) => ({
    key: item.key,
    values: new Map(item.source.map((point) => [point.date, point.count]))
  }))
  const dates = Array.from(new Set(series.flatMap((item) => item.source.map((point) => point.date)))).sort()

  return dates.map((date) => {
    const row: Record<string, string | number> = {
      date,
      label: date.slice(5, 10)
    }
    maps.forEach((item) => {
      row[item.key] = item.values.get(date) || 0
    })
    return row
  })
}
