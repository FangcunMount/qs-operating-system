import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Empty, Input, Select, Space, Table, Typography } from 'antd'
import { getAsset, listAssets, getProfileLifecycle, listProfileLifecycles } from '@/api/path/aiWorkflow'
import type {
  ProfileLifecycle,
  ProfileStatus,
  AssetDetail,
  AssetItem,
  AssetKind,
  AssetReference,
  EvaluationSelection
} from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'

type CatalogItem = AssetItem & { lifecycle?: ProfileLifecycle }
const profileStatusLabels: Record<ProfileStatus, string> = {
  draft: '未在 qs-ai 发布', published: '当前已发布', disabled: '已停用或被替换'
}
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
  onEvaluationAsset?: (purpose: keyof EvaluationSelection, source: AssetReference) => void
}> = ({ onDraft, onRegisterAsset, onSuiteAsset, onEvaluationAsset }) => {
  const [kind, setKind] = useState<AssetKind>('prompt')
  const [status, setStatus] = useState<ProfileStatus | ''>('')
  const [profileDetail, setProfileDetail] = useState<ProfileLifecycle | null>(null)
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [cursor, setCursor] = useState('')
  const [detail, setDetail] = useState<AssetDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const epoch = useRef(0)
  const detailEpoch = useRef(0)
  const queryKey = JSON.stringify([kind, filter, status])
  const currentQuery = useRef(queryKey)
  currentQuery.current = queryKey
  const load = async (after = '') => {
    const request = ++epoch.current
    detailEpoch.current++
    setDetail(null)
    setProfileDetail(null)
    setReading(false)
    setLoading(true)
    setError('')
    if (!after) {
      setItems([])
      setCursor('')
    }
    try {
      const [failure, response] = kind === 'profile'
        ? await listProfileLifecycles(filter, status, after).then(([failure, response]) => [
          failure,
          response && { ...response, data: { ...response.data, items: response.data.items.map(
            (lifecycle): CatalogItem => ({ kind: 'profile', reference: lifecycle.reference, lifecycle })
          ) } }
        ] as const)
        : await listAssets(kind, filter, after)
      if (request !== epoch.current || queryKey !== currentQuery.current) return
      if (failure || !response || !Array.isArray(response.data?.items)) {
        setItems([])
        setCursor('')
        setError('配置目录暂不可用，请确认服务已启用且当前账号有审计权限。')
      } else {
        setItems((previous) =>
          after ? [...previous, ...response.data.items] : response.data.items
        )
        setCursor(response.data.next_cursor || '')
      }
    } catch {
      if (request === epoch.current && queryKey === currentQuery.current) {
        setItems([])
        setCursor('')
        setError('配置目录读取失败。')
      }
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
  }, [kind, filter, status])
  const read = async (item: CatalogItem) => {
    const request = ++detailEpoch.current
    setReading(true)
    setDetail(null)
    setProfileDetail(null)
    setError('')
    try {
      const [[failure, response], lifecycleResult] = await Promise.all([
        getAsset(item.kind, item.reference.identity, item.reference.version),
        item.kind === 'profile'
          ? getProfileLifecycle(item.reference.identity, item.reference.version)
          : Promise.resolve(null)
      ])
      if (request !== detailEpoch.current || queryKey !== currentQuery.current) return
      if (failure || !response || (item.kind === 'profile' && (!lifecycleResult?.[1] || lifecycleResult[0]))) setError('版本正文或发布状态读取失败。')
      else if (
        response.data.item.kind !== item.kind ||
        (['identity', 'version', 'fingerprint', 'content_sha256'] as const).some(
          (key) => response.data.item.reference[key] !== item.reference[key] ||
            (lifecycleResult?.[1] && lifecycleResult[1].data.reference[key] !== item.reference[key])
        )
      )
        setError('版本引用已变化，请刷新目录后重试。')
      else {
        setDetail(response.data)
        setProfileDetail(lifecycleResult?.[1]?.data || null)
      }
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
        {kind === 'profile' && <Select
          aria-label="Profile 发布状态"
          value={status}
          onChange={(value) => setStatus(value)}
          style={{ width: 190 }}
          options={[{ value: '', label: '全部发布状态' }, ...Object.entries(profileStatusLabels).map(
            ([value, label]) => ({ value, label })
          )]}
        />}
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
      {kind === 'profile' && <Typography.Paragraph type="secondary">
        状态来自 qs-ai 的发布记录；迁入来源仅用于追溯，旧系统曾发布不代表当前已在 qs-ai 生效。
      </Typography.Paragraph>}
      <Table<CatalogItem>
        dataSource={items}
        loading={loading}
        pagination={false}
        rowKey={(item) => `${item.kind}:${item.reference.identity}:${item.reference.version}`}
        locale={{ emptyText: error ? '目录状态未知' : <Empty description="暂无配置版本" /> }}
        columns={[
          { title: '标识', render: (_, item) => item.reference.identity },
          { title: '版本', render: (_, item) => item.reference.version },
          ...(kind === 'profile' ? [
            { title: '发布状态', render: (_: unknown, item: CatalogItem) => item.lifecycle && profileStatusLabels[item.lifecycle.status] },
            { title: '来源', render: (_: unknown, item: CatalogItem) => item.lifecycle?.source_ref }
          ] : []),
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
          {profileDetail && <Space direction="vertical" style={{ marginBottom: 16 }}>
            <Typography.Text>当前状态：{profileStatusLabels[profileDetail.status]}</Typography.Text>
            <Typography.Text>来源：{profileDetail.source_ref}</Typography.Text>
            <Typography.Text>登记时间：{profileDetail.imported_at}</Typography.Text>
            {profileDetail.active_publication_id && <Typography.Text>
              生效发布：{profileDetail.active_publication_id}
            </Typography.Text>}
          </Space>}
          <JsonEvidence value={detail.definition_json} />
          {onRegisterAsset && ['profile', 'prompt', 'route'].includes(detail.item.kind) && (
            <Button onClick={() => onRegisterAsset(detail)}>用于注册策略版本</Button>
          )}
          {onSuiteAsset && ['suite', 'profile', 'prompt', 'route'].includes(detail.item.kind) && (
            <Button onClick={() => onSuiteAsset(detail)}>用于绑定评测套件</Button>
          )}
          {onEvaluationAsset && detail.item.kind === 'suite' && (
            <Button onClick={() => onEvaluationAsset('suite', detail.item.reference)}>
              使用此套件准备评测
            </Button>
          )}
          {onEvaluationAsset && detail.item.kind === 'route' && (
            <Space wrap>
              <Button onClick={() => onEvaluationAsset('generation_route', detail.item.reference)}>
                用于评测生成
              </Button>
              <Button onClick={() => onEvaluationAsset('semantic_route', detail.item.reference)}>
                用于语义评测
              </Button>
            </Space>
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
