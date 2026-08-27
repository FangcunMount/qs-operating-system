import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Progress,
  Row,
  Space,
  Tag,
  Typography
} from 'antd'
import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import {
  getAIEvaluationCapacity,
  getAIParticipantCapacity,
  listAIEvaluationRuns,
  listAIProfiles
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationCapacity,
  AIEvaluationRunSummary,
  AIParticipantCapacity,
  AIProfile
} from '@/api/path/aiGovernance'
import { GovernanceStatGrid } from '../../shared/components/GovernanceStatGrid'
import { buildGovernanceOverview } from '../overview'
import type { GovernanceStageState } from '../overview'
import { pathForAIGovernanceView } from '../navigation'
import { errorMessage, formatTime } from '../presentation'

const { Paragraph, Text, Title } = Typography

const STAGE_LABELS: Record<GovernanceStageState, string> = {
  complete: '已具备',
  active: '进行中',
  attention: '需处理',
  pending: '未开始',
  unknown: '不可判定'
}

const STAGE_COLORS: Record<GovernanceStageState, string> = {
  complete: 'green',
  active: 'processing',
  attention: 'red',
  pending: 'default',
  unknown: 'orange'
}

const stageIcon = (state: GovernanceStageState): JSX.Element => {
  if (state === 'complete') return <CheckCircleOutlined />
  if (state === 'active') return <ClockCircleOutlined />
  if (state === 'attention') return <ExclamationCircleOutlined />
  if (state === 'unknown') return <QuestionCircleOutlined />
  return <span className="ai-governance-stage__pending-dot" />
}

