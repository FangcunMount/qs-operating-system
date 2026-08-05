import type { ActionDescriptor, Signal } from '@/api/path/systemGovernance'

export const GOVERNANCE_DOMAINS = {
  events: {
    label: '事件链路',
    shortLabel: '事件',
    detailLabel: '事件链路',
    description: '检查业务事件是否及时写入、投递和结算。'
  },
  cache: {
    label: '缓存与预热',
    shortLabel: '缓存',
    detailLabel: '缓存',
    description: '检查缓存组件、策略、命中表现和预热结果。'
  },
  resilience: {
    label: '容量与保护',
    shortLabel: '承压',
    detailLabel: '容量与保护',
    description: '检查队列、依赖并发和保护能力是否接近边界。'
  },
  checkpoint: {
    label: '任务恢复',
    shortLabel: '恢复',
    detailLabel: '任务恢复',
    description: '检查后台任务是否持续推进，以及失败任务能否恢复。'
  },
  actions: {
    label: '治理动作',
    shortLabel: '动作',
    detailLabel: '治理动作',
    description: '在完成诊断后执行受审计、需确认的恢复操作。'
  },
  system: {
    label: '系统',
    shortLabel: '系统',
    detailLabel: '运行总览',
    description: '检查治理数据源和整体运行状态。'
  }
} as const

export type GovernanceDomainKey = keyof typeof GOVERNANCE_DOMAINS

export interface GovernanceDomainPresentation {
  label: string
  shortLabel: string
  detailLabel: string
  description: string
}

export const domainPresentation = (domain?: string): GovernanceDomainPresentation =>
  GOVERNANCE_DOMAINS[domain as GovernanceDomainKey] || {
    label: domain || '其他',
    shortLabel: domain || '其他',
    detailLabel: domain || '诊断',
    description: '查看该问题的详细诊断证据。'
  }

const evidenceValue = (signal: Signal, key: string): string => {
  const prefix = `${key}: `
  const line = (signal.evidence || []).find((item) => item.startsWith(prefix))
  return line ? line.slice(prefix.length) : ''
}

export const signalTitle = (signal: Signal): string => {
  const component = evidenceValue(signal, 'component')
  const queue = evidenceValue(signal, 'queue')

  if (signal.id.includes('cache.component') || /Cache component .*unavailable/i.test(signal.title)) {
    return component ? `无法获取 ${component} 缓存状态` : '无法获取缓存组件状态'
  }
  if (signal.id.includes('cache.family') || signal.status === 'degraded' && signal.domain === 'cache') {
    return '缓存能力正在降级'
  }
  if (signal.id.includes('outbox') || signal.status === 'pending_stale') {
    return '事件排队时间过长'
  }
  if (signal.id.includes('queue') || /Queue utilization critical/i.test(signal.title)) {
    return `${queue || signal.title.split(':').pop()?.trim() || '业务'} 队列接近满载`
  }
  if (signal.domain === 'checkpoint' || signal.id.includes('retryable_failed')) {
    return '存在可恢复的失败任务'
  }
  return signal.title
}

export const signalImpact = (domain?: string): string => {
  switch (domain) {
  case 'events':
    return '业务事件可能延迟投递，相关异步处理结果会晚于预期。'
  case 'cache':
    return '缓存读取或预热能力可能降级；主流程不一定中断，但延迟和数据库压力可能上升。'
  case 'resilience':
    return '请求可能开始排队、超时或被保护机制拒绝。'
  case 'checkpoint':
    return '后台任务可能停留在运行中或失败状态，需要确认是否仍在推进。'
  default:
    return '该问题可能影响系统可观测性或运行稳定性。'
  }
}

export const signalRecommendation = (domain?: string): string => {
  switch (domain) {
  case 'events':
    return '先确认积压数量、最老等待时间和异常事件类型，再决定是否执行重放。'
  case 'cache':
    return '先检查组件连通性和缓存族最近错误，再判断是否需要预热或重载策略。'
  case 'resilience':
    return '先定位高利用率队列或依赖，确认流量和下游状态后再调整保护参数。'
  case 'checkpoint':
    return '先确认任务进程与锁状态，再对可重试失败执行受控恢复。'
  default:
    return '打开详情核对证据，确认影响范围后再执行治理动作。'
  }
}

