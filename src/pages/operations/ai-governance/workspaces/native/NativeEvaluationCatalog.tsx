import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Select, Space, Table, Typography } from 'antd'
import { listNativeEvaluations } from '@/api/path/aiWorkflow'
import type { EvaluationStatus, NativeEvaluationSummary } from '@/api/path/aiWorkflow'
import { validUUID } from './commands'
import { statusLabels } from './evaluationValidation'

export function NativeEvaluationCatalog({
  disabled, onSelect, autoLoad = false
}: { disabled: boolean; onSelect: (runID: string) => void; autoLoad?: boolean }): JSX.Element {
  const [status, setStatus] = useState<EvaluationStatus | ''>('')
  const [items, setItems] = useState<NativeEvaluationSummary[]>([])
  const [cursor, setCursor] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const epoch = useRef(0)
  useEffect(() => () => { epoch.current++ }, [])

  const load = async (filter: EvaluationStatus | '', after = '') => {
    const request = ++epoch.current
    setLoading(true)
    setError('')
    setCursor('')
    if (!after) setItems([])
    try {
      const [failure, response] = await listNativeEvaluations(filter, after)
      if (request !== epoch.current) return
      const page = response?.data
      if (failure || !page || !Array.isArray(page.items) || page.items.length > 20 ||
        typeof page.next_cursor !== 'string' || page.next_cursor.length > 1024 ||
        !page.items.every((item) => item && validUUID(item.run_id) &&
          Object.keys(statusLabels).includes(item.status) && (!filter || item.status === filter) &&
          typeof item.profile_id === 'string' && typeof item.profile_version === 'string' &&
          typeof item.prompt_id === 'string' && typeof item.prompt_version === 'string' &&
          typeof item.created_at === 'string' && Number.isFinite(Date.parse(item.created_at)))) {
        throw new Error('任务列表暂不可用，请刷新重试或确认当前账号的审计权限。')
      }
      setItems((previous) => after ? [...previous, ...page.items] : page.items)
      setCursor(page.next_cursor)
      setLoaded(true)
    } catch {
      if (request !== epoch.current) return
      setItems([])
      setLoaded(false)
      setError('任务列表暂不可用，请刷新重试或确认当前账号的审计权限。')
    } finally {
      if (request === epoch.current) setLoading(false)
    }
  }

  useEffect(() => { if (autoLoad) load('', '') }, [autoLoad])

  return (
    <Card size="small" title="查找已有评测" style={{ marginTop: 16 }}>
      <Space wrap style={{ marginBottom: 12 }}>
        <Select<EvaluationStatus | ''>
          aria-label="评测状态筛选"
          value={status}
          style={{ width: 210 }}
          options={[
            { value: '', label: '全部状态' },
            ...Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
          ]}
          onChange={(value) => { setStatus(value); load(value) }}
        />
        <Button loading={loading} onClick={() => load(status)}>查询任务列表</Button>
      </Space>
      <Typography.Paragraph type="secondary">
        按创建时间从新到旧排列。选择任务后会重新读取当前详情；旧系统任务仍在历史入口查看。
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} />}
      {(loaded || loading) && (
        <Table<NativeEvaluationSummary>
          size="small"
          rowKey="run_id"
          dataSource={items}
          loading={loading}
          pagination={false}
          scroll={{ x: 800 }}
          locale={{ emptyText: '当前筛选下暂无任务' }}
          columns={[
            { title: '创建时间', dataIndex: 'created_at', width: 190,
              render: (value: string) => new Date(value).toLocaleString('zh-CN') },
            { title: '解读策略', render: (_, item) => `${item.profile_id} · ${item.profile_version}` },
            { title: 'Prompt', render: (_, item) => `${item.prompt_id} · ${item.prompt_version}` },
            { title: '状态', width: 180, render: (_, item) => statusLabels[item.status] },
            { title: '操作', width: 100, render: function renderAction(_, item) {
              return <Button disabled={disabled || loading} onClick={() => onSelect(item.run_id)}>查看任务</Button>
            } }
          ]}
        />
      )}
      {cursor && <Button disabled={loading} onClick={() => load(status, cursor)} style={{ marginTop: 12 }}>加载更多任务</Button>}
      {disabled && <Typography.Paragraph type="secondary">当前操作尚在处理或待核对，请先查询原任务。</Typography.Paragraph>}
    </Card>
  )
}
