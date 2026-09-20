import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Space, Tag } from 'antd'
import { getRuntimeHealth } from '@/api/path/aiWorkflow/runtime'
import type { RuntimeHealth as Health } from '@/api/path/aiWorkflow/runtime'
import { formatTime, readError } from './state'
const names: Record<string, string> = {
  grpc: '内部通信',
  generation: '用户生成',
  evaluation: '配置评测',
  delivery: '结果投递',
  readiness: '服务就绪',
  http: '健康接口',
  diagnostic_retention: '诊断记录过期清理',
  runtime: '执行进程',
  queued_jobs: '等待执行',
  expired_leases: '待恢复租约',
  pending_deliveries: '等待回传',
  unknown_model_results: '结果未知调用'
}
const states: Record<string, string> = {
  running: '运行中',
  stopped: '已停止',
  disabled: '未启用',
  ready: '就绪',
  not_ready: '未就绪',
  unobserved: '未观测'
}
export function RuntimeHealth(): JSX.Element {
  const [value, setValue] = useState<Health | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const live = useRef(true),
    loading = useRef(false)
  useEffect(() => {
    return () => {
      live.current = false
    }
  }, [])
  const read = async () => {
    if (loading.current) return
    loading.current = true
    setBusy(true)
    setError('')
    try {
      const [failure, result] = await getRuntimeHealth()
      if (!live.current) return
      if (failure || !result?.data) throw failure || new Error()
      setValue(result.data)
    } catch (e) {
      if (live.current) {
        setValue(null)
        setError(readError(e))
      }
    } finally {
      loading.current = false
      if (live.current) setBusy(false)
    }
  }
  return (
    <Card
      title="服务状态与积压"
      style={{ marginBottom: 16 }}
      extra={
        <Button onClick={read} loading={busy}>
          读取服务状态
        </Button>
      }
    >
      {!value && !error && <span>按需读取组件与当前机构的积压，不调用模型。</span>}
      {error && <Alert type="error" message={error} />}
      {value && (
        <>
          {value.partial && <Alert type="warning" message="部分组件不可观测，不能据此判断积压为零。" />}
          <Space wrap>
            {Object.entries(value.ai?.components || {}).map(([key, state]) => (
              <Tag key={key}>
                {names[key] || key}：{states[state] || state}
              </Tag>
            ))}
          </Space>
          <Descriptions size="small" column={2}>
            {Object.entries(value.ai?.backlog || {}).map(([key, count]) => (
              <Descriptions.Item key={key} label={names[key] || key}>
                {count}
              </Descriptions.Item>
            ))}
            {value.qs && (
              <>
                <Descriptions.Item label="QS 待送命令">{value.qs.pending_commands}</Descriptions.Item>
                <Descriptions.Item label="尚未确认 AI 接收">
                  {value.qs.requests_without_session}
                </Descriptions.Item>
              </>
            )}
            <Descriptions.Item label="观测时间">
              {formatTime(value.ai?.observed_at || value.observed_at)}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Card>
  )
}
