import { Alert, Card, Timeline, Typography } from 'antd'
import type { RuntimeTimeline as Evidence } from '@/api/path/aiWorkflow/runtime'
import { formatTime } from './state'
const names: Record<string, string> = {
  request_accepted: 'QS 接受请求',
  result_received: 'QS 接收当前结果版本',
  execution_claimed: '执行进程接手任务',
  model_dispatched: '记录模型调用意图（不证明供应商已接收）',
  model_response_received: '模型响应已持久保存',
  model_unknown: '模型调用结果未知',
  model_failed: '模型调用失败',
  result_staged: '结果已进入可靠投递队列',
  delivery_confirmed: 'QS 已确认本次投递'
}
export function RuntimeTimeline({ value }: { value: Evidence | null }): JSX.Element {
  return (
    <Card title="跨服务执行轨迹" style={{ marginTop: 16 }}>
      {!value ? (
        <Alert type="warning" message="轨迹暂不可读取，保留上方已知状态。" />
      ) : (
        <>
          <Typography.Paragraph>
            观测于 {formatTime(value.observed_at)}。旧记录或过期诊断可能缺失，仅展示已保存事实。
          </Typography.Paragraph>
          {value.partial && <Alert type="warning" message="AI 轨迹暂不完整。" />}
          <Timeline>
            {value.events.map((event) => (
              <Timeline.Item key={event.id}>
                <Typography.Text strong>{names[event.kind] || event.kind}</Typography.Text> ·{' '}
                {formatTime(event.at)}
                {(event.version || event.attempt) && (
                  <div>{event.version ? `结果版本 ${event.version}` : `执行尝试 ${event.attempt}`}</div>
                )}
                {event.run_id && (
                  <Typography.Paragraph type="secondary">执行：{event.run_id}</Typography.Paragraph>
                )}
                {event.invocation_id && (
                  <Typography.Paragraph type="secondary">
                    调用：{event.invocation_id}
                  </Typography.Paragraph>
                )}
              </Timeline.Item>
            ))}
          </Timeline>
        </>
      )}
    </Card>
  )
}
