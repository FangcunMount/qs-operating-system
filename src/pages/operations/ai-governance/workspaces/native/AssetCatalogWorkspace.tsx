import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Select, Space, Table, Typography } from 'antd'
import { getAsset, listAssets } from '@/api/path/aiWorkflow'
import type { AssetDetail, AssetItem, AssetKind, AssetReference } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'

const kinds: Array<{ value: AssetKind; label: string }> = [
  { value: 'prompt', label: 'Prompt 模板' },
  { value: 'profile', label: '解读策略' },
  { value: 'route', label: '模型路线' },
  { value: 'schema', label: '输入输出规范' },
  { value: 'suite', label: '评测套件' }
]
export const AssetCatalogWorkspace: React.FC<{
  onDraft: (source: AssetReference) => void
  onRegisterAsset?: (source: AssetDetail) => void
  onSuiteAsset?: (source: AssetDetail) => void
}> = ({ onDraft, onRegisterAsset, onSuiteAsset }) => {
  const [kind, setKind] = useState<AssetKind>('prompt')
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState<AssetItem[]>([])
  const [cursor, setCursor] = useState('')
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const epoch = useRef(0)
  const detailEpoch = useRef(0)
  const queryKey = `${kind}:${filter}`
  const currentQuery = useRef(queryKey)
  currentQuery.current = queryKey
  const load = async (after = '') => {
    const request = ++epoch.current
    detailEpoch.current++
    setDetail(null)
    setReading(false)
    setLoading(true)
    setError('')
    if (!after) {
      setItems([])
      setCursor('')
    }
    try {
      const [failure, response] = await listAssets(kind, filter, after)
      if (request !== epoch.current || queryKey !== currentQuery.current) return
      if (failure || !response || !Array.isArray(response.data?.items))
        setError('配置目录暂不可用，请确认服务已启用且当前账号有审计权限。')
      else {
        setItems((previous) =>
          after ? [...previous, ...response.data.items] : response.data.items
        )
        setCursor(response.data.next_cursor || '')
      }
    } catch {
      if (request === epoch.current && queryKey === currentQuery.current)
        setError('配置目录读取失败。')
    } finally {
      if (request === epoch.current && queryKey === currentQuery.current) setLoading(false)
    }
  }
  useEffect(() => {
    load()
    return () => {
      epoch.current++
      detailEpoch.current++
    }
    // Queries change only after an explicit search or kind selection.
  }, [kind, filter])
  const read = async (item: AssetItem) => {
    const request = ++detailEpoch.current
    setReading(true)
    setDetail(null)
    setError('')
    try {
      const [failure, response] = await getAsset(
        item.kind,
        item.reference.identity,
        item.reference.version
      )
      if (request !== detailEpoch.current || queryKey !== currentQuery.current) return
      if (failure || !response) setError('版本正文读取失败。')
      else if (
        response.data.item.kind !== item.kind ||
        (['identity', 'version', 'fingerprint', 'content_sha256'] as const).some(
          (key) => response.data.item.reference[key] !== item.reference[key]
        )
      )
        setError('版本引用已变化，请刷新目录后重试。')
      else setDetail(response.data)
    } catch {
      if (request === detailEpoch.current && queryKey === currentQuery.current)
        setError('版本正文读取失败。')
    } finally {
      if (request === detailEpoch.current) setReading(false)
    }
  }
  return (
    <Card title="配置版本目录">
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          aria-label="配置种类"
          value={kind}
          options={kinds}
          onChange={(value) => setKind(value)}
          style={{ width: 160 }}
        />
        <Input.Search
          aria-label="精确配置标识"
          placeholder="按完整标识筛选"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onSearch={() => setFilter(input.trim())}
          enterButton="查询"
        />
        <Button onClick={() => load()} loading={loading}>
          刷新目录
        </Button>
      </Space>
      {error && <Alert showIcon type="error" message={error} />}
      <Table<AssetItem>
        dataSource={items}
        loading={loading}
        pagination={false}
        rowKey={(item) => `${item.kind}:${item.reference.identity}:${item.reference.version}`}
        locale={{ emptyText: error ? '目录状态未知' : <Empty description="暂无配置版本" /> }}
        columns={[
          { title: '标识', render: (_, item) => item.reference.identity },
          { title: '版本', render: (_, item) => item.reference.version },
          {
            title: '操作',
            render: function renderAssetActions(_, item) {
              return <Button onClick={() => read(item)}>查看正文</Button>
            }
          }
        ]}
      />
      {cursor && (
        <Button disabled={loading} onClick={() => load(cursor)} style={{ marginTop: 12 }}>
          加载更多版本
        </Button>
      )}
      {reading && <Typography.Paragraph>正在读取版本正文…</Typography.Paragraph>}
      {detail && (
        <Card
          title={`${detail.item.reference.identity} · ${detail.item.reference.version}`}
          style={{ marginTop: 16 }}
        >
          <Typography.Paragraph type="secondary">
            配置版本的存在不代表评测通过或已发布。
          </Typography.Paragraph>
          <JsonEvidence value={detail.definition_json} />
          {onRegisterAsset && ['profile', 'prompt', 'route'].includes(detail.item.kind) && (
            <Button onClick={() => onRegisterAsset(detail)}>用于注册策略版本</Button>
          )}
          {onSuiteAsset && ['suite', 'profile', 'prompt', 'route'].includes(detail.item.kind) && (
            <Button onClick={() => onSuiteAsset(detail)}>用于绑定评测套件</Button>
          )}
          {detail.item.kind === 'prompt' && (
            <Button type="primary" onClick={() => onDraft(detail.item.reference)}>
              从此版本新建草稿
            </Button>
          )}
        </Card>
      )}
    </Card>
  )
}
