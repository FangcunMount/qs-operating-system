import type {
  AIEvaluationCapacity,
  AIEvaluationRunSummary,
  AIParticipantCapacity,
  AIProfile
} from '@/api/path/aiGovernance'
import type { AIGovernanceView } from './navigation'

export type GovernanceStageState = 'complete' | 'active' | 'attention' | 'pending' | 'unknown'

export interface GovernanceOverviewInput {
  profiles?: AIProfile[]
  runs?: AIEvaluationRunSummary[]
  evaluationCapacity?: AIEvaluationCapacity
  participantCapacity?: AIParticipantCapacity
}

export interface GovernanceStage {
  key: string
  title: string
  description: string
  state: GovernanceStageState
  view: AIGovernanceView
  action: string
}

export interface GovernancePriorityAction {
  title: string
  description: string
  view: AIGovernanceView
  action: string
  tone: 'normal' | 'warning'
}

export interface GovernanceOverviewModel {
  draftProfiles: number
  publishedProfiles: number
  collectingRuns: number
  awaitingReviewRuns: number
  failedEvaluationRuns: number
  releasableDrafts: number
  stages: GovernanceStage[]
  priority: GovernancePriorityAction
}

export const evaluationMatchesProfile = (
  run: AIEvaluationRunSummary,
  profile: AIProfile
): boolean => run.status === 'approved' &&
  run.release.profile.id === profile.definition.profile_id &&
  run.release.profile.version === profile.definition.version &&
  run.release.profile.fingerprint === profile.fingerprint

const stage = (
  key: string,
  title: string,
  description: string,
  state: GovernanceStageState,
  view: AIGovernanceView,
  action: string
): GovernanceStage => ({ key, title, description, state, view, action })

