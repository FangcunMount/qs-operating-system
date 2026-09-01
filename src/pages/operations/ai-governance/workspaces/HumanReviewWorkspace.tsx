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
  Modal,
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
  recordAIHumanReviewsV2
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationCandidateEvidenceV2,
  AIEvaluationCandidateV2,
  AIEvaluationRunV2,
  AIHumanReviewBatchRequestV2,
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

export interface ReviewBatchDraft {
  candidate_id: string
  caseID: string
  slotOrdinal: number
  decision: AIReviewDecision
  reason: string
}

interface ReviewBatchPlanItem {
  case_id: string
  slot: number
  decision: AIReviewDecision
  reason: string
}

const reviewPlanKey = (caseID: string, slotOrdinal: number): string => `${caseID}:${slotOrdinal}`

export const parseReviewBatchPlan = (
  rawPlan: string,
  queue: QueueItem[],
  role: AIReviewRole
): ReviewBatchDraft[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(rawPlan)
  } catch (_) {
    throw new Error('审核计划不是有效 JSON')
  }
  if (!Array.isArray(parsed) || !parsed.length) {
    throw new Error('审核计划必须是包含 1 至 35 条记录的 JSON 数组')
  }
  if (parsed.length > 35) {
    throw new Error('单批审核计划不能超过 35 条')
  }

  const candidates = new Map(
    queue
      .filter((item) => item.missing_roles.includes(role))
      .map((item) => [reviewPlanKey(item.caseID, item.slotOrdinal), item])
  )
  const seen = new Set<string>()

  return parsed.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`第 ${index + 1} 条审核计划必须是对象`)
    }
    const item = value as Partial<ReviewBatchPlanItem>
    const caseID = typeof item.case_id === 'string' ? item.case_id.trim() : ''
    const slotOrdinal = item.slot
    const reason = typeof item.reason === 'string' ? item.reason.trim() : ''
    if (!caseID || !Number.isInteger(slotOrdinal) || Number(slotOrdinal) <= 0) {
      throw new Error(`第 ${index + 1} 条审核计划的 case_id 或 slot 无效`)
    }
    if (item.decision !== 'approve' && item.decision !== 'reject') {
      throw new Error(`第 ${index + 1} 条审核计划的 decision 必须是 approve 或 reject`)
    }
    if (!reason || reason.length > 1000) {
      throw new Error(`第 ${index + 1} 条审核计划的 reason 必须为 1 至 1000 个字符`)
    }

    const key = reviewPlanKey(caseID, Number(slotOrdinal))
    if (seen.has(key)) {
      throw new Error(`审核计划包含重复项 ${caseID} Slot ${slotOrdinal}`)
    }
    const candidate = candidates.get(key)
    if (!candidate) {
      throw new Error(`${caseID} Slot ${slotOrdinal} 不属于当前角色的待审队列`)
    }
    seen.add(key)
    return {
      candidate_id: candidate.candidate_id,
      caseID,
      slotOrdinal: Number(slotOrdinal),
      decision: item.decision,
      reason
    }
  })
}

export const upsertReviewBatchDraft = (
  drafts: ReviewBatchDraft[],
  draft: ReviewBatchDraft
): ReviewBatchDraft[] => [...drafts.filter((item) => item.candidate_id !== draft.candidate_id), draft]

