import React, { useMemo } from 'react'
import type { IPlanTaskActivityStatistics } from '@/api/path/statistics'
import { buildPlanActivityBars } from './planStatistics'
import PlanVerticalBarChart from './PlanVerticalBarChart'
import './PlanMetricsPanel.scss'

const PLAN_ACTIVITY_NOTE = '按任务发生日期统计发放、打开、完成。'

type PlanActivityMetricsPanelProps = {
  activity: IPlanTaskActivityStatistics
  compact?: boolean
  showNote?: boolean
}

const PlanActivityMetricsPanel: React.FC<PlanActivityMetricsPanelProps> = ({
  activity,
  compact = false,
  showNote = false
}) => {
  const bars = useMemo(() => buildPlanActivityBars(activity.window), [activity])

  return (
    <div className={`plan-metrics-panel${compact ? ' plan-metrics-panel--compact' : ''}`}>
      <PlanVerticalBarChart data={bars} compact={compact} emptyText="暂无事件活动数据" />
      {showNote ? <p className="plan-metrics-panel__note">{PLAN_ACTIVITY_NOTE}</p> : null}
    </div>
  )
}

export default PlanActivityMetricsPanel
