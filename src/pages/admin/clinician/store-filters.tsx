import React, { useEffect, useState } from 'react'
import { Alert, Select, Space } from 'antd'
import { IStore, IStoreProgress, loadEnabledStores, storeApi } from '@/api/path/store'
import { extractErrorMessage } from '@/utils/apiError'

interface Props { value?: string; onChange: (value?: string) => void }
const StoreFilters: React.FC<Props> = ({ value, onChange }) => {
  const [stores, setStores] = useState<IStore[]>([])
  const [progress, setProgress] = useState<IStoreProgress | null>(null)
  const [errorText, setErrorText] = useState('')
  useEffect(() => {
    let live = true
    void Promise.all([loadEnabledStores(), storeApi.progress()]).then(([items, [error, response]]) => {
      if (!live) return
      if (error || !response?.data) throw error || new Error('无法读取配置进度')
      setStores(items)
      setProgress(response.data)
    }).catch((error) => { if (live) setErrorText(extractErrorMessage(error, '无法读取门店配置')) })
    return () => { live = false }
  }, [])
  return <Space direction="vertical" style={{ marginBottom: 16 }}>
    {errorText && <Alert type="error" message={errorText} showIcon />}
    {progress && <span>
      全部医生 {progress.total} 人：已配置 {progress.configured}，未配置 {progress.unconfigured}；
      有效医生 {progress.active_total} 人：已配置 {progress.active_configured}，未配置 {progress.active_unconfigured}。
    </span>}
    <Select aria-label="医生服务门店" allowClear placeholder="全部服务门店" value={value} style={{ width: 320 }} onChange={onChange} options={[
      { value: 'unconfigured', label: '未配置门店' },
      ...stores.map((item) => ({ value: item.id, label: `${item.name}（${item.code}）` }))
    ]} />
  </Space>
}
export default StoreFilters
