import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Space, Tag, Typography } from 'antd'
import { getPublication } from '@/api/path/aiWorkflow'
import type { PublicationState } from '@/api/path/aiWorkflow'
import { checkPublication, defaultPublicationSelector } from '../native/publicationValidation'
import { NativeEvaluationCatalog } from '../native/NativeEvaluationCatalog'
import { loadSolutionSource, SolutionSource } from './solution'

export function SolutionHome({ onEdit, onManage, onReview, onSelectRun }: {
  onEdit: (source: SolutionSource) => void; onManage: () => void; onReview: () => void; onSelectRun?: (id: string) => void
}): JSX.Element {
  const [current, setCurrent] = useState<PublicationState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const epoch = useRef(0)
  const load = async () => {
    const id = ++epoch.current
    setBusy(true); setError(''); setCurrent(null)
    try {
      const [failure, response] = await getPublication(defaultPublicationSelector)
      if (failure || !response) throw new Error()
      checkPublication(response.data, defaultPublicationSelector)
      if (id === epoch.current) setCurrent(response.data)
    } catch { if (id === epoch.current) setError('线上方案暂不可用，请刷新重试。未读取到状态不代表已停用。') }
    finally { if (id === epoch.current) setBusy(false) }
  }
  useEffect(() => { load(); return () => { epoch.current++ } }, [])
  const edit = async () => {
    if (!current?.publication) return
    const id = ++epoch.current
    setBusy(true); setError('')
    try {
      const source = await loadSolutionSource(current.publication.publication.evidence.release, current.publication)
      if (id === epoch.current) onEdit(source)
    } catch { if (id === epoch.current) setError('无法完整继承线上配置，请刷新重试。没有创建或修改任何版本。') }
    finally { if (id === epoch.current) setBusy(false) }
  }
  const proof = current?.publication?.publication.evidence
  return <Card title="单次测评补充解读" extra={<Button loading={busy} onClick={load}>刷新线上状态</Button>}>
    {error && <Alert type="error" showIcon message={error} />}
    <Descriptions column={1}>
      <Descriptions.Item label="适用范围">通用量表 · 单次标准报告</Descriptions.Item>
      <Descriptions.Item label="线上配置"><Tag>
        {current ? current.active_publication_id ? '已有发布配置' : current.version ? '已停用' : '尚未发布' : '尚未读取'}
      </Tag></Descriptions.Item>
      <Descriptions.Item label="线上版本">{proof?.profile.version || '—'}</Descriptions.Item>
      <Descriptions.Item label="最近变更">{current?.changed_at || '—'}</Descriptions.Item>
    </Descriptions>
    <Typography.Paragraph type="secondary">配置已发布不等于用户入口已开放。创建修改版本不会影响线上解读，只有审核通过并确认发布后才生效。</Typography.Paragraph>
    <Space wrap>
      <Button type="primary" disabled={busy || !proof} onClick={edit}>从线上方案创建修改版本</Button>
      <Button onClick={onReview}>查看测试与审核待办</Button>
      <Button onClick={onManage}>查看发布详情与回退</Button>
    </Space>
    {onSelectRun && <NativeEvaluationCatalog disabled={busy} autoLoad onSelect={onSelectRun} />}
    <details style={{ marginTop: 24 }}><summary>一次解读如何执行</summary>
      <Typography.Paragraph>标准报告事实 → 生成解读（Prompt 与模型）→ 结构与规则检查 → 形成结果 → 回传 QS。</Typography.Paragraph>
      <Typography.Paragraph>批量测试会额外进行语义评测与人工审核，不代表每次用户解读都执行整套测试。</Typography.Paragraph>
    </details>
  </Card>
}
