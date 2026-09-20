import { useCallback, useEffect, useRef, useState } from 'react'
import { Prompt } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Alert, Button, Card, Input, Space, Steps, Table, Tabs, Tag, Typography } from 'antd'
import { rootStore } from '@/store'
import { getPublication } from '@/api/path/aiWorkflow'
import type { NativeEvaluationState, PublicationState, NativeReviewRole } from '@/api/path/aiWorkflow'
import { getSolutionModels, listSolutions } from '@/api/path/aiWorkflow/solutions'
import type { SolutionModels, SolutionSummary } from '@/api/path/aiWorkflow/solutions'
import { checkPublication, defaultPublicationSelector } from '../native/publicationValidation'
import { newCommandID, validReason, validUUID } from '../native/commands'
import { NativeConfigurationWorkspace } from '../native/NativeConfigurationWorkspace'
import { NativeEvaluationWorkspace } from '../native/NativeEvaluationWorkspace'
import { NativePublicationWorkspace } from '../native/NativePublicationWorkspace'
import { NativeEvaluationCatalog } from '../native/NativeEvaluationCatalog'
import { NativeParticipantWorkspace } from '../native/NativeParticipantWorkspace'
import { NativeParticipantRetryWorkspace } from '../native/NativeParticipantRetryWorkspace'
import { SolutionChanges, SolutionEditor } from './SolutionEditor'
import { ReviewInbox } from './ReviewInbox'
import { useSolution } from './useSolution'

