import { useState } from 'react'
import { Alert, Button, Space } from 'antd'
import type { AssetReference, EvaluationSelection } from '@/api/path/aiWorkflow'
import { AssetCatalogWorkspace } from '../native/AssetCatalogWorkspace'
import { PromptDraftWorkspace } from '../native/PromptDraftWorkspace'
import { ProfileRegistrationWorkspace, ProfileSelection } from '../native/ProfileRegistrationWorkspace'
import { SuiteRegistrationWorkspace, SuiteSelection } from '../native/SuiteRegistrationWorkspace'
import { PrepareSolution } from './PrepareSolution'

// Asset maintenance only. Evaluation, review and publication stay in their canonical workspace.
export function ConfigurationAssets({ owner, onEvaluate }: {
  owner: string
  onEvaluate: (selection: EvaluationSelection) => void
}): JSX.Element {
  const [view, setView] = useState('catalog')
  const [source, setSource] = useState<AssetReference | null>(null)
  const [profile, setProfile] = useState<ProfileSelection>({})
  const [suite, setSuite] = useState<SuiteSelection>({})
  const [evaluation, setEvaluation] = useState<EvaluationSelection>({})
  return <>
    <Alert type="info" message="方案配置资产" description="日常修改请从线上方案创建修改版本。这里维护已有模板、配置与套件绑定；评测和审核仍在统一工作区完成。" />
    <Space style={{ margin: '16px 0' }}>
      <Button onClick={() => setView('catalog')}>查看资产目录</Button>
      <Button onClick={() => setView('profile')}>方案绑定</Button>
      <Button onClick={() => setView('suite')}>套件绑定</Button>
      <Button onClick={() => onEvaluate(evaluation)}>继续配置评测</Button>
    </Space>
    <div hidden={view !== 'catalog'}><AssetCatalogWorkspace
      onDraft={(value) => { setSource(value); setView('prompt') }}
      onRegisterAsset={(detail) => {
        if (detail.item.kind === 'profile') setProfile((old) => ({ ...old, profile: detail }))
        if (detail.item.kind === 'prompt') setProfile((old) => ({ ...old, prompt: detail.item.reference }))
        if (detail.item.kind === 'route') setProfile((old) => ({ ...old, route: detail.item.reference }))
        setView('profile')
      }}
      onSuiteAsset={(detail) => {
        const key = detail.item.kind
        if (['suite', 'profile', 'prompt', 'route'].includes(key)) setSuite((old) => ({ ...old, [key]: detail.item.reference }))
        setView('suite')
      }}
      onEvaluationAsset={(purpose, reference) => {
        setEvaluation((old) => ({ ...old, [purpose]: { id: reference.identity, version: reference.version, fingerprint: reference.fingerprint } }))
      }}
    /></div>
    {view === 'prompt' && <PromptDraftWorkspace key={`${owner}:${source?.identity}:${source?.version}`} owner={owner} source={source}
      onContinue={(prompt) => { setProfile((old) => ({ ...old, prompt })); setView('prepare') }} />}
    {view === 'prepare' && <PrepareSolution owner={owner} selection={profile} semantic={evaluation.semantic_route}
      onReady={(receipt) => {
        const route = receipt.manifest.generation_route
        onEvaluate({ ...evaluation, suite: receipt.suite,
          generation_route: { id: route.identity, version: route.version, fingerprint: route.fingerprint } })
      }} />}
    {view === 'profile' && <ProfileRegistrationWorkspace owner={owner} selection={profile}
      onSuite={(manifest) => {
        setSuite((old) => ({ ...old, profile: manifest.profile, prompt: manifest.prompt, route: manifest.generation_route }))
        setView('suite')
      }} />}
    {view === 'suite' && <SuiteRegistrationWorkspace owner={owner} selection={suite}
      onEvaluate={(receipt) => {
        const route = receipt.manifest.generation_route
        onEvaluate({ ...evaluation, suite: receipt.suite,
          generation_route: { id: route.identity, version: route.version, fingerprint: route.fingerprint } })
      }} />}
  </>
}
