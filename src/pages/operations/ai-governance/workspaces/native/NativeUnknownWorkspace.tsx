import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, Input, Radio, Select, Space, Typography } from 'antd'
import type { NativeEvaluationState, NativeResolutionCommand, NativeResolutionDecision, NativeUnknownIndex } from '@/api/path/aiWorkflow'
import { validReason } from './commands'

export function NativeUnknownWorkspace({ run, view, locked, load, resolve }: {
  run: NativeEvaluationState
  view: NativeUnknownIndex | null
  locked: boolean
  load(): Promise<void>
  resolve(command: NativeResolutionCommand): Promise<void>
}): JSX.Element | null {
  const [executionID, setExecutionID] = useState('')
  const [decision, setDecision] = useState<NativeResolutionDecision>('cancel_run')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [risk, setRisk] = useState(false)
  useEffect(() => {
    setExecutionID('')
    setConfirmed(false)
    setRisk(false)
  }, [view])
  useEffect(() => { setConfirmed(false); setRisk(false) }, [executionID, decision])
  if (!run.unresolved_result_unknown_count) return null
  const target = view?.executions.find((item) => item.execution_id === executionID)
  const canSubmit = !locked && view?.can_resolve && target && validReason(reason) && confirmed && risk &&
    (decision === 'cancel_run' || target.replacement_allowed)
  return (
    <Card title="待核对的模型调用" size="small" style={{ marginTop: 16 }}>
      <Alert type="warning" showIcon message="调用已失去确定结果，请先核对再处置。"
        description="未收到结果不代表供应商没有执行或收费。批准替代调用可能产生重复执行与额外费用；取消任务也不会撤销已发生的供应商调用。" />
      <Button style={{ marginTop: 12 }} disabled={locked || !run.creation} onClick={load}>读取待核对调用</Button>
      {view && <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
        {!view.can_resolve && <Alert type="info" message="当前任务仅可审计，不接受新的处置。" />}
        <Select<string> aria-label="待核对调用" placeholder="选择需要核对的原调用" value={executionID || undefined}
          disabled={locked} style={{ width: '100%' }} onChange={setExecutionID}>
          {view.executions.map((item) => <Select.Option key={item.execution_id} value={item.execution_id}>
            {`${item.kind === 'generation' ? '生成' : '语义评测'} · ${item.case_id} · 槽位 ${item.slot_ordinal} · 第 ${item.execution_ordinal} 次`}
          </Select.Option>)}
        </Select>
        {target && <>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="原调用标识"><Typography.Text copyable>{target.execution_id}</Typography.Text></Descriptions.Item>
            <Descriptions.Item label="开始时间">{target.started_at}</Descriptions.Item>
            <Descriptions.Item label="记录结束时间">{target.finished_at}</Descriptions.Item>
            <Descriptions.Item label="失败分类">{target.failure_code}</Descriptions.Item>
            <Descriptions.Item label="该目标调用预算">{target.target_execution_count} / {target.target_execution_limit}</Descriptions.Item>
            <Descriptions.Item label="该阶段调用预算">{target.stage_execution_count} / {target.stage_execution_limit}</Descriptions.Item>
            <Descriptions.Item label="本次发送记录数">{target.provider_call_count}（不是账单确认）</Descriptions.Item>
          </Descriptions>
          {view.can_resolve && <>
            <Radio.Group aria-label="处置决定" value={decision} disabled={locked} onChange={(event) => setDecision(event.target.value)}>
              <Space direction="vertical">
                <Radio value="cancel_run">取消整个评测任务</Radio>
                <Radio value="authorize_replacement" disabled={!target.replacement_allowed}>批准该调用的替代执行</Radio>
              </Space>
            </Radio.Group>
            {!target.replacement_allowed && <Typography.Paragraph type="secondary">当前版本不允许申请替代执行，请核对预算及任务状态。</Typography.Paragraph>}
            <Input.TextArea aria-label="调用处置理由" value={reason} onChange={(event) => setReason(event.target.value)}
              disabled={locked} placeholder="记录核对依据和处置原因" rows={2} />
            <Checkbox checked={risk} disabled={locked} onChange={(event) => setRisk(event.target.checked)}>我已了解原调用结果未知及重复调用、额外费用的风险</Checkbox>
            <Checkbox checked={confirmed} disabled={locked} onChange={(event) => setConfirmed(event.target.checked)}>我确认对选中的原调用执行上述处置</Checkbox>
            <Button type="primary" danger={decision === 'cancel_run'} disabled={!canSubmit}
              onClick={() => resolve({ expected_version: run.version,
                execution_id: target.execution_id,
                decision,
                reason: reason.trim(),
                confirm: true,
                acknowledged_duplicate_call_and_cost_risk: true })}>
              确认处置
            </Button>
          </>}
        </>}
      </Space>}
    </Card>
  )
}
