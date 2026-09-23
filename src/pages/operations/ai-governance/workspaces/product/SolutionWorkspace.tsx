import { useCallback, useEffect, useRef, useState } from 'react'
import { Prompt, useHistory, useLocation } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { Alert, Button, Card, Input, Space, Steps, Table, Tag, Typography } from 'antd'
import { rootStore } from '@/store'
import { getPublication } from '@/api/path/aiWorkflow'
import type { NativeEvaluationState, PublicationState, NativeReviewRole } from '@/api/path/aiWorkflow'
import { getSolutionModels, listSolutions } from '@/api/path/aiWorkflow/solutions'
import type { SolutionModels, SolutionSummary, SolutionTemplate } from '@/api/path/aiWorkflow/solutions'
import { checkPublication, defaultPublicationSelector, mbtiPublicationSelector, sameSelector } from '../native/publicationValidation'
import { newCommandID, validReason, validUUID } from '../native/commands'
import { ConfigurationAssets } from './ConfigurationAssets'
import type { EvaluationSelection } from '@/api/path/aiWorkflow'
import { NativeEvaluationWorkspace } from '../native/NativeEvaluationWorkspace'
import { NativePublicationWorkspace } from '../native/NativePublicationWorkspace'
import { NativeEvaluationCatalog } from '../native/NativeEvaluationCatalog'
import { SolutionChanges, SolutionEditor } from './SolutionEditor'
import { ReviewInbox } from './ReviewInbox'
import { FlowPanel } from '../flow/FlowPanel'
import type { EditTarget } from '@/api/path/aiWorkflow/flow'
import { useSolution } from './useSolution'

