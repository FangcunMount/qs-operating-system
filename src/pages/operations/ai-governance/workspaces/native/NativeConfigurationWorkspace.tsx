import { useCallback, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Alert, Button, Steps, Tabs } from 'antd'
import { loadSolutionSource } from '../product/solution'
import { SolutionHome } from '../product/SolutionHome'
import { PrepareSolution } from '../product/PrepareSolution'
import type { AssetDetail, AssetReference, EvaluationSelection, NativeEvaluationState, PublicationState } from '@/api/path/aiWorkflow'
import { rootStore } from '@/store'
import { AssetCatalogWorkspace } from './AssetCatalogWorkspace'
import { PromptDraftWorkspace } from './PromptDraftWorkspace'
import { ProfileRegistrationWorkspace, ProfileSelection } from './ProfileRegistrationWorkspace'
import { SuiteRegistrationWorkspace, SuiteSelection } from './SuiteRegistrationWorkspace'
import { NativeEvaluationWorkspace } from './NativeEvaluationWorkspace'
import { NativeParticipantWorkspace } from './NativeParticipantWorkspace'
import { NativeParticipantRetryWorkspace } from './NativeParticipantRetryWorkspace'
import { NativePublicationWorkspace } from './NativePublicationWorkspace'

function NativeConfigurationContent({ owner }: { owner: string }) {
  const [source, setSource] = useState<AssetReference | null>(null)
  const [selection, setSelection] = useState<ProfileSelection>({})
  const [suiteSelection, setSuiteSelection] = useState<SuiteSelection>({})
  const [evaluationSelection, setEvaluationSelection] = useState<EvaluationSelection>({})
  const [publicationRunID, setPublicationRunID] = useState('')
  const [selectedRunID, setSelectedRunID] = useState('')
  const [view, setView] = useState('home')
  const selectAsset = (detail: AssetDetail) => {
    if (detail.item.kind === 'profile') setSelection((previous) => ({ ...previous, profile: detail }))
    if (detail.item.kind === 'prompt')
      setSelection((previous) => ({ ...previous, prompt: detail.item.reference }))
    if (detail.item.kind === 'route')
      setSelection((previous) => ({ ...previous, route: detail.item.reference }))
    setView('profile')
  }
  const [sourceError, setSourceError] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [published, setPublished] = useState<PublicationState | null>(null)
  const reportPublication = useCallback((value: PublicationState | null) => setPublished(value), [])
  const [run, setRun] = useState<NativeEvaluationState | null>(null)
  const reportRun = useCallback((value: NativeEvaluationState | null) => setRun(value), [])
  const reviewing = run && ['awaiting_review', 'approved', 'rejected'].includes(run.status)
  const isPublished = published?.publication?.publication.evidence.run_id === publicationRunID && !!published?.active_publication_id
  const step = view === 'publication' ? (isPublished ? 4 : 3) : view === 'evaluation' ? (reviewing ? 2 : 1) : 0
  return (
    <>
      {sourceError && <Alert type="error" message={sourceError} />}
      {view !== 'home' && <Button onClick={() => setView('home')} style={{ marginBottom: 16 }}>返回方案首页</Button>}
      {view === 'home' && <SolutionHome
        onEdit={(value) => {
          if (run) {
            setSourceError('当前仍在查看另一轮评测。请在测试与审核中结束查看，或使用“基于本轮创建修改版本”。')
            setView('evaluation')
            return
          }
          setSourceError('')
          setSource(value.prompt)
          setSelection({ profile: value.profile, prompt: value.prompt, route: value.route })
          setSuiteSelection({ suite: value.suite })
          setEvaluationSelection({ semantic_route: value.semantic })
          setView('prompt')
        }}
        onManage={() => setView('publication')}
        onReview={() => setView('evaluation')}
        onSelectRun={(id) => { setSelectedRunID(id); setView('evaluation') }}
      />}
      {view !== 'home' && view !== 'participant' && <>
        <Steps current={step} style={{ margin: '20px 0' }}>
          {['编辑方案', '测试效果', '人工审核', '发布确认', '上线'].map((title, index) => (
            <Steps.Step key={title} title={title} status={
              index === 2 && run?.status === 'rejected' ? 'error' :
                (index === 0 && !!run?.creation) || (index === 1 && !!reviewing) ||
                (index === 2 && run?.status === 'approved') || (index >= 3 && isPublished) ? 'finish' :
                  index === step ? 'process' : 'wait'
            } />
          ))}
        </Steps>
        <Alert showIcon type="info" message={
          view === 'prompt' ? '修改 Prompt 并保存，确认后冻结版本，再继续准备测试。' :
            view === 'profile' || view === 'prepare' ? '已继承来源策略与模型，确认新版本后继续。' :
              view === 'suite' ? '测试案例已继承，绑定本次修改版本后开始测试。' :
                view === 'evaluation' ? '查看测试进度、候选结果与审核意见；审核拒绝不会改变线上版本。' :
                  '确认审核记录及发布范围。上线状态以服务端发布记录为准。'
        } />
      </>}
      <Button style={{ margin: '16px 0' }} onClick={() => setAdvanced(!advanced)}>{advanced ? '收起高级配置目录' : '高级配置目录'}</Button>
      <div hidden={!advanced}><AssetCatalogWorkspace
        onDraft={(value) => {
          setSource(value)
          setView('prompt')
        }}
        onRegisterAsset={selectAsset}
        onSuiteAsset={(detail) => {
          const key = detail.item.kind
          if (key === 'suite' || key === 'profile' || key === 'prompt' || key === 'route')
            setSuiteSelection((previous) => ({ ...previous, [key]: detail.item.reference }))
          setView('suite')
        }}
        onEvaluationAsset={(purpose, ref) => {
          setEvaluationSelection((previous) => ({
            ...previous,
            [purpose]: { id: ref.identity, version: ref.version, fingerprint: ref.fingerprint }
          }))
          setView('evaluation')
        }}
      /></div>
      <Tabs activeKey={view} onChange={setView}>
        <Tabs.TabPane tab="方案首页" key="home" />
        <Tabs.TabPane tab="用户任务" key="participant">
          <NativeParticipantWorkspace key={owner} />
          <NativeParticipantRetryWorkspace key={`retry:${owner}`} owner={owner} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="编辑内容" key="prompt">
          <PromptDraftWorkspace key={`${owner}:${source?.identity}:${source?.version}`} owner={owner} source={source} onContinue={(prompt) => {
            setSelection((previous) => ({ ...previous, prompt }))
            setView('prepare')
          }} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="准备本版本测试" key="prepare">
          <PrepareSolution key={`${owner}:${selection.prompt?.version}`} owner={owner} selection={selection}
            semantic={evaluationSelection.semantic_route} onReady={(receipt) => {
              const route = receipt.manifest.generation_route
              setEvaluationSelection((previous) => ({ ...previous, suite: receipt.suite,
                generation_route: { id: route.identity, version: route.version, fingerprint: route.fingerprint } }))
              setView('evaluation')
            }} />
        </Tabs.TabPane>
        {advanced && <Tabs.TabPane tab="确认方案配置" key="profile">
          <ProfileRegistrationWorkspace
            key={owner}
            owner={owner}
            selection={selection}
            onSuite={(manifest) => {
              setSuiteSelection((previous) => ({
                ...previous,
                profile: manifest.profile,
                prompt: manifest.prompt,
                route: manifest.generation_route
              }))
              setView('suite')
            }}
          />
        </Tabs.TabPane>}
        {advanced && <Tabs.TabPane tab="准备测试" key="suite">
          <SuiteRegistrationWorkspace
            key={owner}
            owner={owner}
            selection={suiteSelection}
            onEvaluate={(receipt) => {
              const route = receipt.manifest.generation_route
              setEvaluationSelection((previous) => ({
                ...previous,
                suite: receipt.suite,
                generation_route: {
                  id: route.identity,
                  version: route.version,
                  fingerprint: route.fingerprint
                }
              }))
              setView('evaluation')
            }}
          />
        </Tabs.TabPane>}
        <Tabs.TabPane tab="测试与审核" key="evaluation">
          <NativeEvaluationWorkspace
            key={owner}
            owner={owner}
            selection={evaluationSelection}
            onState={reportRun}
            initialRunID={selectedRunID}
            onRevise={async (current) => {
              if (!current.creation) return false
              setSourceError('')
              try {
                const value = await loadSolutionSource(current.creation.release)
                setSelectedRunID('')
                setSource(value.prompt)
                setSelection({ profile: value.profile, prompt: value.prompt, route: value.route })
                setSuiteSelection({ suite: value.suite })
                setEvaluationSelection({ semantic_route: value.semantic })
                setView('prompt')
                return true
              } catch { setSourceError('未能读取本轮完整配置，没有创建新版本，请稍后重试。'); return false }
            }}
            onPublish={(id) => {
              setPublicationRunID(id)
              setView('publication')
            }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="发布与回退" key="publication">
          <NativePublicationWorkspace key={owner} owner={owner} initialRunID={publicationRunID} onState={reportPublication} />
        </Tabs.TabPane>
      </Tabs>
    </>
  )
}

export const NativeConfigurationWorkspace = observer(() => {
  const owner = rootStore.userStore.currentUser?.id || ''
  return owner ? (
    <NativeConfigurationContent key={owner} owner={owner} />
  ) : (
    <Alert type="warning" message="请先恢复登录身份。" />
  )
})