export const GovernanceOverviewWorkspace: React.FC = () => {
  const history = useHistory()
  const [profiles, setProfiles] = useState<AIProfile[] | undefined>()
  const [runs, setRuns] = useState<AIEvaluationRunSummary[] | undefined>()
  const [evaluationCapacity, setEvaluationCapacity] = useState<AIEvaluationCapacity | undefined>()
  const [participantCapacity, setParticipantCapacity] = useState<AIParticipantCapacity | undefined>()
  const [profileHasMore, setProfileHasMore] = useState(false)
  const [runHasMore, setRunHasMore] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [loadedAt, setLoadedAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setErrors([])
    const [profileResult, runResult, evaluationCapacityResult, participantCapacityResult] = await Promise.all([
      listAIProfiles({ limit: 100 }),
      listAIEvaluationRuns({ limit: 100 }),
      getAIEvaluationCapacity(),
      getAIParticipantCapacity()
    ])
    setLoading(false)

    const nextErrors: string[] = []
    const [profileError, profileResponse] = profileResult
    const [runError, runResponse] = runResult
    const [evaluationCapacityError, evaluationCapacityResponse] = evaluationCapacityResult
    const [participantCapacityError, participantCapacityResponse] = participantCapacityResult

    if (profileResponse) {
      setProfiles(profileResponse.data?.items || [])
      setProfileHasMore(Boolean(profileResponse.data?.next_cursor))
    } else {
      setProfiles(undefined)
      setProfileHasMore(false)
      nextErrors.push(errorMessage(profileError, 'Profile 目录获取失败'))
    }
    if (runResponse) {
      setRuns(runResponse.data?.items || [])
      setRunHasMore(Boolean(runResponse.data?.next_cursor))
    } else {
      setRuns(undefined)
      setRunHasMore(false)
      nextErrors.push(errorMessage(runError, '评测目录获取失败'))
    }
    if (evaluationCapacityResponse) {
      setEvaluationCapacity(evaluationCapacityResponse.data)
    } else {
      setEvaluationCapacity(undefined)
      nextErrors.push(errorMessage(evaluationCapacityError, '评测容量获取失败'))
    }
    if (participantCapacityResponse) {
      setParticipantCapacity(participantCapacityResponse.data)
    } else {
      setParticipantCapacity(undefined)
      nextErrors.push(errorMessage(participantCapacityError, '用户调用容量获取失败'))
    }
    setErrors(nextErrors)
    setLoadedAt(new Date().toISOString())
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const overview = useMemo(() => buildGovernanceOverview({
    profiles,
    runs,
    evaluationCapacity,
    participantCapacity
  }), [evaluationCapacity, participantCapacity, profiles, runs])

  const evaluationPercent = evaluationCapacity?.daily_provider_invocation_limit
    ? Math.min(100, Math.round(
      evaluationCapacity.reserved_provider_invocations /
      evaluationCapacity.daily_provider_invocation_limit * 100
    ))
    : 0
  const participantPercent = participantCapacity?.daily_provider_invocation_limit_per_org
    ? Math.min(100, Math.round(
      participantCapacity.reserved_provider_invocations /
      participantCapacity.daily_provider_invocation_limit_per_org * 100
    ))
    : 0

  const navigatePriority = () => {
    if (overview.priority.view === 'overview') {
      load()
      return
    }
    history.push(pathForAIGovernanceView(overview.priority.view))
  }

  return (
    <div className="ai-governance-workspace ai-governance-overview">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>治理总览</Title>
          <Paragraph type="secondary">
            将候选策略、质量证据、人工责任、发布决策与运行容量串成一条可审计发布路径。
          </Paragraph>
        </div>
        <Space direction="vertical" align="end" size={4}>
          <Button icon={<ReloadOutlined />} loading={loading} onClick={load}>刷新治理状态</Button>
          <Text type="secondary">最近刷新：{loadedAt ? formatTime(loadedAt) : '尚未完成'}</Text>
        </Space>
      </div>

      {errors.length ? (
        <Alert
          type="warning"
          showIcon
          message="部分治理事实不可用，页面已降级为未知状态"
          description={errors.join('；')}
        />
      ) : null}

      {(profileHasMore || runHasMore) ? (
        <Alert
          type="info"
          showIcon
          message="总览数字来自当前最新 100 条窗口"
          description="目录仍有下一页；总览不会把当前窗口数量冒充全量统计，精确查询请进入对应工作区。"
        />
      ) : null}

      <GovernanceStatGrid items={[
        {
          key: 'draft-profiles',
          title: '候选 Profile',
          value: profiles === undefined ? '—' : overview.draftProfiles,
          suffix: profiles === undefined ? '' : '个'
        },
        {
          key: 'collecting-runs',
          title: '执行中评测',
          value: runs === undefined ? '—' : overview.collectingRuns,
          suffix: runs === undefined ? '' : '个'
        },
        {
          key: 'awaiting-review-runs',
          title: '待人工审核',
          value: runs === undefined ? '—' : overview.awaitingReviewRuns,
          suffix: runs === undefined ? '' : '个'
        },
        {
          key: 'releasable-drafts',
          title: '证据匹配可发布',
          value: profiles === undefined || runs === undefined ? '—' : overview.releasableDrafts,
          suffix: profiles === undefined || runs === undefined ? '' : '个',
          prefix: <SafetyCertificateOutlined />
        },
        {
          key: 'published-profiles',
          title: '已发布 Profile',
          value: profiles === undefined ? '—' : overview.publishedProfiles,
          suffix: profiles === undefined ? '' : '个'
        }
      ]} />

      <Card
        className={`ai-governance-priority-card is-${overview.priority.tone}`}
        title="当前优先治理动作"
        extra={<Tag color={overview.priority.tone === 'warning' ? 'orange' : 'blue'}>NEXT DECISION</Tag>}
        loading={loading && !loadedAt}
      >
        <div className="ai-governance-priority-card__content">
          <div>
            <Title level={4}>{overview.priority.title}</Title>
            <Paragraph>{overview.priority.description}</Paragraph>
          </div>
          <Button type="primary" icon={<ArrowRightOutlined />} onClick={navigatePriority}>
            {overview.priority.action}
          </Button>
        </div>
      </Card>

      <Card
        title="从候选策略到运行观察"
        className="ai-governance-lifecycle-card"
        loading={loading && !loadedAt}
      >
        <div className="ai-governance-lifecycle">
          {overview.stages.map((item, index) => (
            <div key={item.key} className={`ai-governance-stage is-${item.state}`}>
              <div className="ai-governance-stage__head">
                <span className="ai-governance-stage__index">{index + 1}</span>
                <Tag icon={stageIcon(item.state)} color={STAGE_COLORS[item.state]}>{STAGE_LABELS[item.state]}</Tag>
              </div>
              <Title level={5}>{item.title}</Title>
              <Paragraph type="secondary">{item.description}</Paragraph>
              <Button type="link" onClick={() => history.push(pathForAIGovernanceView(item.view))}>
                {item.action}<ArrowRightOutlined />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={8}>
          <Card title="评测预算" className="ai-governance-overview-card">
            {evaluationCapacity ? (
              <>
                <Progress
                  percent={evaluationPercent}
                  status={evaluationCapacity.over_limit ? 'exception' : 'active'}
                  format={() => `${evaluationCapacity.reserved_provider_invocations}/${evaluationCapacity.daily_provider_invocation_limit}`}
                />
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="完整评测可启动">{evaluationCapacity.available_full_run_starts} 次</Descriptions.Item>
                  <Descriptions.Item label="单次预留">{evaluationCapacity.provider_invocations_per_start} 次调用</Descriptions.Item>
                </Descriptions>
              </>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="评测容量不可判定" />}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="用户调用预算" className="ai-governance-overview-card">
            {participantCapacity ? (
              <>
                <Progress
                  percent={participantPercent}
                  status={participantCapacity.over_org_limit ? 'exception' : 'active'}
                  format={() => `${participantCapacity.reserved_provider_invocations}/${participantCapacity.daily_provider_invocation_limit_per_org}`}
                />
                <Descriptions size="small" column={1}>
                  <Descriptions.Item label="剩余调用">{participantCapacity.remaining_org_provider_invocations}</Descriptions.Item>
                  <Descriptions.Item label="活跃执行">
                    {participantCapacity.active_provider_executions}/{participantCapacity.max_active_provider_executions_per_org}
                  </Descriptions.Item>
                </Descriptions>
              </>
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="用户容量不可判定" />}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="决策边界" className="ai-governance-overview-card">
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="控制台可确认">Profile、评测证据、审核进度、容量</Descriptions.Item>
              <Descriptions.Item label="控制台不可确认">生产总开关、密钥有效性、真实用户灰度</Descriptions.Item>
            </Descriptions>
            <Alert
              type="info"
              showIcon
              message="Profile 发布不等于用户流量开放"
              description="当前 API 没有独立的生产开关状态契约，页面不会根据对象存在性推断功能已开放。"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