export const buildReviewBatchRequest = (
  role: AIReviewRole,
  drafts: ReviewBatchDraft[]
): AIHumanReviewBatchRequestV2 => ({
  role,
  reviews: drafts.map(({ candidate_id, decision, reason }) => ({ candidate_id, decision, reason }))
})

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
  const [batchRole, setBatchRole] = useState<AIReviewRole | undefined>()
  const [batchDrafts, setBatchDrafts] = useState<ReviewBatchDraft[]>([])
  const [batchPlanText, setBatchPlanText] = useState('')
  const [decision, setDecision] = useState<AIReviewDecision>('approve')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const queue = useMemo(() => buildReviewQueue(run ? [run] : []), [run])
  const roleQueue = useMemo(
    () => batchRole ? queue.filter((item) => item.missing_roles.includes(batchRole)) : queue,
    [batchRole, queue]
  )

  const openCandidate = async (item: QueueItem) => {
    setSelected(item)
    setDetail(null)
    const draft = batchDrafts.find((value) => value.candidate_id === item.candidate_id)
    setDecision(draft?.decision || 'approve')
    setReason(draft?.reason || '')
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
    setBatchRole(undefined)
    setBatchDrafts([])
    setBatchPlanText('')
  }

  const importReviewBatchPlan = () => {
    if (!batchRole) {
      message.warning('请先选择本批审核角色')
      return
    }
    try {
      const nextDrafts = parseReviewBatchPlan(batchPlanText, queue, batchRole)
      setBatchDrafts(nextDrafts)
      setBatchPlanText('')
      setSelected(null)
      setDetail(null)
      setReason('')
      message.success(`已校验并载入 ${nextDrafts.length} 条审核计划`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核计划校验失败')
    }
  }

  const addReviewToBatch = async () => {
    if (!selected || !detail || !batchRole || !selected.missing_roles.includes(batchRole) || !reason.trim()) return
    const alreadyPlanned = batchDrafts.some((draft) => draft.candidate_id === selected.candidate_id)
    if (!alreadyPlanned && batchDrafts.length >= 35) {
      message.warning('单批最多只能提交 35 条审核')
      return
    }
    const nextDrafts = upsertReviewBatchDraft(batchDrafts, {
      candidate_id: selected.candidate_id,
      caseID: selected.caseID,
      slotOrdinal: selected.slotOrdinal,
      decision,
      reason: reason.trim()
    })
    setBatchDrafts(nextDrafts)
    message.success(`已加入批量计划（${nextDrafts.length}/35）`)
    const next = roleQueue.find((item) => !nextDrafts.some((draft) => draft.candidate_id === item.candidate_id))
    if (next) await openCandidate(next)
  }

  const submitReviewBatch = async () => {
    if (!run || !batchRole || !batchDrafts.length) return
    setSubmitting(true)
    const [requestError, response] = await recordAIHumanReviewsV2(
      run.run_id,
      buildReviewBatchRequest(batchRole, batchDrafts)
    )
    setSubmitting(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, 'Candidate 批量审核提交失败'))
      return
    }
    const nextRun = response.data
    setRun(nextRun)
    setBatchDrafts([])
    message.success('整批审核已原子记录；审核人身份和双角色隔离由服务端确认')
    const next = buildReviewQueue([nextRun]).find((item) => item.missing_roles.includes(batchRole))
    if (next) await openCandidate(next)
    else {
      setSelected(null)
      setDetail(null)
      setReason('')
    }
  }

  const confirmReviewBatch = () => {
    if (!run || !batchRole || !batchDrafts.length) return
    const rejected = batchDrafts.filter((item) => item.decision === 'reject').length
    Modal.confirm({
      title: `确认提交 ${batchDrafts.length} 条${reviewRoleLabel(batchRole)}审核？`,
      content: `Run ${run.run_id}；通过 ${batchDrafts.length - rejected} 条，拒绝 ${rejected} 条。提交后形成不可替换的审计记录。`,
      okText: '确认批量提交',
      cancelText: '返回复核',
      okType: rejected ? 'danger' : 'primary',
      onOk: submitReviewBatch
    })
  }

  const changeBatchRole = async (value: AIReviewRole) => {
    setBatchRole(value)
    const next = queue.find((item) => item.missing_roles.includes(value))
    if (next) await openCandidate(next)
  }

  const nextQueueItem = roleQueue.find(
    (item) => item.candidate_id !== selected?.candidate_id &&
      !batchDrafts.some((draft) => draft.candidate_id === item.candidate_id)
  )
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

      {run?.status === 'awaiting_review' ? (
        <Card
          size="small"
          title="单角色批量审核计划"
          style={{ marginBottom: 16 }}
          extra={(
            <Space>
              <Button
                disabled={!batchDrafts.length || submitting}
                onClick={() => setBatchDrafts([])}
              >
                清空计划
              </Button>
              <Button
                type="primary"
                danger={batchDrafts.some((item) => item.decision === 'reject')}
                disabled={!batchRole || !batchDrafts.length}
                loading={submitting}
                onClick={confirmReviewBatch}
              >
                批量提交（{batchDrafts.length}）
              </Button>
            </Space>
          )}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="同一批次只允许一个审核角色，最多 35 条；任一条失败时服务端整批不写入。"
            />
            <Select<AIReviewRole>
              value={batchRole}
              placeholder="先选择本批审核角色"
              disabled={batchDrafts.length > 0}
              onChange={changeBatchRole}
              options={REQUIRED_ROLES.map((value) => ({ value, label: reviewRoleLabel(value) }))}
              style={{ minWidth: 220 }}
            />
            <Input.TextArea
              value={batchPlanText}
              onChange={(event) => setBatchPlanText(event.target.value)}
              placeholder={'粘贴 JSON 数组，例如：\n[{"case_id":"PROMPT-EVAL-001","slot":1,"decision":"reject","reason":"说明判断依据"}]'}
              autoSize={{ minRows: 3, maxRows: 8 }}
            />
            <Space>
              <Button
                disabled={!batchRole || !batchPlanText.trim() || submitting}
                onClick={importReviewBatchPlan}
              >
                校验并载入计划
              </Button>
              <Text type="secondary">导入会替换当前本地计划，不会立即写入服务端。</Text>
            </Space>
            {batchDrafts.length ? (
              <Table
                rowKey="candidate_id"
                dataSource={batchDrafts}
                pagination={false}
                size="small"
                scroll={{ y: 240 }}
                columns={[
                  { title: 'Case', dataIndex: 'caseID' },
                  { title: 'Slot', dataIndex: 'slotOrdinal', width: 64 },
                  { title: '结论', dataIndex: 'decision', width: 90, render: reviewDecisionTag },
                  { title: '理由', dataIndex: 'reason', ellipsis: true },
                  {
                    title: '操作',
                    width: 120,
                    render: function renderBatchActions(_, item: ReviewBatchDraft) {
                      return (
                        <Space>
                          <Button size="small" onClick={() => {
                            const target = queue.find((value) => value.candidate_id === item.candidate_id)
                            if (target) openCandidate(target)
                          }}>修改</Button>
                          <Button
                            size="small"
                            danger
                            onClick={() => setBatchDrafts((values) => values.filter((value) => value.candidate_id !== item.candidate_id))}
                          >删除</Button>
                        </Space>
                      )
                    }
                  }
                ]}
              />
            ) : <Text type="secondary">逐条检查 Candidate 后加入计划；计划只保存在当前页面，确认后一次写入。</Text>}
          </Space>
        </Card>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card title={`当前角色待审核 Candidate（${roleQueue.length}）`} loading={loading}>
            <List
              dataSource={roleQueue}
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
                        <Space wrap>
                          {item.missing_roles.map((value) => <Tag key={value}>{reviewRoleLabel(value)}</Tag>)}
                          {batchDrafts.some((draft) => draft.candidate_id === item.candidate_id) ? <Tag color="blue">已入计划</Tag> : null}
                        </Space>
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
                <Text>{batchRole ? `当前批次：${reviewRoleLabel(batchRole)}` : '请先选择本批审核角色'}</Text>
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
                  disabled={!batchRole || !selected.missing_roles.includes(batchRole) || !reason.trim() || !detail ||
                    (batchDrafts.length >= 35 && !batchDrafts.some((draft) => draft.candidate_id === selected.candidate_id))}
                  onClick={addReviewToBatch}
                >
                  {batchDrafts.some((draft) => draft.candidate_id === selected.candidate_id) ? '更新' : '加入'}批量计划
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
