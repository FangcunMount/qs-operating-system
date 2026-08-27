import { Tag } from 'antd'
import type {
  AIEvaluationStatus,
  AIProfileStatus,
  AIReviewDecision,
  AIReviewRole
} from '@/api/path/aiGovernance'

const EVALUATION_LABELS: Record<AIEvaluationStatus, string> = {
  collecting: '评测执行中',
  awaiting_review: '待人工审核',
  approved: '已批准',
  rejected: '已拒绝',
  canceled: '已取消'
}

const EVALUATION_COLORS: Record<AIEvaluationStatus, string> = {
  collecting: 'processing',
  awaiting_review: 'orange',
  approved: 'green',
  rejected: 'red',
  canceled: 'default'
}

const PROFILE_LABELS: Record<AIProfileStatus, string> = {
  draft: '草稿',
  published: '已发布',
  disabled: '已停用'
}

const REVIEW_ROLE_LABELS: Record<AIReviewRole, string> = {
  assessment_semantics: '测评语义审核',
  safety_product: '安全与产品审核'
}

export const evaluationStatusTag = (status: AIEvaluationStatus): JSX.Element => (
  <Tag color={EVALUATION_COLORS[status]}>{EVALUATION_LABELS[status]}</Tag>
)

export const profileStatusTag = (status: AIProfileStatus): JSX.Element => (
  <Tag color={status === 'published' ? 'green' : status === 'draft' ? 'blue' : 'default'}>
    {PROFILE_LABELS[status]}
  </Tag>
)

export const reviewRoleLabel = (role: AIReviewRole): string => REVIEW_ROLE_LABELS[role]

export const reviewDecisionTag = (decision: AIReviewDecision): JSX.Element => (
  <Tag color={decision === 'approve' ? 'green' : 'red'}>{decision === 'approve' ? '通过' : '拒绝'}</Tag>
)

export const formatTime = (value?: string): string => {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString()
}

interface RequestErrorShape {
  data?: { message?: string }
  response?: { data?: { message?: string } }
  message?: string
}

export const errorMessage = (error: unknown, fallback: string): string => {
  const requestError = error as RequestErrorShape | null | undefined
  return requestError?.data?.message ||
    requestError?.response?.data?.message ||
    requestError?.message ||
    fallback
}

export const fingerprint = (value?: string): string => value ? `${value.slice(0, 12)}…${value.slice(-8)}` : '—'
