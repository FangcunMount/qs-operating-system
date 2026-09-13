import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Alert, Tabs } from 'antd'
import type { AssetDetail, AssetReference, EvaluationSelection } from '@/api/path/aiWorkflow'
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
  const [view, setView] = useState('prompt')
  const selectAsset = (detail: AssetDetail) => {
    if (detail.item.kind === 'profile') setSelection((previous) => ({ ...previous, profile: detail }))
    if (detail.item.kind === 'prompt')
      setSelection((previous) => ({ ...previous, prompt: detail.item.reference }))
    if (detail.item.kind === 'route')
      setSelection((previous) => ({ ...previous, route: detail.item.reference }))
    setView('profile')
  }
  return (
    <>
      <AssetCatalogWorkspace
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
      />
      <Tabs activeKey={view} onChange={setView}>
        <Tabs.TabPane tab="参与者生成" key="participant">
          <NativeParticipantWorkspace key={owner} />
          <NativeParticipantRetryWorkspace key={`retry:${owner}`} owner={owner} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Prompt 草稿" key="prompt">
          <PromptDraftWorkspace key={owner} owner={owner} source={source} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="解读策略" key="profile">
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
        </Tabs.TabPane>
        <Tabs.TabPane tab="评测套件" key="suite">
          <SuiteRegistrationWorkspace
            key={owner}
            owner={owner}
            selection={suiteSelection}
            onEvaluate={(receipt) => {
              const route = receipt.manifest.generation_route
              setEvaluationSelection({
                suite: receipt.suite,
                generation_route: {
                  id: route.identity,
                  version: route.version,
                  fingerprint: route.fingerprint
                }
              })
              setView('evaluation')
            }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="原生评测" key="evaluation">
          <NativeEvaluationWorkspace
            key={owner}
            owner={owner}
            selection={evaluationSelection}
            onPublish={(id) => {
              setPublicationRunID(id)
              setView('publication')
            }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="发布与回退" key="publication">
          <NativePublicationWorkspace key={owner} owner={owner} initialRunID={publicationRunID} />
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
