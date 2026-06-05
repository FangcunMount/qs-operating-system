export type AccessFunnelWindowCounts = {
  entry_opened_count: number
  intake_confirmed_count: number
  testee_created_count: number
  care_relationship_established_count: number
}

export type AccessFunnelStep = {
  name: string
  value: number
  fill: string
}

export type AccessFunnelConversion = {
  label: string
  rate: number | null
}

export type AccessFunnelOutcome = {
  label: string
  value: number
  rateLabel: string
  rate: number | null
}

export const ACCESS_FUNNEL_PARALLEL_NOTE = '建档与建立照护为接入后并行结果，均相对完成接入统计。'

const FUNNEL_STEP_NAMES = ['入口打开', '完成接入', '新建档案'] as const

function safeRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return numerator / denominator
}

export function formatConversionRate(rate: number | null): string {
  if (rate === null) return '-'
  return `${(rate * 100).toFixed(1)}%`
}

export function buildAccessFunnelSteps(
  window: AccessFunnelWindowCounts,
  colors: string[]
): {
  steps: AccessFunnelStep[]
  conversions: AccessFunnelConversion[]
  outcomes: AccessFunnelOutcome[]
} {
  const funnelValues = [
    window.entry_opened_count,
    window.intake_confirmed_count,
    window.testee_created_count
  ]

  const steps = FUNNEL_STEP_NAMES.map((name, index) => ({
    name,
    value: funnelValues[index],
    fill: colors[index % colors.length]
  }))

  const conversions: AccessFunnelConversion[] = [
    { label: '完成接入率', rate: safeRate(window.intake_confirmed_count, window.entry_opened_count) },
    { label: '建档率', rate: safeRate(window.testee_created_count, window.intake_confirmed_count) },
    {
      label: '建立照护率',
      rate: safeRate(window.care_relationship_established_count, window.intake_confirmed_count)
    }
  ]

  const outcomes: AccessFunnelOutcome[] = [
    {
      label: '新建档案',
      value: window.testee_created_count,
      rateLabel: '建档率',
      rate: safeRate(window.testee_created_count, window.intake_confirmed_count)
    },
    {
      label: '建立照护',
      value: window.care_relationship_established_count,
      rateLabel: '建立照护率',
      rate: safeRate(window.care_relationship_established_count, window.intake_confirmed_count)
    }
  ]

  return { steps, conversions, outcomes }
}

export function hasFunnelData(steps: AccessFunnelStep[]): boolean {
  return steps.some((step) => step.value > 0)
}
