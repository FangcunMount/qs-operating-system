import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Drawer, Form, Input, Select, Space, Typography } from 'antd'
import { getSystemGovernanceReminderResolution, postSystemGovernanceReminderResolution } from '@/api/path/systemGovernance'
import type { ActionRunResponse, ReminderResolutionRequest, ReminderReview } from '@/api/path/systemGovernance'

interface Props { review: ReminderReview | null, onClose: () => void, onResolved: () => void }

export const ReminderResolutionDrawer: React.FC<Props> = ({ review, onClose, onResolved }) => {
  const [form] = Form.useForm()
  const [command, setCommand] = useState<ReminderResolutionRequest | null>(null)
  const [requestID, setRequestID] = useState('')
  const [restored, setRestored] = useState(false)
  const [busy, setBusy] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const sending = review?.state === 'sending'
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<ActionRunResponse | null>(null)
  const key = review ? `qs-reminder-resolution:${review.delivery_id}:${review.opening_event_id}` : ''
  const currentKey = useRef(key)
  currentKey.current = key

  useEffect(() => {
    if (!key) return
    let saved = ''
    try { saved = window.sessionStorage.getItem(key) || '' } catch { /* Keep visible request ID if storage is unavailable. */ }
    const bytes = new Uint8Array(16)
    window.crypto.getRandomValues(bytes)
    const id = saved || Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
    setRequestID(id); setRestored(Boolean(saved)); setCommand(null); setReceipt(null); setBusy(false)
    setError(saved ? '此任务已有提交编号，请先查询回执；原输入丢失时不可盲目重试。' : '')
    setAcknowledged(false)
    form.resetFields()
    if (review?.state === 'sending') form.setFieldsValue({ finding: 'unknown_no_resend' })
  }, [key, form, review?.state])

  const matches = (result: ActionRunResponse, id: string, expected = command) => Boolean(review &&
    result.request_id === id && result.action_id === 'notifications.resolve_reminder' && result.status === 'succeeded' &&
    String(result.result?.delivery_id) === String(review.delivery_id) && result.result?.opening_event_id === review.opening_event_id &&
    result.result?.task_id === review.task_id && result.result?.automatic_resend === false &&
    (!expected || result.result?.finding === expected.finding))

  const check = async () => {
    const target = key
    setBusy(true)
    const [err, response] = await getSystemGovernanceReminderResolution(requestID)
    if (currentKey.current !== target) return
    setBusy(false)
    if (!err && response?.data && matches(response.data, requestID)) { setReceipt(response.data); setError(''); onResolved() }
    else setError('未取得匹配的结案回执。请保留原编号，不要补发提醒或重新创建结案编号。')
  }

  const submit = async () => {
    if (!review || (sending && !acknowledged) || busy || receipt || (restored && !command)) return
    let input = command
    if (!input) {
      let values: Pick<ReminderResolutionRequest, 'finding' | 'evidence_reference' | 'reason'>
      try { values = await form.validateFields() } catch { return }
      input = { ...values, request_id: requestID, delivery_id: review.delivery_id, task_id: review.task_id,
        opening_event_id: review.opening_event_id, expected_updated_at: review.updated_at, confirm: true,
        acknowledge_original_call_may_complete: sending && acknowledged }
      setCommand(input)
      try { window.sessionStorage.setItem(key, requestID) } catch { /* Visible ID remains available to copy. */ }
    }
    const target = key
    setBusy(true)
    const [err, response] = await postSystemGovernanceReminderResolution(input)
    if (currentKey.current !== target) return
    setBusy(false)
    if (!err && response?.data && matches(response.data, input.request_id, input)) { setReceipt(response.data); setError(''); onResolved() }
    else { setError('结案结果未确认。先查询原编号回执；只可保留同一编号及原输入重试。'); await check() }
  }

  const locked = busy || Boolean(command) || restored || Boolean(receipt)

  return <Drawer title="人工核对任务提醒" visible={Boolean(review)} onClose={onClose} width={560}
    footer={<Space><Button onClick={onClose}>关闭</Button><Button disabled={!requestID || busy} onClick={() => void check()}>查询回执</Button>
      <Button type="primary" loading={busy}
        disabled={!review || (sending && !acknowledged) || Boolean(receipt) || (restored && !command)}
        onClick={() => void submit()}>
        {command ? '按原输入重试结案' : '记录核对结果'}</Button></Space>}>
    <Alert type="warning" showIcon message="不会补发，也不会伪造平台成功"
      description="请先核对收件人或平台证据。仍无法确定时请选择结果未知；结案只记录人工发现并停止重发。原调用可能仍在进行；记录未知结果不会取消原调用，晚到平台回执仍会保留。" />
    {sending ? <Checkbox checked={acknowledged} disabled={locked} onChange={(event) => setAcknowledged(event.target.checked)}>
      我理解原调用仍可能完成；仅记录未知并禁止重发，不代表取消或发送成功</Checkbox> : null}
    <Typography.Paragraph copyable>{requestID}</Typography.Paragraph>
    {error ? <Alert type="error" message={error} /> : null}
    {receipt ? <Alert type="success" message="人工核对已记录，提醒不会补发" /> : null}
    <Form form={form} layout="vertical">
      <Form.Item name="finding" label="核对结果" rules={[{ required: true }]} >
        <Select disabled={locked || sending} options={[
          { value: 'recipient_received', label: '收件人确认收到' }, { value: 'platform_rejected', label: '平台明确拒绝' },
          { value: 'unknown_no_resend', label: '仍未知，停止重发' }]} /></Form.Item>
      <Form.Item name="evidence_reference" label="证据位置或记录编号"
        rules={[{ required: true, whitespace: true, max: 255 }]}><Input disabled={locked} maxLength={255} /></Form.Item>
      <Form.Item name="reason" label="核对说明" rules={[{ required: true, whitespace: true, max: 2000 }]} >
        <Input.TextArea disabled={locked} maxLength={2000} /></Form.Item>
    </Form>
  </Drawer>
}