function Workspace({ owner, allowed }: { owner: string; allowed: boolean }): JSX.Element {
  const controller = useSolution(owner)
  const [items, setItems] = useState<SolutionSummary[]>([])
  const [cursor, setCursor] = useState('')
  const [publication, setPublication] = useState<PublicationState | null>(null)
  const [models, setModels] = useState<SolutionModels | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reviewRole, setReviewRole] = useState<NativeReviewRole>('assessment_semantics')
  const [tab, setTab] = useState('solutions')
  const [advanced, setAdvanced] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [step, setStep] = useState('edit')
  const [externalRun, setExternalRun] = useState('')
  const [run, setRun] = useState<NativeEvaluationState | null>(null)
  const [title, setTitle] = useState('解读方案改进')
  const [reason, setReason] = useState('')
  const epoch = useRef(0)
  const reportRun = useCallback((value: NativeEvaluationState | null) => setRun(value), [])
  const reportPublication = useCallback((value: PublicationState | null) => setPublication(value), [])
  const reportDirty = useCallback((value: boolean) => setDirty(value), [])
  const solution = controller.solution
  const activeRun = solution?.prepared?.run_id || externalRun
  const working = Boolean(solution || externalRun)
  const locked = controller.busy || Boolean(controller.pending) || controller.storageFailed
  const navigate = (id: string, stage: string, runID = '') => {
    const url = new URL(window.location.href)
    for (const key of ['aiSolution', 'aiStep', 'aiRun']) url.searchParams.delete(key)
    if (id) url.searchParams.set('aiSolution', id)
    if (runID) url.searchParams.set('aiRun', runID)
    if (id || runID) url.searchParams.set('aiStep', stage)
    window.history.replaceState(window.history.state, '', url.toString())
    setStep(stage)
  }
  const refresh = async (after = '') => {
    const current = ++epoch.current
    setLoading(true)
    setError('')
    try {
      const [[failure, page], [pubError, pub], [modelError, capabilities]] = await Promise.all([
        listSolutions(after),
        getPublication(defaultPublicationSelector),
        getSolutionModels()
      ])
      if (current !== epoch.current) return
      if (
        failure ||
        !page ||
        !Array.isArray(page.data.items) ||
        page.data.items.some((s) => !validUUID(s.solution_id))
      )
        throw new Error('修改版本读取失败，请检查权限后刷新。')
      setItems((old) => (after ? [...old, ...page.data.items] : page.data.items))
      setCursor(page.data.next_cursor)
      if (pubError || !pub) {
        setPublication(null)
        setError('线上发布状态读取失败，不能据此认为未发布。')
      } else {
        checkPublication(pub.data, defaultPublicationSelector)
        setPublication(pub.data)
      }
      if (modelError || !capabilities) {
        setModels(null)
        setError('模型能力读取失败，暂不能编辑模型参数。')
      } else setModels(capabilities.data)
    } catch (e) {
      if (current === epoch.current) setError((e as Error).message)
    } finally {
      if (current === epoch.current) setLoading(false)
    }
  }
  useEffect(() => {
    refresh()
    const url = new URL(window.location.href),
      id = url.searchParams.get('aiSolution') || '',
      runID = url.searchParams.get('aiRun') || ''
    const requested = url.searchParams.get('aiStep') || 'edit'
    setStep(['edit', 'test', 'publish'].includes(requested) ? requested : 'edit')
    if (validUUID(id)) controller.read(id)
    else if (validUUID(runID)) {
      setExternalRun(runID)
      setStep(requested === 'publish' ? 'publish' : 'test')
    }
    return () => {
      epoch.current++
    }
  }, [])
  const open = async (id: string) => {
    if (locked || dirty) return
    const value = await controller.read(id)
    if (value) {
      setExternalRun('')
      setRun(null)
      navigate(id, value.prepared ? 'test' : 'edit')
    }
  }
  const back = () => {
    if (locked || dirty) return
    controller.clearView()
    setExternalRun('')
    setRun(null)
    navigate('', 'edit')
    refresh()
  }
  const selectRun = (id: string, role?: NativeReviewRole) => {
    setReviewRole(role || 'assessment_semantics')
    if (locked || dirty) return
    controller.clearView()
    setExternalRun(id)
    setRun(null)
    setTab('solutions')
    navigate('', 'test', id)
  }
  const create = async (sourceRun?: string) => {
    if (!allowed || locked || dirty) return false
    if (!sourceRun && (!publication?.active_publication_id || !validReason(reason) || !title.trim()))
      return false
    const id = newCommandID()
    const value = await controller.submit(
      id,
      'create',
      sourceRun
        ? {
          source_run_id: sourceRun,
          title: '根据评测意见继续改进',
          reason: '基于本轮评测创建修改版本，保留原审核记录'
        }
        : { publication_id: publication?.active_publication_id, title, reason }
    )
    if (!value) return false
    setExternalRun('')
    setRun(null)
    navigate(id, 'edit')
    setTab('solutions')
    return true
  }
  const isPublished = Boolean(
    activeRun &&
      publication?.publication?.publication.evidence.run_id === activeRun &&
      publication.active_publication_id
  )
  const reviewing = run && ['awaiting_review', 'approved', 'rejected'].includes(run.status)
  const phase = step === 'publish' ? (isPublished ? 4 : 3) : step === 'test' ? (reviewing ? 2 : 1) : 0
  return (
    <>
      <Prompt when={dirty} message="当前修改尚未保存，离开会丢失这些编辑内容。确定离开？" />
      <div className="solution-toolbar">
        <Space>
          <Tag color="blue">方案工作区</Tag>
          <Typography.Text type="secondary">
            已保存内容可跨刷新继续；启动、审核和发布分别确认。
          </Typography.Text>
        </Space>
        <Button disabled={locked || dirty} onClick={() => setAdvanced(!advanced)}>
          {advanced ? '返回常规管理' : '高级配置'}
        </Button>
      </div>
      {controller.error && <Alert type="error" showIcon message={controller.error} />}
      {controller.error.startsWith('版本冲突') && solution && (
        <Alert
          type="warning"
          showIcon
          message="当前编辑内容仍保留，尚未覆盖服务器版本。"
          description={
            <Button
              onClick={() => {
                if (window.confirm('请先复制需要保留的修改。读取最新版本将替换当前编辑内容，是否继续？')) {
                  setDirty(false)
                  controller.read(solution.solution_id)
                }
              }}
            >
              读取最新版本并重新比较
            </Button>
          }
        />
      )}
      {controller.pending && (
        <Alert
          type="warning"
          showIcon
          message="原操作结果待核对"
          description={
            <Space wrap>
              <Button loading={controller.busy} onClick={controller.reconcile}>
                核对原操作
              </Button>
              <Button loading={controller.busy} onClick={controller.retry}>
                按原命令重试
              </Button>
              <Typography.Text>核对期间不允许创建新的操作；同一命令不会重复创建配置。</Typography.Text>
            </Space>
          }
        />
      )}
      {advanced ? (
        <NativeConfigurationWorkspace />
      ) : (
        <>
          {!working && (
            <Tabs activeKey={tab} onChange={setTab}>
              <Tabs.TabPane tab="方案" key="solutions">
                <Card
                  title="单次测评补充解读"
                  extra={
                    <Button loading={loading} onClick={() => refresh()}>
                      刷新工作台
                    </Button>
                  }
                >
                  {error && <Alert type="error" showIcon message={error} />}
                  <Space wrap>
                    <Tag>
                      {publication
                        ? publication.active_publication_id
                          ? '已有发布配置'
                          : '当前无生效配置'
                        : '线上状态未确认'}
                    </Tag>
                    <Typography.Text>
                      线上版本：{publication?.publication?.publication.evidence.profile.version || '—'}
                    </Typography.Text>
                  </Space>
                  <Typography.Paragraph type="secondary">
                    业务入口是否开放仍由独立准入配置控制，此处不推断。修改版本不会影响当前线上配置。
                  </Typography.Paragraph>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      aria-label="新修改版本名称"
                      placeholder="修改版本名称"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={!allowed || locked}
                    />
                    <Input.TextArea
                      aria-label="创建修改目的"
                      placeholder="本次希望改善什么？"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      disabled={!allowed || locked}
                    />
                    <Space>
                      <Button
                        type="primary"
                        disabled={
                          !allowed ||
                          locked ||
                          !publication?.active_publication_id ||
                          !title.trim() ||
                          !validReason(reason)
                        }
                        onClick={() => create()}
                      >
                        从线上方案创建修改版本
                      </Button>
                      <Button
                        disabled={locked}
                        onClick={() => {
                          setExternalRun('publication')
                          setStep('publish')
                        }}
                      >
                        查看发布与回退
                      </Button>
                    </Space>
                  </Space>
                </Card>
                <Card title="修改版本" style={{ marginTop: 16 }}>
                  <Table<SolutionSummary>
                    rowKey="solution_id"
                    dataSource={items}
                    pagination={false}
                    loading={loading}
                    columns={[
                      { title: '名称', dataIndex: 'title' },
                      { title: '修改目的', dataIndex: 'reason' },
                      { title: '负责人', dataIndex: 'created_by' },
                      {
                        title: '最近保存',
                        render: (_, row) => new Date(row.updated_at).toLocaleString('zh-CN')
                      },
                      {
                        title: '进度',
                        render: (_, row) => (row.prepared ? '配置已固定，查看实际评测进度' : '编辑中')
                      },
                      {
                        title: '操作',
                        render: function action(_, row) {
                          return (
                            <Button disabled={locked} onClick={() => open(row.solution_id)}>
                              {row.prepared ? '查看测试与审核' : '继续编辑'}
                            </Button>
                          )
                        }
                      }
                    ]}
                    locale={{ emptyText: '还没有修改版本，从线上方案开始一次改进。' }}
                  />
                  {cursor && (
                    <Button onClick={() => refresh(cursor)} loading={loading}>
                      加载更多
                    </Button>
                  )}
                </Card>
              </Tabs.TabPane>
              <Tabs.TabPane tab="待我审核" key="reviews">
                <ReviewInbox userID={owner} allowed={allowed} onSelect={selectRun} />
              </Tabs.TabPane>
              <Tabs.TabPane tab="运行记录" key="runs">
                <NativeEvaluationCatalog disabled={locked} autoLoad onSelect={selectRun} />
                <details>
                  <summary>用户解读任务与异常处置</summary>
                  <NativeParticipantWorkspace />
                  <NativeParticipantRetryWorkspace owner={owner} />
                </details>
              </Tabs.TabPane>
            </Tabs>
          )}
          {working && (
            <>
              <Space style={{ marginBottom: 16 }}>
                <Button disabled={locked || dirty} onClick={back}>
                  返回工作台
                </Button>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {solution?.title || (externalRun === 'publication' ? '线上发布与回退' : '评测与审核')}
                </Typography.Title>
                {dirty && <Tag color="orange">请先保存修改</Tag>}
              </Space>
              <Steps
                current={phase}
                onChange={(value) => {
                  if (locked || dirty || (!activeRun && value > 0)) return
                  navigate(
                    solution?.solution_id || '',
                    value === 0 && solution ? 'edit' : value < 3 ? 'test' : 'publish',
                    solution ? '' : externalRun
                  )
                }}
                style={{ marginBottom: 24 }}
              >
                {['编辑方案', '测试效果', '人工审核', '发布确认', '上线'].map((label, index) => (
                  <Steps.Step
                    title={label}
                    key={label}
                    status={
                      index === 2 && run?.status === 'rejected'
                        ? 'error'
                        : isPublished ||
                          (index === 0 && !!solution?.prepared) ||
                          (index === 1 && !!reviewing) ||
                          (index === 2 && run?.status === 'approved')
                          ? 'finish'
                          : index === phase
                            ? 'process'
                            : 'wait'
                    }
                  />
                ))}
              </Steps>
              {step === 'edit' &&
                solution &&
                (!solution.prepared ? (
                  <SolutionEditor
                    key={solution.solution_id}
                    solution={solution}
                    capabilities={models}
                    busy={controller.busy}
                    locked={locked || !allowed}
                    error={controller.error}
                    onDirty={reportDirty}
                    save={(values) =>
                      controller.submit(solution.solution_id, 'save', {
                        ...values,
                        expected_revision: solution.revision
                      })
                    }
                    prepare={async () => {
                      const value = await controller.submit(solution.solution_id, 'prepare', {
                        expected_revision: solution.revision,
                        reason: solution.reason
                      })
                      if (value) navigate(value.solution_id, 'test')
                    }}
                  />
                ) : (
                  <>
                    <Alert type="info" message="本版本已经固定。如需修改，请创建新版本并重新评测。" />
                    <SolutionChanges solution={solution} />
                    <Button disabled={!allowed || locked} onClick={() => create(solution.prepared?.run_id)}>
                      基于本版本继续修改
                    </Button>
                  </>
                ))}
              {step === 'test' && activeRun && activeRun !== 'publication' && (
                <NativeEvaluationWorkspace
                  guided
                  key={`${owner}:${activeRun}`}
                  owner={owner}
                  selection={{}}
                  plan={solution?.prepared?.plan}
                  initialRole={reviewRole}
                  initialRunID={activeRun}
                  onState={reportRun}
                  onRevise={(value) => create(value.run_id)}
                  onPublish={() =>
                    navigate(solution?.solution_id || '', 'publish', solution ? '' : activeRun)
                  }
                />
              )}
              {step === 'publish' && (
                <>
                  {solution && <SolutionChanges solution={solution} />}
                  <NativePublicationWorkspace
                    guided
                    key={`${owner}:${activeRun}`}
                    owner={owner}
                    initialRunID={validUUID(activeRun) ? activeRun : ''}
                    onState={reportPublication}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
export const SolutionWorkspace = observer(() => {
  const user = rootStore.userStore.currentUser
  return user ? (
    <Workspace
      key={user.id}
      owner={user.id}
      allowed={rootStore.userStore.accessContext.capabilities.has('org_admin')}
    />
  ) : (
    <Alert type="warning" message="请先恢复登录身份。" />
  )
})
