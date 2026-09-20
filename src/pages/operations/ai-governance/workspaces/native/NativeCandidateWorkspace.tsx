import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Drawer, Empty, Input, Modal, Radio, Space, Tabs, Tag, Typography } from 'antd'
import { getNativeCandidate, listNativeCandidates } from '@/api/path/aiWorkflow'
import type {
  NativeCandidateEvidence,
  NativeCandidateIndex,
  NativeEvaluationState,
  NativeReviewCommand,
  NativeReviewRole
} from '@/api/path/aiWorkflow'
import { NativeReviewWorkspace } from './NativeReviewWorkspace'
import { NativeBatchReviewWorkspace } from './NativeBatchReviewWorkspace'
import { FrozenInputReading } from '../product/FrozenInputReading'
import { CandidateReading } from '../product/CandidateReading'
import { JsonEvidence } from '../../components/JsonEvidence'

export function NativeCandidateWorkspace({
  run,
  locked = false,
  review,
  initialRole,
  autoLoad = false
}: {
  run: NativeEvaluationState
  autoLoad?: boolean
  initialRole?: NativeReviewRole
  locked?: boolean
  review?(command: NativeReviewCommand, confirm: boolean): Promise<void>
}): JSX.Element {
  const [index, setIndex] = useState<NativeCandidateIndex | null>(null)
  const [detail, setDetail] = useState<NativeCandidateEvidence | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [queued, setQueued] = useState<NativeReviewCommand | null>(null)
  const [planCount, setPlanCount] = useState(0)
  const [batchOpen, setBatchOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [panel, setPanel] = useState('reading')
  const [reviewDirty, setReviewDirty] = useState(false)
  const epoch = useRef(0)
  useEffect(
    () => () => {
      epoch.current++
    },
    []
  )
  const load = async (candidate?: string) => {
    const request = ++epoch.current
    setBusy(true)
    setError('')
    setDetail(null)
    try {
      if (candidate) {
        if (!index || !index.candidates.some((c) => c.candidate_id === candidate)) return
        const [failure, response] = await getNativeCandidate(run.run_id, candidate, index.version)
        if (request !== epoch.current) return
        const value = response?.data
        if (
          failure ||
          !value ||
          value.run_id !== run.run_id ||
          value.version !== run.version ||
          value.candidate_id !== candidate ||
          typeof value.normalized_output !== 'string' ||
          typeof value.semantic_output !== 'string' ||
          !value.evidence
        )
          throw new Error('Candidate mismatch')
        setDetail(value)
      } else {
        const [failure, response] = await listNativeCandidates(run.run_id)
        if (request !== epoch.current) return
        const value = response?.data
        if (
          failure ||
          !value ||
          value.run_id !== run.run_id ||
          value.version !== run.version ||
          !Array.isArray(value.candidates) ||
          value.candidates.length > 35 ||
          new Set(value.candidates.map((c) => c.candidate_id)).size !== value.candidates.length ||
          value.candidates.some(
            (c) =>
              !/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(c.candidate_id) ||
              !c.case_id ||
              !Number.isInteger(c.slot_ordinal) ||
              c.slot_ordinal < 1
          )
        )
          throw new Error('Index mismatch')
        setIndex(value)
      }
    } catch {
      if (request === epoch.current) setError('结果暂不可读或任务版本已变化，请先刷新任务状态。')
    } finally {
      if (request === epoch.current) setBusy(false)
    }
  }
  useEffect(() => {
    if (autoLoad && ['awaiting_review', 'approved', 'rejected'].includes(run.status)) load()
  }, [])
  const navigate = (candidate?: string) => {
    const proceed = () => {
      setReviewDirty(false)
      setPanel('reading')
      load(candidate)
    }
    if (reviewDirty) {
      Modal.confirm({
        title: '当前审核意见尚未保存',
        content: '请先加入批量审核计划或提交。继续切换将丢弃当前候选尚未保存的意见。',
        okText: '放弃意见并切换',
        cancelText: '继续审核',
        onOk: proceed
      })
    } else proceed()
  }
  const candidates = index?.candidates || []
  const visible = candidates.filter((c) =>
    `${c.case_id} ${c.slot_ordinal}`.toLowerCase().includes(filter.toLowerCase())
  )
  const position = candidates.findIndex((c) => c.candidate_id === detail?.candidate_id)
  const current = candidates[position]
  return (
    <Card title="评测结果" className="candidate-workspace" style={{ marginTop: 16 }}>
      <div className="candidate-workspace__toolbar">
        <Typography.Text type="secondary">
          选择候选 → 对照原始事实 → 填写意见；审核通过不等于已发布。
        </Typography.Text>
        <Space wrap>
          <Button loading={busy} onClick={() => navigate()}>
            读取候选结果
          </Button>
          {index && review && <Button onClick={() => setBatchOpen(true)}>批量审核计划（{planCount}）</Button>}
        </Space>
      </div>
      {error && <Alert showIcon type="warning" message={error} />}
      {index && (
        <div className="candidate-review-layout" data-panel={panel}>
          <nav className="candidate-review-nav" aria-label="候选导航">
            <Typography.Title level={5}>
              候选列表 <Tag>{candidates.length}</Tag>
            </Typography.Title>
            <Input.Search
              aria-label="筛选案例"
              placeholder="搜索案例或序号"
              allowClear
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <div className="candidate-review-nav__list">
              {visible.map((item) => (
                <Button
                  key={item.candidate_id}
                  block
                  className="candidate-review-nav__item"
                  type={detail?.candidate_id === item.candidate_id ? 'primary' : 'default'}
                  aria-current={detail?.candidate_id === item.candidate_id ? 'true' : undefined}
                  aria-label={`${item.case_id} 候选 ${item.slot_ordinal}`}
                  disabled={busy || locked}
                  onClick={() => navigate(item.candidate_id)}
                >
                  <strong>{item.case_id}</strong>
                  <span>
                    候选 {item.slot_ordinal} · <span>查看候选详情</span>
                  </span>
                </Button>
              ))}
              {!visible.length && (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={candidates.length ? '没有匹配的候选' : '当前版本尚无候选结果'}
                />
              )}
            </div>
          </nav>
          <div className="candidate-review-main">
            <div className="candidate-review-heading">
              <Typography.Text strong>
                {current
                  ? `${current.case_id} · 候选 ${current.slot_ordinal}（${position + 1}/${
                    candidates.length
                  }）`
                  : '选择一个候选开始阅读'}
              </Typography.Text>
              <Space>
                <Button
                  disabled={busy || locked || position <= 0}
                  onClick={() => navigate(candidates[position - 1].candidate_id)}
                >
                  上一候选
                </Button>
                <Button
                  disabled={busy || locked || position < 0 || position >= candidates.length - 1}
                  onClick={() => navigate(candidates[position + 1].candidate_id)}
                >
                  下一候选
                </Button>
              </Space>
            </div>
            {detail && review && (
              <Radio.Group
                className="candidate-review-panel-switch"
                value={panel}
                onChange={(e) => setPanel(e.target.value)}
                optionType="button"
                options={[
                  { label: '阅读内容', value: 'reading' },
                  { label: '填写审核意见', value: 'review' }
                ]}
              />
            )}
            <div className={`candidate-review-body${review ? '' : ' candidate-review-body--readonly'}`}>
              <section className="candidate-review-reading" aria-label="候选阅读区" aria-busy={busy}>
                {!detail ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={busy ? '正在读取候选…' : '从左侧选择候选，正文会显示在这里'}
                  />
                ) : (
                  <Tabs defaultActiveKey="output">
                    <Tabs.TabPane tab="生成内容" key="output">
                      <CandidateReading raw={detail.normalized_output} />
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="原始事实" key="facts">
                      <FrozenInputReading evidence={detail.evidence} />
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="事实对照" key="comparison">
                      <div className="candidate-review-comparison">
                        <FrozenInputReading evidence={detail.evidence} />
                        <CandidateReading raw={detail.normalized_output} />
                      </div>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab="检查与证据" key="evidence">
                      <Typography.Title level={5}>语义检查原文</Typography.Title>
                      <JsonEvidence value={detail.semantic_output} />
                      <details>
                        <summary>来源、调用及审核证据</summary>
                        <JsonEvidence value={detail.evidence} />
                      </details>
                    </Tabs.TabPane>
                  </Tabs>
                )}
              </section>
              {detail && review && (
                <aside className="candidate-review-actions" aria-label="审核操作区">
                  <NativeReviewWorkspace
                    initialRole={initialRole}
                    key={`${detail.candidate_id}:${detail.version}`}
                    run={run}
                    detail={detail}
                    locked={locked || busy}
                    submit={review}
                    onDirty={setReviewDirty}
                    enqueue={(command) => {
                      setQueued(command)
                      setBatchOpen(true)
                    }}
                  />
                </aside>
              )}
            </div>
          </div>
        </div>
      )}
      {index && review && (
        <Drawer
          title="批量审核计划"
          visible={batchOpen}
          onClose={() => setBatchOpen(false)}
          width="min(960px, 100vw)"
          forceRender
          destroyOnClose={false}
        >
          <NativeBatchReviewWorkspace
            initialRole={initialRole}
            key={`${run.run_id}:${run.version}`}
            run={run}
            index={index}
            locked={locked || busy}
            submit={review}
            queued={queued}
            onConsumed={setQueued}
            onPlanCount={setPlanCount}
          />
        </Drawer>
      )}
    </Card>
  )
}
