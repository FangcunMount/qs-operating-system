import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PlanBarDatum } from './planStatistics'
import { hasPlanBarData } from './planStatistics'

const VERTICAL_BAR_MARGIN = { top: 4, right: 8, left: 0, bottom: 0 }

type PlanVerticalBarChartProps = {
  data: PlanBarDatum[]
  compact?: boolean
  emptyText: string
  height?: number
}

const PlanVerticalBarChart: React.FC<PlanVerticalBarChartProps> = ({
  data,
  compact = false,
  emptyText,
  height
}) => {
  const chartHeight = height ?? (compact ? 168 : 220)
  const yAxisWidth = compact ? 64 : 72
  const categoryAxisTick = { fontSize: compact ? 10 : 12 }

  if (!hasPlanBarData(data)) {
    return <div className="plan-metrics-panel__empty">{emptyText}</div>
  }

  return (
    <div className="plan-metrics-panel__chart" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={VERTICAL_BAR_MARGIN}>
          {!compact ? <CartesianGrid strokeDasharray="3 3" horizontal={false} /> : null}
          <XAxis type="number" allowDecimals={false} hide={compact} />
          <YAxis
            type="category"
            dataKey="name"
            width={yAxisWidth}
            tickLine={false}
            axisLine={!compact}
            tick={categoryAxisTick}
          />
          <Tooltip formatter={(value: number) => [value, '数量']} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((item) => (
              <Cell key={item.name} fill={item.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PlanVerticalBarChart
