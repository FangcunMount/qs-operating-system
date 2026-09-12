import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { Alert } from 'antd'
import type { AssetReference } from '@/api/path/aiWorkflow'
import { rootStore } from '@/store'
import { AssetCatalogWorkspace } from './AssetCatalogWorkspace'
import { PromptDraftWorkspace } from './PromptDraftWorkspace'

export const NativeConfigurationWorkspace = observer(() => {
  const [source, setSource] = useState<AssetReference | null>(null)
  const owner = rootStore.userStore.currentUser?.id || ''
  if (!owner) return <Alert type="warning" message="请先恢复登录身份。" />
  return (
    <>
      <AssetCatalogWorkspace onDraft={setSource} />
      <PromptDraftWorkspace key={owner} owner={owner} source={source} />
    </>
  )
})
