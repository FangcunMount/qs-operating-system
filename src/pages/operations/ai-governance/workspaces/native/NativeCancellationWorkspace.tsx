import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, Input, Space, Typography } from 'antd'
import type { NativeEvaluationState } from '@/api/path/aiWorkflow'
import { validReason } from './commands'
import { cancellationReceipt, canRequestCancellation } from './cancellationValidation'

export function NativeCancellationWorkspace({ run, locked, cancel }: {
  run: NativeEvaluationState
  locked: boolean
  cancel(reason: string, confirm: boolean, discard: boolean): Promise<void>
}): JSX.Element {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => { setConfirmed(false) }, [run.run_id, run.version])
  if (run.cancel_draining) return <Alert style={{ marginTop: 16 }} type="info" showIcon
    message="停止请求已接受，正在排空"
    description={`已停止新增调用；当前在途 ${run.active_call_count ?? '未知'} 个，待核对 ${run.unresolved_result_unknown_count} 个。已发送调用会继续保存结果，未知结果需核对后才能完成取消。`} />
  if (run.cancellation) {
    try {
      const receipt = cancellationReceipt(run)
      return <Card title={receipt.discard ? '评审已废弃' : '取消记录'} style={{ marginTop: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="操作人">{receipt.actor}</Descriptions.Item>
          <Descriptions.Item label="操作时间">{receipt.canceled_at}</Descriptions.Item>
          <Descriptions.Item label="操作理由">{receipt.reason}</Descriptions.Item>
          <Descriptions.Item label="操作前版本">{receipt.source_version}</Descriptions.Item>
          {receipt.execution_id && <Descriptions.Item label="已撤销的待发送执行">{receipt.execution_id}</Descriptions.Item>}
        </Descriptions>
        <Typography.Paragraph>原始输出、审核与复审记录继续保留，可在下方核对。</Typography.Paragraph>
      </Card>
    } catch { return <Alert type="error" message="取消回执暂不可核对，请重新查询任务。" /> }
  }
  if (!run.creation || ['approved', 'rejected', 'canceled'].includes(run.status)) return <></>
  if (run.unresolved_result_unknown_count > 0)
    return <Alert style={{ marginTop: 16 }} type="warning" showIcon message="存在结果未知的调用，请先核对并通过调用处置入口处理。" />
  if (!canRequestCancellation(run)) return <></>
  const discard = run.status === 'awaiting_review'
  return <Card title={discard ? '废弃本次评审' : '取消本次评测'} style={{ marginTop: 16 }}>
    <Typography.Paragraph>
      {discard ? '废弃后将结束本次评审，保留原模型输出、已有签名和复审历史。' :
        '服务端会重新核对执行状态。已经发送的模型调用不能从此处撤回，需等待完成或核对未知结果；已经产生的费用不会退回。'}
    </Typography.Paragraph>
    <Space direction="vertical" style={{ width: '100%' }}>
      <Input.TextArea aria-label="取消或废弃理由" rows={2} value={reason} disabled={locked}
        placeholder="说明结束本次任务的原因"
        onChange={(e) => { setReason(e.target.value); setConfirmed(false) }} />
      <Checkbox checked={confirmed} disabled={locked} onChange={(e) => setConfirmed(e.target.checked)}>
        {discard ? '我确认废弃本次评审并保留原始证据' : '我确认取消本次评测并保留原始证据'}
      </Checkbox>
      <Button danger disabled={locked || !confirmed || !validReason(reason)} onClick={() => cancel(reason, confirmed, discard)}>
        {discard ? '确认废弃评审' : '确认取消评测'}
      </Button>
    </Space>
  </Card>
}
