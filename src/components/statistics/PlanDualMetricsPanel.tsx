import React from 'react'
import PlanActivityMetricsPanel from './PlanActivityMetricsPanel'
import PlanFulfillmentMetricsPanel from './PlanFulfillmentMetricsPanel'
import type { PlanDualMetricsPanelProps } from './planStatistics'
import './PlanDualMetricsPanel.scss'

const PLAN_DUAL_METRICS_NOTE =
  '左侧按任务发生日期统计发放/打开/完成；右侧按计划截止 cohort 统计应完成、已完成与逾期。'

const PlanDualMetricsPanel: React.FC<PlanDualMetricsPanelProps> = ({
  activity,
  fulfillment,
  compact = false
}) => {
  return (
    <div className={`plan-dual-metrics${compact ? ' plan-dual-metrics--compact' : ''}`}>
      <div className="plan-dual-metrics__body">
        <div className="plan-dual-metrics__section">
          <span className="plan-dual-metrics__section-title">执行动作（事件日）</span>
          <PlanActivityMetricsPanel activity={activity} compact={compact} />
        </div>
        <div className="plan-dual-metrics__section">
          <span className="plan-dual-metrics__section-title">履约结果（计划 cohort）</span>
          <PlanFulfillmentMetricsPanel fulfillment={fulfillment} compact={compact} />
        </div>
      </div>
      <p className="plan-dual-metrics__note">{PLAN_DUAL_METRICS_NOTE}</p>
    </div>
  )
}

export default PlanDualMetricsPanel
