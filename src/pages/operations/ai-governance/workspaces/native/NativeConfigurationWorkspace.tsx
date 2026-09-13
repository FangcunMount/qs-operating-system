import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Alert, Tabs } from 'antd'
import type { AssetDetail, AssetReference } from '@/api/path/aiWorkflow'
import { rootStore } from '@/store'
import { AssetCatalogWorkspace } from './AssetCatalogWorkspace'
import { PromptDraftWorkspace } from './PromptDraftWorkspace'
import { ProfileRegistrationWorkspace, ProfileSelection } from './ProfileRegistrationWorkspace'

export const NativeConfigurationWorkspace = observer(() => {
  const [source, setSource] = useState<AssetReference | null>(null)
  const [selection, setSelection] = useState<ProfileSelection>({})
  const [view, setView] = useState('prompt')
  const owner = rootStore.userStore.currentUser?.id || ''
  if (!owner) return <Alert type="warning" message="请先恢复登录身份。" />
  const selectAsset = (detail: AssetDetail) => {
    if (detail.item.kind === 'profile')
      setSelection((previous) => ({ ...previous, profile: detail }))
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
      />
      <Tabs activeKey={view} onChange={setView}>
        <Tabs.TabPane tab="Prompt 草稿" key="prompt">
          <PromptDraftWorkspace key={owner} owner={owner} source={source} />
        </Tabs.TabPane>
        <Tabs.TabPane tab="解读策略" key="profile">
          <ProfileRegistrationWorkspace key={owner} owner={owner} selection={selection} />
        </Tabs.TabPane>
      </Tabs>
    </>
  )
})
