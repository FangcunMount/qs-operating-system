import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { ArrowRightOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import {
  getAIEvaluationAttempt,
  getAIEvaluationRun,
  listAIEvaluationRuns,
  recordAIHumanReview
} from '@/api/path/aiGovernance'
import type {
  AIEvaluationRun,
  AIEvaluationRunSummary,
  AIReviewAttempt,
  AIReviewAttemptSummary,
  AIReviewDecision,
  AIReviewRole
} from '@/api/path/aiGovernance'
import { JsonEvidence } from '../components/JsonEvidence'
import { AttemptRecheckPanel } from '../components/AttemptRecheckPanel'
import {
  errorMessage,
  evaluationStatusTag,
  reviewDecisionTag,
  reviewRoleLabel
} from '../presentation'

const { Paragraph, Text, Title } = Typography

function renderAssertionStatus(value: string) {
  return <Tag color={value === 'passed' ? 'green' : 'red'}>{value}</Tag>
}

export interface QueueItem extends AIReviewAttemptSummary {
  runID: string
}

export const buildReviewQueue = (runs: AIEvaluationRun[]): QueueItem[] => runs.flatMap((run) =>
  run.can_review
    ? run.attempts
      .filter((attempt) => !attempt.failure && attempt.missing_roles.length > 0)
      .map((attempt) => ({ ...attempt, runID: run.run_id }))
    : [])

const standardFacts = (input: unknown): unknown => {
  if (!input || typeof input !== 'object') return input
  const record = input as Record<string, unknown>
  return record.facts || record.assessment || record
}

export const HumanReviewWorkspace: React.FC = () => {
  const [runCatalog, setRunCatalog] = useState<AIEvaluationRunSummary[]>([])
  const [selectedRun, setSelectedRun] = useState<AIEvaluationRun | null>(null)
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null)
  const [attemptDetail, setAttemptDetail] = useState<AIReviewAttempt | null>(null)
  const [role, setRole] = useState<AIReviewRole | undefined>()
  const [decision, setDecision] = useState<AIReviewDecision>('approve')
  const [reason, setReason] = useState('')
  const [manualRunID, setManualRunID] = useState('')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const selectedRunIDRef = useRef('')

  const loadRunDetails = useCallback(async (
    runID: string,
    fallbackMessage = '评测 Run 详情获取失败'
  ): Promise<AIEvaluationRun | null> => {
    setDetailLoading(true)
    const [requestError, response] = await getAIEvaluationRun(runID)
    setDetailLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, fallbackMessage))
      return null
    }
    const run = response.data
    selectedRunIDRef.current = run.run_id
    setSelectedRun(run)
    setRunCatalog((current) => [run, ...current.filter((item) => item.run_id !== run.run_id)])
    setSelectedQueueItem(null)
    setAttemptDetail(null)
    setRole(undefined)
    setReason('')
    return run
  }, [])

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError('')
    const [requestError, response] = await listAIEvaluationRuns({ status: 'awaiting_review', limit: 100 })
    setLoading(false)
    if (requestError || !response) {
      setRunCatalog([])
      setError(errorMessage(requestError, '待审核 Run 列表获取失败'))
      return
    }
    const items = response.data?.items || []
    setRunCatalog(items)
    if (!items.length) {
      selectedRunIDRef.current = ''
      setSelectedRun(null)
      setSelectedQueueItem(null)
      setAttemptDetail(null)
      return
    }
    const selectedID = items.some((item) => item.run_id === selectedRunIDRef.current)
      ? selectedRunIDRef.current
      : items[0].run_id
    await loadRunDetails(selectedID, '待审核 Run 详情获取失败')
  }, [loadRunDetails])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  const queue = useMemo<QueueItem[]>(
    () => buildReviewQueue(selectedRun ? [selectedRun] : []),
    [selectedRun]
  )

  const loadRunByID = async (runID: string) => {
    if (!runID.trim()) return
    const run = await loadRunDetails(runID.trim(), '指定评测 Run 获取失败')
    if (!run) return
    const first = buildReviewQueue([run])[0]
    if (first) await openAttempt({ ...first, runID: run.run_id }, run)
  }

  const openAttempt = async (item: QueueItem, knownRun?: AIEvaluationRun) => {
    setSelectedQueueItem(item)
    setAttemptDetail(null)
    setReason('')
    setRole(item.missing_roles[0])
    const run = knownRun || (selectedRun?.run_id === item.runID ? selectedRun : null)
    setSelectedRun(run)
    setDetailLoading(true)
    const [requestError, response] = await getAIEvaluationAttempt(item.runID, item.case_id, item.attempt)
    setDetailLoading(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '评测证据获取失败'))
      return
    }
    setAttemptDetail(response.data)
  }

  const submitReview = async () => {
    if (!selectedRun?.can_review || !selectedQueueItem || selectedQueueItem.failure || !role || !reason.trim()) return
    setSubmitting(true)
    const [requestError, response] = await recordAIHumanReview(selectedQueueItem.runID, {
      case_id: selectedQueueItem.case_id,
      attempt: selectedQueueItem.attempt,
      role,
      decision,
      reason: reason.trim()
    })
    setSubmitting(false)
    if (requestError || !response) {
      message.error(errorMessage(requestError, '人工审核提交失败'))
      return
    }
    message.success('审核意见已记录，审核人身份由服务端可信令牌确认')
    const current = response.data
    selectedRunIDRef.current = current.run_id
    setSelectedRun(current)
    setRunCatalog((values) => [current, ...values.filter((item) => item.run_id !== current.run_id)])
    const next = current.attempts.find((attempt) => attempt.missing_roles.length > 0)
    if (next) {
      await openAttempt({ ...next, runID: current.run_id }, current)
    } else {
      setSelectedQueueItem(null)
      setAttemptDetail(null)
      setRole(undefined)
      setReason('')
    }
  }

  const currentIndex = selectedQueueItem
    ? queue.findIndex((item) => item.runID === selectedQueueItem.runID &&
      item.case_id === selectedQueueItem.case_id && item.attempt === selectedQueueItem.attempt)
    : -1
  const nextQueueItem = currentIndex >= 0 ? queue[currentIndex + 1] : queue[0]
  const reviewPercent = selectedRun?.progress.required_reviews
    ? Math.round(selectedRun.progress.recorded_reviews / selectedRun.progress.required_reviews * 100)
    : 0

  return (
    <div className="ai-governance-workspace">
      <div className="ai-governance-section-heading">
        <div>
          <Title level={4}>人工审核台</Title>
          <Paragraph type="secondary">
            待审核队列由 awaiting_review Run 的缺失角色实时派生；同一审核人不能完成同一输出的两个角色。
          </Paragraph>
        </div>
        <Space>
          <Select
            value={selectedRun?.run_id}
            placeholder="选择待审核 Run"
            loading={loading}
            options={runCatalog.map((run) => ({
              value: run.run_id,
              label: `Run ${run.run_id}`
            }))}
            onChange={loadRunByID}
            style={{ width: 220 }}
          />
          <Input.Search
            value={manualRunID}
            onChange={(event) => setManualRunID(event.target.value)}
            onSearch={loadRunByID}
            enterButton={<SearchOutlined />}
            placeholder="按 Run ID 定位"
            style={{ width: 280 }}
          />
          <Button icon={<ReloadOutlined />} loading={loading} onClick={loadQueue}>刷新队列</Button>
        </Space>
      </div>

      {error ? (
        <Alert
          type="warning"
          showIcon
          message="待审核列表接口暂不可用"
          description={`${error}。仍可使用右上角 Run ID 精确定位审核证据。`}
        />
      ) : null}

      {selectedRun && !selectedRun.can_review ? (
        <Alert
          className="ai-governance-inline-alert"
          type="error"
          showIcon
          message="当前 Run 不可人工审核"
          description={selectedRun.progress.failed_attempts > 0
            ? `检测到 ${selectedRun.progress.failed_attempts} 条技术失败证据。请在“评测发布”工作区打开只读详情；本页不会提供审核按钮。`
            : '服务端未授权该 Run 进入人工审核，请返回评测发布工作区核验状态。'}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={7}>
          <Card
            title={`当前 Run 待审核证据（${queue.length}）`}
            className="ai-governance-review-queue"
            loading={loading}
          >
            <List
              dataSource={queue}
              locale={{ emptyText: <Empty description="当前没有待审核证据" /> }}
              renderItem={(item) => (
                <List.Item
                  className={selectedQueueItem?.runID === item.runID &&
                    selectedQueueItem.case_id === item.case_id &&
                    selectedQueueItem.attempt === item.attempt ? 'is-selected' : ''}
                  onClick={() => openAttempt(item)}
                >
                  <List.Item.Meta
                    title={<Space><Text code>{item.case_id}</Text><Tag>#{item.attempt}</Tag></Space>}
                    description={(
                      <Space direction="vertical" size={2}>
                        <Text type="secondary">Run {item.runID}</Text>
                        <Space wrap>
                          {item.missing_roles.map((value) => <Tag key={value}>{reviewRoleLabel(value)}</Tag>)}
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
          {!selectedQueueItem ? (
            <Card><Empty description="请选择一条待审核证据，或输入 Run ID 定位" /></Card>
          ) : (
            <Card
              loading={detailLoading}
              title={<Space><Text code>{selectedQueueItem.case_id}</Text><Tag>第 {selectedQueueItem.attempt} 次</Tag></Space>}
              extra={nextQueueItem ? (
                <Button icon={<ArrowRightOutlined />} onClick={() => openAttempt(nextQueueItem)}>下一条待审核</Button>
              ) : null}
            >
              {selectedRun ? (
                <Space direction="vertical" className="ai-governance-review-progress">
                  <Space>{evaluationStatusTag(selectedRun.status)}<Text code>{selectedRun.run_id}</Text></Space>
                  <Progress percent={reviewPercent} />
                  <Text type="secondary">
                    已记录 {selectedRun.progress.recorded_reviews}/{selectedRun.progress.required_reviews || 70} 条人工审核
                  </Text>
                </Space>
              ) : null}

              <Alert
                type="info"
                showIcon
                message="审核视角由服务端最终授权"
                description="页面只展示当前证据缺失的审核视角；当前服务端以 org_admin 能力保护两个视角，尚未提供按审核人返回可选视角的查询契约。"
              />

              <div className="ai-governance-review-form">
                <Select<AIReviewRole>
                  value={role}
                  placeholder="选择审核视角"
                  onChange={setRole}
                  options={selectedQueueItem.missing_roles.map((value) => ({
                    value,
                    label: reviewRoleLabel(value)
                  }))}
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
                  disabled={!role || !reason.trim()}
                  loading={submitting}
                  onClick={submitReview}
                >
                  提交{decision === 'approve' ? '通过' : '拒绝'}意见
                </Button>
              </div>

              {attemptDetail ? (
                <>
                  {attemptDetail.failure ? (
                    <Alert
                      type="error"
                      showIcon
                      message={`${attemptDetail.failure.stage}: ${attemptDetail.failure.code}`}
                      description={(
                        <Space>
                          <Text>{attemptDetail.failure.safe_message}</Text>
                          {attemptDetail.failure.result_unknown ? <Tag color="red">result_unknown</Tag> : null}
                        </Space>
                      )}
                    />
                  ) : null}
                  <Row gutter={[16, 16]} className="ai-governance-evidence-grid">
                    <Col xs={24} xl={12}>
                      <Card size="small" title="冻结的测评输入与标准事实">
                        <JsonEvidence value={standardFacts(attemptDetail.assessment_input)} />
                      </Card>
                      <Card size="small" title="完整冻结输入">
                        <JsonEvidence value={attemptDetail.assessment_input} />
                      </Card>
                    </Col>
                    <Col xs={24} xl={12}>
                      <Card size="small" title="AI 原始输出">
                        <JsonEvidence value={attemptDetail.raw_provider_output} emptyText="Provider 未返回可审核输出" />
                      </Card>
                      <Card size="small" title="规范化输出、引用与建议">
                        <JsonEvidence value={attemptDetail.normalized_output} emptyText="输出未通过结构化解析" />
                      </Card>
                    </Col>
                  </Row>

                  <Card size="small" title="结构、安全与事实引用校验">
                    <Table
                      rowKey={(item) => `${item.type}:${item.scope}:${item.ordinal}`}
                      dataSource={attemptDetail.assertions}
                      pagination={false}
                      size="small"
                      columns={[
                        { title: '校验', dataIndex: 'type' },
                        { title: '范围', dataIndex: 'scope' },
                        { title: '执行器', dataIndex: 'evaluator' },
                        {
                          title: '结果',
                          dataIndex: 'status',
                          render: renderAssertionStatus
                        },
                        { title: '证据', dataIndex: 'detail' }
                      ]}
                    />
                  </Card>

                  {attemptDetail.semantic ? (
                    <Card size="small" title="独立模型裁判">
                      <Descriptions size="small" bordered column={5}>
                        {Object.entries(attemptDetail.semantic.scores).map(([key, value]) => (
                          <Descriptions.Item key={key} label={key}>{value}</Descriptions.Item>
                        ))}
                      </Descriptions>
                      <Paragraph className="ai-governance-semantic-rationale">
                        {attemptDetail.semantic.rationale}
                      </Paragraph>
                    </Card>
                  ) : null}

                  <AttemptRecheckPanel
                    runID={selectedQueueItem.runID}
                    caseID={attemptDetail.case_id}
                    attempt={attemptDetail.attempt}
                  />

                  {attemptDetail.reviews.length ? (
                    <Card size="small" title="已记录审核">
                      <List
                        dataSource={attemptDetail.reviews}
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
