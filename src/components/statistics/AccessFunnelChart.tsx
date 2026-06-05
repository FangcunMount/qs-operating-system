import React, { useMemo } from 'react'
import { Funnel, FunnelChart, LabelList, ResponsiveContainer, Tooltip } from 'recharts'
import type { AccessFunnelConversion, AccessFunnelOutcome, AccessFunnelStep } from './accessFunnel'
import { ACCESS_FUNNEL_PARALLEL_NOTE, formatConversionRate } from './accessFunnel'
import './AccessFunnelChart.scss'

type AccessFunnelChartProps = {
  steps: AccessFunnelStep[]
  conversions: AccessFunnelConversion[]
  outcomes: AccessFunnelOutcome[]
  compact?: boolean
  showNote?: boolean
}

const AccessFunnelChart: React.FC<AccessFunnelChartProps> = ({
  steps,
  conversions,
  outcomes,
  compact = false,
  showNote = false
}) => {
  const chartHeight = compact ? 148 : 200
  const intakeRate = useMemo(
    () => conversions.find((item) => item.label === '完成接入率')?.rate ?? null,
    [conversions]
  )

  return (
    <div className={`access-funnel-chart${compact ? ' access-funnel-chart--compact' : ''}`}>
      <div className="access-funnel-chart__body">
        <div className="access-funnel-chart__funnel">
          <div className="access-funnel-chart__plot" style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <Tooltip
                  formatter={(value: number, _name, item) => {
                    const payload = item?.payload as AccessFunnelStep | undefined
                    return [value, payload?.name || '人数']
                  }}
                />
                <Funnel dataKey="value" data={steps} isAnimationActive={false}>
                  <LabelList
                    position="center"
                    fill="#fff"
                    stroke="none"
                    dataKey="value"
                    fontSize={compact ? 10 : 11}
                  />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
          <div className="access-funnel-chart__funnel-rate">
            完成接入率 <b>{formatConversionRate(intakeRate)}</b>
          </div>
        </div>

        <div className="access-funnel-chart__parallel">
          <span className="access-funnel-chart__parallel-title">接入后并行结果</span>
          {outcomes.map((item) => (
            <div key={item.label} className="access-funnel-chart__outcome">
              <div className="access-funnel-chart__outcome-head">
                <span className="access-funnel-chart__outcome-label">{item.label}</span>
                <span className="access-funnel-chart__outcome-rate">
                  {item.rateLabel} <b>{formatConversionRate(item.rate)}</b>
                </span>
              </div>
              <span className="access-funnel-chart__outcome-value">{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      {showNote ? <p className="access-funnel-chart__note">{ACCESS_FUNNEL_PARALLEL_NOTE}</p> : null}
    </div>
  )
}

export default AccessFunnelChart
