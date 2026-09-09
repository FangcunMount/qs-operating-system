import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Table, Tag, message, Popconfirm } from 'antd'
import { get, post } from '@/api/qsServer'
import { userStore } from '@/store/userStore'
import { observer } from 'mobx-react'

interface Progress {
  id: string
  testee_id: string
  questionnaire_code: string
  questionnaire_version: string
  origin_type: string
  origin_id?: string
  status: string
  submitted_at?: string
  evaluated_at?: string
  failed_at?: string
}
interface ProgressPage { items: Progress[]; total: number; page: number; page_size: number }

const statusLabels: Record<string, string> = {
  pending: '待提交', submitted: '已提交', evaluated: '已完成', failed: '处理失败'
}
const renderStatus = (value: string) => <Tag>{statusLabels[value] || value}</Tag>

// This page consumes the dedicated progress DTO. It never requests a full
// assessment/report then attempts to hide its clinical fields in the browser.
const AssessmentProgress: React.FC = () => {
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [result, setResult] = useState<ProgressPage>({ items: [], total: 0, page: 1, page_size: 20 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const requestVersion = useRef(0)
  const [retrying, setRetrying] = useState<string>()
  const retry = async (id: string) => {
    setRetrying(id)
    try {
      const [failure] = await post(`/evaluations/assessments/${id}/retry`, undefined)
      if (failure) { message.error('重试未受理，请检查权限和测评状态。'); return }
      message.success('已提交重试请求')
      setRevision((value) => value + 1)
    } finally { setRetrying(undefined) }
  }
  const renderAction = (_: unknown, row: Progress) => {
    const caps = userStore.accessContext.capabilities
    const allowed = caps.has('org_admin') ||
      (row.origin_type === 'adhoc' && caps.has('evaluate_assessments')) ||
      (row.origin_type === 'plan' && caps.has('manage_evaluation_plans'))
    if (!allowed || row.status !== 'failed') return null
    return <Popconfirm title="重试此测评？" onConfirm={() => retry(row.id)}>
      <Button loading={retrying === row.id} disabled={Boolean(retrying)} size="small">重试</Button>
    </Popconfirm>
  }
  useEffect(() => {
    const version = ++requestVersion.current
    setLoading(true)
    setError(false)
    setResult({ items: [], total: 0, page, page_size: 20 })
    get<ProgressPage>('/evaluations/assessment-progress', { page, page_size: 20 })
      .then(([failure, response]) => {
        if (version !== requestVersion.current) return
        if (failure || !response?.data) { setError(true); return }
        setResult(response.data)
      })
      .catch(() => { if (version === requestVersion.current) setError(true) })
      .finally(() => { if (version === requestVersion.current) setLoading(false) })
    return () => { requestVersion.current++ }
  }, [page, revision])
  return <Card title="测评进度" extra={<Button onClick={() => setRevision(revision + 1)}>刷新</Button>}>
    {error && <Alert type="error" showIcon message="无法加载测评进度，请确认访问权限后重试。" />}
    <Table<Progress> rowKey="id" loading={loading} dataSource={result.items}
      pagination={{ current: page, pageSize: 20, total: result.total, showSizeChanger: false, onChange: setPage }}
      columns={[
        { title: '测评编号', dataIndex: 'id' },
        { title: '受试者编号', dataIndex: 'testee_id' },
        { title: '问卷', dataIndex: 'questionnaire_code' },
        { title: '来源', dataIndex: 'origin_type', render: (value: string) => value === 'plan' ? '计划测评' : '临时测评' },
        { title: '状态', dataIndex: 'status', render: renderStatus },
        { title: '提交时间', dataIndex: 'submitted_at' },
        { title: '操作', key: 'actions', render: renderAction }
      ]} />
  </Card>
}
export default observer(AssessmentProgress)
