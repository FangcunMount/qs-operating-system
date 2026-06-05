import React, { useMemo } from 'react'
import type { IPlanTaskFulfillmentStatistics } from '@/api/path/statistics'
import { buildPlanFulfillmentBars, formatPlanRate } from './planStatistics'
import PlanVerticalBarChart from './PlanVerticalBarChart'
import './PlanMetricsPanel.scss'

const PLAN_FULFILLMENT_NOTE = '按计划截止 cohort 统计应完成、已完成与逾期。'

type PlanFulfillmentMetricsPanelProps = {
  fulfillment?: IPlanTaskFulfillmentStatistics | null
  compact?: boolean
  showNote?: boolean
}

const PlanFulfillmentMetricsPanel: React.FC<PlanFulfillmentMetricsPanelProps> = ({
  fulfillment,
  compact = false,
  showNote = false
}) => {
  const fulfillmentWindow = fulfillment?.window
  const bars = useMemo(
    () => (fulfillmentWindow ? buildPlanFulfillmentBars(fulfillmentWindow) : []),
    [fulfillmentWindow]
  )

  return (
    <div className={`plan-metrics-panel${compact ? ' plan-metrics-panel--compact' : ''}`}>
      {fulfillmentWindow ? (
        <div className="plan-metrics-panel__rate">
          完成率 <b>{formatPlanRate(fulfillmentWindow.completion_rate)}</b>
        </div>
      ) : null}
      <PlanVerticalBarChart data={bars} compact={compact} emptyText="暂无履约 cohort 数据" />
      {showNote ? <p className="plan-metrics-panel__note">{PLAN_FULFILLMENT_NOTE}</p> : null}
    </div>
  )
}

export default PlanFulfillmentMetricsPanel
