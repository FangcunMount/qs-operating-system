import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Space, Table, Typography } from 'antd'
import { getNativeExecutionOutput, listNativeExecutions } from '@/api/path/aiWorkflow'
import type { NativeEvaluationState, NativeExecutionOutput, NativeExecutionPage, NativeExecutionSummary } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'

const labels: Record<NativeExecutionSummary['status'], string> = {
  prepared: '等待派发', dispatching: '已派发，等待结果', succeeded: '执行完成', failed: '执行失败', result_unknown: '调用结果未知'
}
function outputText(base64: string): string {
  if (!base64) return '没有保存输出正文'
  try {
    return decodeURIComponent(Array.from(atob(base64), (character) =>
      '%' + character.charCodeAt(0).toString(16).padStart(2, '0')).join(''))
  } catch { return `非文本输出（Base64）：${base64}` }
}
const validSummary = (item: NativeExecutionSummary) => Boolean(item &&
  typeof item.execution_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(item.execution_id) &&
  ['generation', 'semantic'].includes(item.kind) && Object.keys(labels).includes(item.status) &&
  typeof item.case_id === 'string' && Number.isInteger(item.execution_ordinal) && item.execution_ordinal > 0 &&
  item.evidence && typeof item.evidence === 'object')

export function NativeExecutionWorkspace({ run, locked }: {
  run: NativeEvaluationState; locked: boolean
}): JSX.Element {
  const [page, setPage] = useState<NativeExecutionPage | null>(null)
  const [detail, setDetail] = useState<NativeExecutionOutput | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const epoch = useRef(0)
  const identity = `${run.run_id}:${run.version}`
  const current = useRef(identity)
  current.current = identity
  useEffect(() => {
    setPage(null); setDetail(null); setBusy(false); setError('')
    return () => { epoch.current++ }
  }, [identity])
  const sameRun = (value: { run_id: string; version: number }) => value.run_id === run.run_id && value.version === run.version
  const visiblePage = page && sameRun(page) ? page : null
  const visibleDetail = detail && sameRun(detail) ? detail : null
  const load = async (execution?: string, cursor = '') => {
    const request = ++epoch.current
    const active = () => request === epoch.current && identity === current.current
    setBusy(true); setError(''); setDetail(null)
    if (!execution && !cursor) setPage(null)
    try {
      if (execution) {
        if (!visiblePage?.executions.some((item) => item.execution_id === execution)) return
        const [failure, response] = await getNativeExecutionOutput(run.run_id, run.version, execution)
        if (!active()) return
        const value = response?.data
        if (failure || !value || !sameRun(value) || !validSummary(value.execution) || value.execution.execution_id !== execution ||
          typeof value.raw_output !== 'string' || typeof value.normalized_output !== 'string' ||
          value.raw_output.length > 350000 || value.normalized_output.length > 350000)
          throw new Error('Execution output unavailable')
        setDetail(value)
      } else {
        const [failure, response] = await listNativeExecutions(run.run_id, run.version, cursor)
        if (!active()) return
        const value = response?.data
        if (failure || !value || !sameRun(value) || !Array.isArray(value.executions) || value.executions.length > 20 ||
          !value.executions.every(validSummary) || typeof value.next_cursor !== 'string' || value.next_cursor.length > 128)
          throw new Error('Execution index unavailable')
        setPage({ ...value, executions: cursor && visiblePage ? [...visiblePage.executions, ...value.executions] : value.executions })
      }
    } catch {
      if (active()) { setPage(null); setError('执行记录暂不可读或任务版本已变化，请先刷新任务状态。') }
    } finally { if (active()) setBusy(false) }
  }
  return (
    <Card title="执行记录与失败诊断" size="small" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary">包含未形成候选的失败调用。这里仅查看已保存记录，不重新调用模型。</Typography.Paragraph>
      <Button disabled={locked || busy} loading={busy} onClick={() => load()}>读取执行记录</Button>
      {error && <Alert type="warning" showIcon message={error} />}
      {visiblePage && <Table<NativeExecutionSummary> rowKey="execution_id" pagination={false} dataSource={visiblePage.executions}
        size="small" scroll={{ x: 650 }} style={{ marginTop: 12 }} locale={{ emptyText: '当前版本没有已派发的执行记录' }}
        columns={[
          { title: '案例', dataIndex: 'case_id' },
          { title: '阶段', render: (_, item) => item.kind === 'generation' ? '生成' : '语义评测' },
          { title: '尝试', dataIndex: 'execution_ordinal' },
          { title: '状态', render: (_, item) => labels[item.status] },
          { title: '操作', render: function renderExecution(_, item) {
            return <Button disabled={locked || busy} onClick={() => load(item.execution_id)}>查看执行详情</Button>
          } }
        ]} />}
      {visiblePage?.next_cursor && <Button disabled={locked || busy} onClick={() => load(undefined, visiblePage.next_cursor)}>加载更多执行</Button>}
      {visibleDetail && <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
        <Typography.Text strong>{labels[visibleDetail.execution.status]}</Typography.Text>
        <details open><summary>调用回执与诊断</summary><JsonEvidence value={visibleDetail.execution.evidence} /></details>
        <details open><summary>原始输出</summary>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {outputText(visibleDetail.raw_output)}
          </Typography.Paragraph>
        </details>
        <details><summary>规范化输出</summary>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {outputText(visibleDetail.normalized_output)}
          </Typography.Paragraph>
        </details>
      </Space>}
    </Card>
  )
}
