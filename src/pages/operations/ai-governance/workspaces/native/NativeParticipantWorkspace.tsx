import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Input, Space, Table, Typography } from 'antd'
import { getNativeParticipantCapacity } from '@/api/path/aiWorkflow'
import type { ParticipantCapacity, ParticipantReservation } from '@/api/path/aiWorkflow'

export function NativeParticipantWorkspace(): JSX.Element {
  const [subject, setSubject] = useState('')
  const [assessment, setAssessment] = useState('')
  const [value, setValue] = useState<ParticipantCapacity | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const live = useRef(true)
  const running = useRef(false)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const read = async () => {
    if (running.current) return
    running.current = true
    setBusy(true)
    setError('')
    setValue(null)
    const querySubject = subject.trim()
    const queryAssessment = assessment.trim()
    try {
      const [failure, response] = await getNativeParticipantCapacity(querySubject, queryAssessment)
      if (!live.current) return
      if (failure || !response?.data) throw new Error('read failed')
      const result = response.data
      if ((result.subject?.identity || '') !== querySubject || (result.assessment?.identity || '') !== queryAssessment) {
        throw new Error('filter mismatch')
      }
      setValue(result)
    } catch {
      if (live.current) setError('无法读取参与者生成容量，请检查管理权限与查询条件后重试。')
    } finally {
      running.current = false
      if (live.current) setBusy(false)
    }
  }
  const usage = value ? [
    { key: 'org', name: '机构', ...value.organization },
    ...(value.subject ? [{ key: 'subject', name: '指定用户', ...value.subject }] : []),
    ...(value.assessment ? [{ key: 'assessment', name: '指定测评', ...value.assessment }] : [])
  ] : []
  const records = (rows: ParticipantReservation[]) => <Table size="small" rowKey="run_id" pagination={false} dataSource={rows} columns={[
    { title: '会话', dataIndex: 'session_id' }, { title: '执行', dataIndex: 'run_id' },
    { title: '用户', dataIndex: 'subject_id' }, { title: '测评', render: (_, row) => row.assessment_ids.join('、') },
    { title: '预算日期', dataIndex: 'budget_day' }, { title: '预留时间', dataIndex: 'reserved_at' }
  ]} />
  return <Card title="参与者生成容量">
    <Typography.Paragraph>机构、用户和测评均受日预算及活动名额限制。预算不足会返回阻塞结果；活动名额不足时继续排队。</Typography.Paragraph>
    <Space wrap>
      <Input aria-label="参与者主体标识" placeholder="用户主体标识（可选）" value={subject} disabled={busy} onChange={(e) => setSubject(e.target.value)} />
      <Input aria-label="参与者测评标识" placeholder="测评 ID（可选）" value={assessment} disabled={busy} onChange={(e) => setAssessment(e.target.value)} />
      <Button loading={busy} onClick={read}>查询生成容量</Button>
    </Space>
    {error && <Alert showIcon type="error" message={error} />}
    {value && <>
      <Typography.Paragraph style={{ marginTop: 12 }}>预算日期（UTC）：{value.budget_day}。页面展示查询时的容量，执行时仍会检查。</Typography.Paragraph>
      <Table size="small" rowKey="key" pagination={false} dataSource={usage} columns={[
        { title: '范围', dataIndex: 'name' }, { title: '标识', dataIndex: 'identity' },
        { title: '今日已预留', dataIndex: 'daily_reserved' }, { title: '今日剩余额度', dataIndex: 'daily_remaining' },
        { title: '活动占用', dataIndex: 'active' }, { title: '剩余活动名额', dataIndex: 'active_remaining' }
      ]} />
      <details><summary>机构当日预算记录</summary>
        {value.daily_truncated && <Typography.Paragraph>仅展示最近 100 条，汇总包含全部记录。</Typography.Paragraph>}
        {records(value.daily_reservations)}
      </details>
      <details><summary>机构当前活动占用</summary>
        {value.active_truncated && <Typography.Paragraph>仅展示最近 100 条，汇总包含全部记录。</Typography.Paragraph>}
        {records(value.active_reservations)}
      </details>
    </>}
  </Card>
}
