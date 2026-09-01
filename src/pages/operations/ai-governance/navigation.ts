export const AI_GOVERNANCE_BASE_PATH = '/operations/ai-governance'

export type AIGovernanceView = 'overview' | 'evaluations' | 'reviews' | 'profiles' | 'runtime'

const VIEW_PATHS: Record<AIGovernanceView, string> = {
  overview: AI_GOVERNANCE_BASE_PATH,
  evaluations: `${AI_GOVERNANCE_BASE_PATH}/evaluations`,
  reviews: `${AI_GOVERNANCE_BASE_PATH}/reviews`,
  profiles: `${AI_GOVERNANCE_BASE_PATH}/profiles`,
  runtime: `${AI_GOVERNANCE_BASE_PATH}/runtime`
}

export const AI_GOVERNANCE_NAVIGATION: Array<{ view: AIGovernanceView; label: string; description: string }> = [
  { view: 'overview', label: '治理总览', description: '识别当前发布阶段、阻塞点和下一项治理动作。' },
  { view: 'evaluations', label: '评测发布', description: '冻结发布身份，收集 35 个 Candidate；最坏预算为 70 次生成与 70 次独立模型裁判。' },
  { view: 'reviews', label: '人工审核台', description: '逐条复核测评语义、安全边界与可追溯证据。' },
  { view: 'profiles', label: 'Profile 管理', description: '管理 AI 解读策略版本和发布证据。' },
  { view: 'runtime', label: '运行治理', description: '观察容量、活跃调用并执行受控恢复。' }
]

export const pathForAIGovernanceView = (view: AIGovernanceView): string => VIEW_PATHS[view]

export const viewFromAIGovernancePath = (pathname: string): AIGovernanceView => {
  const normalized = pathname.replace(/\/$/, '')
  const matched = (Object.keys(VIEW_PATHS) as AIGovernanceView[])
    .find((view) => normalized === VIEW_PATHS[view])
  return matched || 'overview'
}
