import React, { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  List,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message
} from 'antd'
import { ArrowRightOutlined, SearchOutlined } from '@ant-design/icons'
import {
  getAIEvaluationCandidateV2,
  getAIEvaluationRunV2,
  recordAIHumanReviewV2
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationCandidateEvidenceV2,
  AIEvaluationCandidateV2,
  AIEvaluationRunV2,
  AIReviewDecision,
  AIReviewRole
} from '@/api/path/aiGovernance'
import { JsonEvidence } from '../components/JsonEvidence'
import { errorMessage, evaluationStatusTag, reviewDecisionTag, reviewRoleLabel } from '../presentation'

const { Paragraph, Text, Title } = Typography
const REQUIRED_ROLES: AIReviewRole[] = ['assessment_semantics', 'safety_product']

export interface QueueItem extends AIEvaluationCandidateV2 {
  runID: string
  caseID: string
  slotOrdinal: number
  missing_roles: AIReviewRole[]
}

export const buildReviewQueue = (runs: AIEvaluationRunV2[]): QueueItem[] => runs.flatMap((run) => {
  if (run.status !== 'awaiting_review') return []
  return run.slots.flatMap((slot) => {
    if (!slot.candidate?.review_ready) return []
    const recorded = new Set(
      run.human_reviews
        .filter((review) => review.candidate_id === slot.candidate?.candidate_id)
        .map((review) => review.role)
    )
    const missingRoles = REQUIRED_ROLES.filter((role) => !recorded.has(role))
    return missingRoles.length
      ? [{
        ...slot.candidate,
        runID: run.run_id,
        caseID: slot.case_id,
        slotOrdinal: slot.slot_ordinal,
        missing_roles: missingRoles
      }]
      : []
  })
})

const standardFacts = (input: unknown): unknown => {
  if (!input || typeof input !== 'object') return input
  const record = input as Record<string, unknown>
  return record.facts || record.assessment || record
}

