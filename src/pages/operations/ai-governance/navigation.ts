export const AI_GOVERNANCE_BASE_PATH = '/operations/ai-governance'

export type AIGovernanceView = 'evaluations' | 'reviews' | 'profiles' | 'runtime'

const VIEW_PATHS: Record<AIGovernanceView, string> = {
  evaluations: `${AI_GOVERNANCE_BASE_PATH}/evaluations`,
  reviews: `${AI_GOVERNANCE_BASE_PATH}/reviews`,
  profiles: `${AI_GOVERNANCE_BASE_PATH}/profiles`,
  runtime: `${AI_GOVERNANCE_BASE_PATH}/runtime`
}

export const AI_GOVERNANCE_NAVIGATION: Array<{ view: AIGovernanceView; label: string; description: string }> = [
  { view: 'evaluations', label: '评测发布', description: '冻结发布身份，执行 35+35 评测并完成终审。' },
  { view: 'reviews', label: '人工审核台', description: '逐条复核测评语义、安全边界与可追溯证据。' },
  { view: 'profiles', label: 'Profile 管理', description: '管理 AI 解读策略版本和发布证据。' },
  { view: 'runtime', label: '运行治理', description: '观察容量、活跃调用并执行受控恢复。' }
]

export const pathForAIGovernanceView = (view: AIGovernanceView): string => VIEW_PATHS[view]

export const viewFromAIGovernancePath = (pathname: string): AIGovernanceView => {
  const normalized = pathname.replace(/\/$/, '')
  const matched = (Object.keys(VIEW_PATHS) as AIGovernanceView[])
    .find((view) => normalized === VIEW_PATHS[view])
  return matched || 'evaluations'
}
