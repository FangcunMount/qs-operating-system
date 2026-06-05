import React, { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { IDailyCount } from '@/api/path/statistics'
import { buildReportTrendSeries } from './assessmentService'

type AssessmentReportTrendChartProps = {
  reportGenerated: IDailyCount[]
  compact?: boolean
  strokeColor?: string
}

const AssessmentReportTrendChart: React.FC<AssessmentReportTrendChartProps> = ({
  reportGenerated,
  compact = false,
  strokeColor = '#722ed1'
}) => {
  const data = useMemo(() => buildReportTrendSeries(reportGenerated), [reportGenerated])

  const yAxisWidth = compact ? 36 : 48

  return (
    <ResponsiveContainer width="100%" height={compact ? 140 : 200}>
      <LineChart
        data={data}
        margin={{
          top: compact ? 8 : 12,
          right: compact ? 8 : 16,
          left: compact ? 0 : 4,
          bottom: compact ? 0 : 8
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" interval="preserveStartEnd" tickLine={false} tick={{ fontSize: compact ? 10 : 12 }} />
        <YAxis
          allowDecimals={false}
          width={yAxisWidth}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: compact ? 10 : 12 }}
        />
        <Tooltip formatter={(value: number) => [value, '产出报告']} />
        <Line type="monotone" dataKey="reports" name="产出报告" stroke={strokeColor} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default AssessmentReportTrendChart