export const HumanReviewWorkspace: React.FC = () => {
  const [runID, setRunID] = useState('')
  const [run, setRun] = useState<AIEvaluationRunV2 | null>(null)
  const [selected, setSelected] = useState<QueueItem | null>(null)
  const [detail, setDetail] = useState<AIEvaluationCandidateEvidenceV2 | null>(null)
  const [role, setRole] = useState<AIReviewRole | undefined>()
  const [decision, setDecision] = useState<AIReviewDecision>('approve')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const queue = useMemo(() => buildReviewQueue(run ? [run] : []), [run])

  const openCandidate = async (item: QueueItem) => {
    setSelected(item)
    setDetail(null)
    setRole(item.missing_roles[0])
    setReason('')
    setDetailLoading(true)
    const [requestError, response] = await getAIEvaluationCandidateV2(item.runID, item.candidate_id)
    setDetailLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Candidate 审核证据获取失败'))
      return
    }
    setDetail(response.data)
  }

  const loadRun = async (value: string) => {
    if (!value.trim()) return
    setLoading(true)
    const [requestError, response] = await getAIEvaluationRunV2(value.trim())
    setLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'v2 评测 Run 获取失败'))
      return
    }
    const nextRun = response.data
    setRun(nextRun)
    setRunID(nextRun.run_id)
    setSelected(null)
    setDetail(null)
    const first = buildReviewQueue([nextRun])[0]
    if (first) await openCandidate(first)
  }

  const submitReview = async () => {
    if (!run || !selected || !role || !reason.trim()) return
    setSubmitting(true)
    const [requestError, response] = await recordAIHumanReviewV2(run.run_id, {
      candidate_id: selected.candidate_id,
      role,
      decision,
      reason: reason.trim()
    })
    setSubmitting(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Candidate 人工审核提交失败'))
      return
    }
    const nextRun = response.data
    setRun(nextRun)
    message.success('审核意见已记录；审核人身份和双角色隔离由服务端确认')
    const next = buildReviewQueue([nextRun])[0]
    if (next) await openCandidate(next)
    else {
      setSelected(null)
      setDetail(null)
      setRole(undefined)
      setReason('')
    }
  }

  const currentIndex = selected ? queue.findIndex((item) => item.candidate_id === selected.candidate_id) : -1
  const nextQueueItem = currentIndex >= 0 ? queue[currentIndex + 1] : queue[0]
  const requiredReviews = (run?.required_candidates || 0) * 2
  const reviewPercent = requiredReviews ? Math.round((run?.human_reviews.length || 0) / requiredReviews * 100) : 0

  return (
    <div className="ai-governance-workspace">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>Candidate 人工审核台 v2</Title>
          <Paragraph type="secondary">
            当前没有 v2 待审列表接口；输入精确 Run ID 后，从 review_ready Candidate 和已记录角色派生队列。
          </Paragraph>
        </div>
        <Input.Search
          value={runID}
          onChange={(event) => setRunID(event.target.value)}
          onSearch={loadRun}
          enterButton={<SearchOutlined />}
          placeholder="输入 awaiting_review v2 Run ID"
          style={{ width: 320 }}
          loading={loading}
        />
      </div>

      {run && run.status !== 'awaiting_review' ? (
        <Alert
          className="ai-governance-inline-alert"
          type="warning"
          showIcon
          message={`当前 Run 状态为 ${run.status}，不可审核`}
          description="只有服务端已收集齐 Candidate 与语义收据并进入 awaiting_review 后，页面才派生审核队列。"
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card title={`当前 Run 待审核 Candidate（${queue.length}）`} loading={loading}>
            <List
              dataSource={queue}
              locale={{ emptyText: <Empty description="请输入可审核的 v2 Run ID" /> }}
              renderItem={(item) => (
                <List.Item
                  className={selected?.candidate_id === item.candidate_id ? 'is-selected' : ''}
                  onClick={() => openCandidate(item)}
                >
                  <List.Item.Meta
                    title={<Space><Text code>{item.caseID}</Text><Tag>Slot {item.slotOrdinal}</Tag></Space>}
                    description={(
                      <Space direction="vertical" size={2}>
                        <Text type="secondary" copyable>{item.candidate_id}</Text>
                        <Space wrap>{item.missing_roles.map((value) => <Tag key={value}>{reviewRoleLabel(value)}</Tag>)}</Space>
                      </Space>
                    )}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={17}>
          {!selected ? <Card><Empty description="请选择 Candidate" /></Card> : (
            <Card
              loading={detailLoading}
              title={<Space><Text code>{selected.caseID}</Text><Tag>Slot {selected.slotOrdinal}</Tag></Space>}
              extra={nextQueueItem ? (
                <Button icon={<ArrowRightOutlined />} onClick={() => openCandidate(nextQueueItem)}>下一条</Button>
              ) : null}
            >
              {run ? (
                <Space direction="vertical" className="ai-governance-review-progress">
                  <Space>{evaluationStatusTag(run.status)}<Text code>{run.run_id}</Text></Space>
                  <Progress percent={reviewPercent} />
                  <Text type="secondary">已记录 {run.human_reviews.length}/{requiredReviews} 条审核</Text>
                </Space>
              ) : null}

              <div className="ai-governance-review-form">
                <Select<AIReviewRole>
                  value={role}
                  placeholder="选择审核视角"
                  onChange={setRole}
                  options={selected.missing_roles.map((value) => ({ value, label: reviewRoleLabel(value) }))}
                  style={{ minWidth: 190 }}
                />
                <Radio.Group value={decision} onChange={(event) => setDecision(event.target.value)}>
                  <Radio.Button value="approve">通过</Radio.Button>
                  <Radio.Button value="reject">拒绝</Radio.Button>
                </Radio.Group>
                <Input.TextArea
                  rows={3}
                  maxLength={1000}
                  showCount
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="必填：说明测评语义、安全边界或产品质量判断依据。"
                />
                <Button
                  type="primary"
                  danger={decision === 'reject'}
                  disabled={!role || !reason.trim() || !detail}
                  loading={submitting}
                  onClick={submitReview}
                >
                  提交{decision === 'approve' ? '通过' : '拒绝'}意见
                </Button>
              </div>

              {detail ? (
                <>
                  <Row gutter={[16, 16]} className="ai-governance-evidence-grid">
                    <Col xs={24} xl={12}>
                      <Card size="small" title="冻结的标准事实">
                        <JsonEvidence value={standardFacts(detail.assessment_input)} />
                      </Card>
                      <Card size="small" title="完整冻结输入">
                        <JsonEvidence value={detail.assessment_input} />
                      </Card>
                    </Col>
                    <Col xs={24} xl={12}>
                      <Card size="small" title="Candidate 原始输出">
                        <JsonEvidence value={detail.accepted_generation_execution.raw_output} />
                      </Card>
                      <Card size="small" title="Candidate 规范化输出">
                        <JsonEvidence value={detail.accepted_generation_execution.normalized_output} />
                      </Card>
                    </Col>
                  </Row>
                  <Card size="small" title="确定性断言">
                    <Table
                      rowKey={(item) => `${item.type}:${item.scope}:${item.ordinal}`}
                      dataSource={detail.candidate.assertions}
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '校验', dataIndex: 'type' },
                        { title: '范围', dataIndex: 'scope' },
                        { title: '执行器', dataIndex: 'evaluator' },
                        {
                          title: '结果',
                          dataIndex: 'status',
                          render: function renderAssertionStatus(value) {
                            return <Tag color={value === 'passed' ? 'green' : 'red'}>{value}</Tag>
                          }
                        },
                        { title: '证据', dataIndex: 'detail' }
                      ]}
                    />
                  </Card>
                  {detail.accepted_semantic_execution?.semantic_result ? (
                    <Card size="small" title="已接受的独立语义裁判">
                      <Descriptions size="small" bordered column={5}>
                        {Object.entries(detail.accepted_semantic_execution.semantic_result.scores).map(([key, value]) => (
                          <Descriptions.Item key={key} label={key}>{value}</Descriptions.Item>
                        ))}
                      </Descriptions>
                      <Paragraph>{detail.accepted_semantic_execution.semantic_result.rationale}</Paragraph>
                      <JsonEvidence value={detail.accepted_semantic_execution.normalized_output} />
                    </Card>
                  ) : null}
                  {detail.human_reviews.length ? (
                    <Card size="small" title="已记录审核">
                      <List
                        dataSource={detail.human_reviews}
                        renderItem={(item) => (
                          <List.Item>
                            <List.Item.Meta
                              title={<Space><Tag>{reviewRoleLabel(item.role)}</Tag>{reviewDecisionTag(item.decision)}</Space>}
                              description={`${item.reviewer}：${item.reason}`}
                            />
                          </List.Item>
                        )}
                      />
                    </Card>
                  ) : null}
                </>
              ) : null}
            </Card>
          )}
        </Col>
      </Row>
    </div>
  )
}
