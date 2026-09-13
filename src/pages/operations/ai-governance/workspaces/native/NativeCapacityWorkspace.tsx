import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Descriptions, Table, Typography } from 'antd'
import { getNativeEvaluationCapacity } from '@/api/path/aiWorkflow'
import type { NativeEvaluationCapacity } from '@/api/path/aiWorkflow'

export function NativeCapacityWorkspace({ disabled }: { disabled: boolean }): JSX.Element {
  const [value, setValue] = useState<NativeEvaluationCapacity | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const live = useRef(true)
  const running = useRef(false)
  useEffect(() => { live.current = true; return () => { live.current = false } }, [])
  const read = async () => {
    if (disabled || running.current) return
    running.current = true
    setBusy(true)
    setError('')
    setValue(null)
    try {
      const [failure, response] = await getNativeEvaluationCapacity()
      if (!live.current) return
      if (failure || !response?.data) throw new Error('无法读取机构评测容量，请确认管理权限后重试。')
      setValue(response.data)
    } catch {
      if (live.current) setError('无法读取机构评测容量，请确认管理权限后重试。')
    } finally {
      running.current = false
      if (live.current) setBusy(false)
    }
  }
  return <div style={{ marginTop: 12 }}>
    <Button disabled={disabled} loading={busy} onClick={read}>查询评测容量</Button>
    {error && <Alert showIcon type="error" message={error} />}
    {value && <>
      <Descriptions size="small" column={2} style={{ marginTop: 12 }}>
        <Descriptions.Item label="预算日期（UTC）">{value.budget_day}</Descriptions.Item>
        <Descriptions.Item label="活动评测任务">{value.active_runs} / {value.max_active_runs}</Descriptions.Item>
        <Descriptions.Item label="今日剩余调用预算">{value.remaining_provider_calls} / {value.daily_provider_calls}</Descriptions.Item>
        <Descriptions.Item label="可预留完整任务数">{value.remaining_full_runs}</Descriptions.Item>
      </Descriptions>
      <Typography.Paragraph type="secondary">
        容量是查询时的快照，启动时会再次检查。每个完整任务最多预留 {value.full_run_provider_calls} 次调用，取消不退回当日预留预算。
      </Typography.Paragraph>
      <details><summary>查看预算预留记录（共 {value.reservation_count} 条）</summary>
        {value.reservations_truncated && <Typography.Paragraph>仅展示最近 100 条，预算合计包含全部记录。</Typography.Paragraph>}
        <Table size="small" rowKey="run_id" pagination={false} dataSource={value.reservations} columns={[
          { title: '任务', dataIndex: 'run_id' }, { title: '预留调用数', dataIndex: 'provider_calls' },
          { title: '操作人', dataIndex: 'requested_by' }, { title: '预留时间', dataIndex: 'reserved_at' }
        ]} />
      </details>
    </>}
  </div>
}