export const buildGovernanceOverview = ({
  profiles,
  runs,
  evaluationCapacity,
  participantCapacity
}: GovernanceOverviewInput): GovernanceOverviewModel => {
  const draftProfiles = profiles?.filter((profile) => profile.status === 'draft').length || 0
  const publishedProfiles = profiles?.filter((profile) => profile.status === 'published').length || 0
  const collectingRuns = runs?.filter((run) => run.status === 'collecting').length || 0
  const failedEvaluationRuns = runs?.filter((run) =>
    run.status === 'awaiting_review' && run.progress.failed_attempts > 0).length || 0
  const awaitingReviewRuns = runs?.filter((run) =>
    run.status === 'awaiting_review' && run.can_review && run.progress.failed_attempts === 0).length || 0
  const approvedRuns = runs?.filter((run) => run.status === 'approved') || []
  const rejectedRuns = runs?.filter((run) => run.status === 'rejected').length || 0
  const releasableDrafts = profiles?.filter((profile) => profile.status === 'draft' &&
    approvedRuns.some((run) => evaluationMatchesProfile(run, profile))).length || 0

  const profilesUnknown = profiles === undefined
  const runsUnknown = runs === undefined
  const profileCandidateState: GovernanceStageState = profilesUnknown
    ? 'unknown'
    : draftProfiles + publishedProfiles > 0 ? 'complete' : 'pending'
  const evaluationState: GovernanceStageState = runsUnknown
    ? 'unknown'
    : failedEvaluationRuns > 0 ? 'attention'
      : collectingRuns > 0 ? 'active'
        : awaitingReviewRuns + approvedRuns.length > 0 ? 'complete'
          : rejectedRuns > 0 ? 'attention' : 'pending'
  const reviewState: GovernanceStageState = runsUnknown
    ? 'unknown'
    : failedEvaluationRuns > 0 ? 'attention'
      : awaitingReviewRuns > 0 ? 'active'
        : approvedRuns.length > 0 ? 'complete'
          : rejectedRuns > 0 ? 'attention' : 'pending'
  const finalizationState: GovernanceStageState = runsUnknown
    ? 'unknown'
    : failedEvaluationRuns > 0 ? 'attention'
      : approvedRuns.length > 0 ? 'complete'
        : awaitingReviewRuns > 0 ? 'active'
          : rejectedRuns > 0 ? 'attention' : 'pending'
  const publicationState: GovernanceStageState = profilesUnknown
    ? 'unknown'
    : releasableDrafts > 0 ? 'active' : publishedProfiles > 0 ? 'complete' : 'pending'
  const runtimeState: GovernanceStageState = publishedProfiles === 0
    ? 'pending'
    : participantCapacity === undefined
      ? 'unknown'
      : participantCapacity.over_org_limit || participantCapacity.over_org_active_limit ? 'attention' : 'complete'

  let priority: GovernancePriorityAction
  if (profilesUnknown || runsUnknown) {
    priority = {
      title: '先恢复治理目录可见性',
      description: 'Profile 或评测目录当前不可用，不能可靠判断发布阶段。请检查服务端 AI 解读模块和当前账号能力。',
      view: 'overview',
      action: '重新加载状态',
      tone: 'warning'
    }
  } else if (draftProfiles + publishedProfiles === 0) {
    priority = {
      title: '创建首个候选 Profile',
      description: '还没有可参与冻结评测的策略版本。先创建草稿并确认 Profile Definition 与指纹。',
      view: 'profiles',
      action: '进入 Profile 管理',
      tone: 'normal'
    }
  } else if (failedEvaluationRuns > 0) {
    priority = {
      title: `审计取消 ${failedEvaluationRuns} 个技术失败 Run`,
      description: '执行记录已经完整落库，但生成或独立模型裁判存在技术失败。该类 Run 不得进入人工审核，应保留证据、取消后修复重跑。',
      view: 'evaluations',
      action: '核验并取消失败 Run',
      tone: 'warning'
    }
  } else if (awaitingReviewRuns > 0) {
    priority = {
      title: `完成 ${awaitingReviewRuns} 个 Run 的双角色审核`,
      description: '评测生成已经完成，当前发布链路阻塞在测评语义与安全产品两类人工证据。',
      view: 'reviews',
      action: '进入人工审核台',
      tone: 'normal'
    }
  } else if (collectingRuns > 0) {
    priority = {
      title: `跟进 ${collectingRuns} 个执行中 Run`,
      description: '冻结发布组合仍在生成或独立模型裁判阶段；异常时只通过受控恢复继续。',
      view: 'evaluations',
      action: '查看评测进度',
      tone: 'normal'
    }
  } else if (releasableDrafts > 0) {
    priority = {
      title: `发布 ${releasableDrafts} 个证据完全匹配的 Profile`,
      description: '候选 Profile 已找到 approved Run，且 Profile ID、版本和指纹一致，可以进行发布二次确认。',
      view: 'profiles',
      action: '校验并发布 Profile',
      tone: 'normal'
    }
  } else if (draftProfiles > 0) {
    const capacityBlocked = Boolean(evaluationCapacity && evaluationCapacity.available_full_run_starts < 1)
    priority = {
      title: '为候选 Profile 生成冻结评测证据',
      description: capacityBlocked
        ? '当前没有完整评测容量，请先检查日预算、活跃 Run 和既有预留。'
        : '当前没有可发布的 approved 证据；启动评测前请确认冻结发布身份指向目标 Profile。',
      view: capacityBlocked ? 'runtime' : 'evaluations',
      action: capacityBlocked ? '检查评测容量' : '进入评测发布',
      tone: capacityBlocked ? 'warning' : 'normal'
    }
  } else {
    priority = {
      title: '观察已发布 Profile 的容量与异常恢复',
      description: '治理证据已经形成；用户流量是否开放仍需通过独立生产配置确认，控制台不从发布状态自行推断。',
      view: 'runtime',
      action: '进入运行治理',
      tone: runtimeState === 'attention' ? 'warning' : 'normal'
    }
  }

  return {
    draftProfiles,
    publishedProfiles,
    collectingRuns,
    awaitingReviewRuns,
    failedEvaluationRuns,
    releasableDrafts,
    priority,
    stages: [
      stage('profile', '定义候选', '创建不可变 Profile 草稿。', profileCandidateState, 'profiles', '管理 Profile'),
      stage('evaluation', '冻结评测', '冻结 Prompt、Schema、Route 与模型。', evaluationState, 'evaluations', '查看评测'),
      stage('review', '双角色审核', '补齐测评语义与安全产品证据。', reviewState, 'reviews', '进入审核'),
      stage('finalize', '终审结论', '生成 approved 或 rejected 不可变结论。', finalizationState, 'evaluations', '查看终审'),
      stage('publish', '发布 Profile', '以完全匹配的 approved Run 作为证据。', publicationState, 'profiles', '校验发布'),
      stage('runtime', '运行观察', '观察预算、活跃调用与受控恢复。', runtimeState, 'runtime', '查看运行')
    ]
  }
}