const EVIDENCE_LABELS: Record<string, string> = {
  component: '组件',
  reason: '原因',
  family: '缓存族',
  profile: '配置',
  namespace: '命名空间',
  queue: '队列',
  depth: '当前深度',
  capacity: '容量',
  utilization: '利用率',
  store: '存储',
  count: '数量',
  oldest_age_seconds: '最老等待',
  oldest_pending_age_seconds: '最老等待',
  evaluation_run_failed_retryable: '可重试失败'
}

export const presentEvidenceLine = (line: string): string => {
  const separator = line.indexOf(':')
  if (separator < 0) return line
  const key = line.slice(0, separator)
  const rawValue = line.slice(separator + 1).trim()
  const label = EVIDENCE_LABELS[key] || key
  const numericValue = Number(rawValue)

  if (key === 'utilization' && Number.isFinite(numericValue)) {
    return `${label}：${(numericValue * 100).toFixed(1)}%`
  }
  if ((key === 'oldest_age_seconds' || key === 'oldest_pending_age_seconds') && Number.isFinite(numericValue)) {
    return `${label}：${Math.round(numericValue)} 秒`
  }
  return `${label}：${rawValue}`
}

interface ActionPresentation {
  label: string
  description: string
}

const ACTION_PRESENTATIONS: Record<string, ActionPresentation> = {
  'cache.reload_policy': { label: '重载缓存策略', description: '重新加载已发布的缓存策略，并使用版本号保护并发修改。' },
  'cache.manual_warmup': { label: '手工预热缓存', description: '为明确的缓存类型和范围提前加载数据。' },
  'cache.repair_complete': { label: '完成修复后的缓存收敛', description: '在业务修复完成后触发相应缓存失效与重建。' },
  'events.replay_pending': { label: '重放待处理事件', description: '对选定的 Outbox 事件重新发起投递。' },
  'events.replay_delivery': { label: '重放传输死信', description: '重新投递已经进入传输失败终态的消息。' },
  'evaluation.retry': { label: '重试评估任务', description: '按当前尝试次数保护，恢复可重试的评估任务。' },
  'evaluation.force_retry': { label: '强制重试评估任务', description: '重新打开已进入终态的评估任务，风险较高。' },
  'interpretation.retry': { label: '重试报告生成', description: '恢复可重试的报告解释或生成任务。' },
  'interpretation.force_retry': { label: '强制重试报告生成', description: '重新打开已进入终态的报告任务，风险较高。' },
  'interpretation.report_template_publish': { label: '发布报告模板', description: '将指定草稿版本发布为可用报告模板。' },
  'interpretation.report_template_disable': { label: '停用报告模板', description: '停止指定已发布模板继续被选择。' },
  'interpretation.readmit_outcome': { label: '重新接纳评估结果', description: '将满足前置条件的已提交结果重新送入报告链路。' },
  'interpretation.catalog_repair': { label: '修复报告目录', description: '基于已确认的 dry-run 结果修复报告目录漂移。' },
  'resilience.release_lock': { label: '释放治理租约', description: '让当前实例主动放弃 leader 租约，由其他实例接管。' },
  'resilience.tune_rate_limit': { label: '调整限流参数', description: '在版本保护下调整运行时限流预算。' }
}

export const actionPresentation = (action: ActionDescriptor): ActionPresentation =>
  ACTION_PRESENTATIONS[action.id] || {
    label: action.label,
    description: '执行该治理动作前，请先核对输入条件和影响范围。'
  }

export const severityLabel = (severity?: string): string => {
  if (severity === 'critical') return '严重'
  if (severity === 'warning' || severity === 'degraded') return '需关注'
  if (severity === 'healthy') return '正常'
  return '提示'
}