function Workspace({ owner, allowed }: { owner: string; allowed: boolean }): JSX.Element {
  const history = useHistory()
  const location = useLocation()
  const section = location.pathname.includes('/reviews') ? 'reviews' : location.pathname.includes('/runtime/evaluations') ? 'runs' : 'solutions'
  const scene = new URLSearchParams(location.search).get('aiScene') === 'mbti' ? 'mbti' : 'scale'
  const sceneSelector = scene === 'mbti' ? mbtiPublicationSelector : defaultPublicationSelector
  const controller = useSolution(owner)
  const [items, setItems] = useState<SolutionSummary[]>([])
  const [templates, setTemplates] = useState<SolutionTemplate[]>([])
  const [cursor, setCursor] = useState('')
  const [publication, setPublication] = useState<PublicationState | null>(null)
  const [models, setModels] = useState<SolutionModels | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [reviewRole, setReviewRole] = useState<NativeReviewRole>('assessment_semantics')
  const tab = section
  const assetsOpen = location.pathname.endsWith('/assets')
  const [evaluationSelection, setEvaluationSelection] = useState<EvaluationSelection>({})
  const [dirty, setDirty] = useState(false)
  const [step, setStep] = useState('edit')
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
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
  const navigate = (id: string, stage: string, runID = '', role?: NativeReviewRole) => {
    const url = new URL(window.location.href)
    url.search = location.search
    for (const key of ['aiSolution', 'aiStep', 'aiRun']) url.searchParams.delete(key)
    if (id) url.searchParams.set('aiSolution', id)
    if (runID) url.searchParams.set('aiRun', runID)
    if (role) url.searchParams.set('aiReviewRole', role)
    if (!id && !runID) url.searchParams.delete('aiReviewRole')
    if (id || runID || stage === 'publish') url.searchParams.set('aiStep', stage)
    history.push(`/operations/ai-governance/${stage === 'test' && !id ? 'reviews' : 'solutions'}${url.search}`)
    setStep(stage)
  }
  const refresh = async (after = '') => {
    const current = ++epoch.current
    setLoading(true)
    setError('')
    try {
      const [[failure, page], [pubError, pub], [modelError, capabilities]] = await Promise.all([
        listSolutions(after),
        getPublication(sceneSelector),
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
      if (!after) {
        const catalog = page.data.templates || []
        if (!Array.isArray(catalog) || catalog.some((entry) =>
          entry.scene_contract_version !== 'mbti-single-assessment/v1' ||
          !sameSelector(entry.selector, mbtiPublicationSelector) ||
          !entry.template_ref?.id || !entry.template_ref?.version ||
          !/^sha256:[a-f0-9]{64}$/.test(entry.template_ref.fingerprint)
        )) throw new Error('首版模板目录不完整，请刷新后重试。')
        setTemplates(catalog)
      }
      setCursor(page.data.next_cursor)
      if (pubError || !pub) {
        setPublication(null)
        setError('线上发布状态读取失败，不能据此认为未发布。')
      } else {
        checkPublication(pub.data, sceneSelector)
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
    const params = new URLSearchParams(location.search),
      id = params.get('aiSolution') || '',
      runID = params.get('aiRun') || ''
    const requested = params.get('aiStep') || 'edit'
    setReviewRole(params.get('aiReviewRole') === 'safety_product' ? 'safety_product' : 'assessment_semantics')
    setStep(['edit', 'test', 'publish'].includes(requested) ? requested : 'edit')
    if (runID === 'new') { controller.clearView(); setExternalRun('new'); setStep('test') }
    else if (validUUID(id)) { setExternalRun(''); controller.read(id) }
    else if (validUUID(runID)) {
      setExternalRun(runID)
      controller.clearView()
      setStep(requested === 'publish' ? 'publish' : 'test')
    } else if (requested === 'publish') {
      controller.clearView()
      setExternalRun('publication')
    } else {
      controller.clearView()
      setExternalRun('')
    }
    return () => {
      epoch.current++
    }
  }, [location.pathname, location.search])
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
    navigate('', 'test', id, role)
  }
  const create = async (sourceRun?: string) => {
    if (!allowed || locked || dirty) return false
    const template = scene === 'mbti' ? templates.find((entry) => sameSelector(entry.selector, sceneSelector)) : undefined
    if (!sourceRun && (!publication || (!publication.active_publication_id && !template) || !validReason(reason) || !title.trim()))
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
        : publication?.active_publication_id
          ? { publication_id: publication.active_publication_id, title, reason }
          : { template_ref: template?.template_ref, title, reason }
    )
    if (!value) return false
    setExternalRun('')
    setRun(null)
    navigate(id, 'edit')
    return true
  }
  const isPublished = Boolean(
    activeRun &&
      publication?.publication?.publication.evidence.run_id === activeRun &&
      publication.active_publication_id
  )
  const reviewing = run && ['awaiting_review', 'approved', 'rejected'].includes(run.status)
  const phase = step === 'publish' ? (isPublished ? 4 : 3) : step === 'test' ? (reviewing ? 2 : 1) : 0
  const switchScene = (next: 'scale' | 'mbti') => {
    if (next === scene || locked || dirty) return
    epoch.current++
    controller.clearView()
    setItems([]); setTemplates([]); setPublication(null); setRun(null); setExternalRun('')
    setTitle(next === 'mbti' ? 'MBTI 首版解读' : '解读方案改进')
    setReason('')
    const url = new URLSearchParams()
    if (next === 'mbti') url.set('aiScene', 'mbti')
    history.push(`/operations/ai-governance/solutions${url.toString() ? `?${url}` : ''}`)
  }
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
        {section === 'solutions' && <Button disabled={locked || dirty}
          onClick={() => history.push(assetsOpen ? '/operations/ai-governance/solutions' : '/operations/ai-governance/solutions/assets')}>
          {assetsOpen ? '返回解读方案' : '配置资产'}
        </Button>}
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
      {assetsOpen ? (
        <ConfigurationAssets owner={owner} onEvaluate={(selection) => {
          if (locked || dirty) return
          setEvaluationSelection(selection)
          navigate('', 'test', 'new')
        }} />
      ) : (
        <>
          {!working && (
            <>
              {tab === 'solutions' && <>
                <Space style={{ marginBottom: 16 }}>
                  <Button type={scene === 'scale' ? 'primary' : 'default'} disabled={locked || dirty}
                    onClick={() => switchScene('scale')}>量表单次解读</Button>
                  <Button type={scene === 'mbti' ? 'primary' : 'default'} disabled={locked || dirty}
                    onClick={() => switchScene('mbti')}>MBTI 单次解读</Button>
                </Space>
                <Card
                  title={scene === 'mbti' ? 'MBTI 单次解读' : '单次测评补充解读'}
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
                          : publication.version ? '已停用' : '尚未发布'
                        : '线上状态未确认'}
                    </Tag>
                    <Typography.Text>
                      线上版本：{publication?.publication?.publication.evidence.profile.version || '—'}
                    </Typography.Text>
                  </Space>
                  <Typography.Paragraph type="secondary">
                    业务入口是否开放仍由独立准入配置控制，此处不推断。修改版本不会影响当前线上配置。
                  </Typography.Paragraph>
                  {scene === 'mbti' && publication && !publication.active_publication_id &&
                    <Alert type="info" showIcon message={templates.length ? '可从首版模板创建方案，完成评测和人工审核后再发布。' : '首版模板尚未安装，请联系管理员核对初始化。'} />}
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
                          !publication ||
                          (!publication.active_publication_id && !(scene === 'mbti' && templates.length)) ||
                          !title.trim() ||
                          !validReason(reason)
                        }
                        onClick={() => create()}
                      >
                        {scene === 'mbti' && !publication?.active_publication_id ? '创建首版方案' : '从线上方案创建修改版本'}
                      </Button>
                      <Button
                        disabled={locked}
                        onClick={() => {
                          navigate('', 'publish')
                        }}
                      >
                        查看发布与回退
                      </Button>
                    </Space>
                  </Space>
                </Card>
                {publication?.active_publication_id && <FlowPanel owner={owner} kind="publication" id={publication.active_publication_id} />}
                <Card title="修改版本" style={{ marginTop: 16 }}>
                  <Table<SolutionSummary>
                    rowKey="solution_id"
                    dataSource={items.filter((item) => scene === 'mbti'
                      ? item.scene_contract_version === 'mbti-single-assessment/v1'
                      : !item.scene_contract_version)}
                    pagination={false}
                    loading={loading}
                    columns={[
                      { title: '名称', dataIndex: 'title' },
                      { title: '场景', render: (_, row) => row.scene_contract_version === 'mbti-single-assessment/v1' ? 'MBTI 单次解读' : '量表单次解读' },
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
                    locale={{ emptyText: scene === 'mbti' ? '还没有 MBTI 方案，可从首版模板开始。' : '还没有修改版本，从线上方案开始一次改进。' }}
                  />
                  {cursor && (
                    <Button onClick={() => refresh(cursor)} loading={loading}>
                      加载更多
                    </Button>
                  )}
                </Card>
              </>}
              {tab === 'reviews' && <>
                <ReviewInbox userID={owner} allowed={allowed} onSelect={selectRun} />
              </>}
              {tab === 'runs' && <>
                <NativeEvaluationCatalog disabled={locked} autoLoad onSelect={selectRun} />

              </>}
            </>
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
                {solution && <Tag color="blue">{solution.scene_contract_version === 'mbti-single-assessment/v1' ? 'MBTI 单次解读' : '量表单次解读'}</Tag>}
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
              {solution && <FlowPanel owner={owner} kind="solution" id={solution.solution_id}
                sourceRevision={solution.revision} compareID={solution.source.publication_id || undefined}
                onEdit={!locked && !dirty && allowed ? (target) => {
                  navigate(solution.solution_id, 'edit')
                  setEditTarget(target)
                } : undefined}
                onCreate={solution.prepared && !locked && !dirty && allowed ? () => { create(solution.prepared?.run_id) } : undefined}
              />}
              {step === 'edit' &&
                solution &&
                (!solution.prepared ? (
                  <SolutionEditor
                    key={solution.solution_id}
                    solution={solution}
                    focusTarget={editTarget}
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
                  guided={activeRun !== 'new'}
                  key={`${owner}:${activeRun}`}
                  owner={owner}
                  selection={evaluationSelection}
                  plan={solution?.prepared?.plan}
                  initialRole={reviewRole}
                  initialRunID={activeRun === 'new' ? '' : activeRun}
                  onState={reportRun}
                  onRevise={(value) => create(value.run_id)}
                  onPublish={(id) =>
                    navigate(solution?.solution_id || '', 'publish', solution ? '' : id)
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
                    initialSelector={sceneSelector}
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
