import React, { useEffect, useRef, useState } from 'react'
import { Alert, Button, Drawer, Form, Input, Space, Typography } from 'antd'
import {
  getSystemGovernanceDeliveryResolution,
  postSystemGovernanceDeliveryResolution
} from '@/api/path/systemGovernance'
import type {
  ActionRunResponse,
  DeliveryReplayReview,
  DeliveryReplayReviewTarget,
  DeliveryResolutionRequest
} from '@/api/path/systemGovernance'
import { extractErrorMessage } from '@/utils/apiError'

const { Text } = Typography
const requestStoragePrefix = 'qs-delivery-resolution:'

interface DeliveryResolutionDrawerProps {
  review: DeliveryReplayReview | null
  target: DeliveryReplayReviewTarget | null
  visible: boolean
  onClose: () => void
  onResolved: () => void
}

const newRequestID = (): string => {
  const bytes = new Uint8Array(16)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')
}

const canResolve = (review: DeliveryReplayReview | null, target: DeliveryReplayReviewTarget | null): boolean =>
  Boolean(review && target &&
    ['failed', 'timeout', 'pending_reconciliation'].includes(review.status) &&
    target.disposition === 'automatic' && target.linked_to_request &&
    target.event_type === 'interpretation.report.generated' &&
    target.event_id && target.delivery_attempts && target.delivery_attempts > 0)

export const DeliveryResolutionDrawer: React.FC<DeliveryResolutionDrawerProps> = ({
  review, target, visible, onClose, onResolved
}) => {
  const [form] = Form.useForm()
  const targetKey = review && target ? `${review.request_id}:${target.dead_letter_id}` : ''
  const lastTargetKey = useRef('')
  const [requestID, setRequestID] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<ActionRunResponse | null>(null)
  const [attemptedCommand, setAttemptedCommand] = useState<DeliveryResolutionRequest | null>(null)
  const [restoredAttempt, setRestoredAttempt] = useState(false)

  useEffect(() => {
    if (!visible || !targetKey) return
    if (lastTargetKey.current !== targetKey) {
      lastTargetKey.current = targetKey
      let savedID = ''
      try { savedID = window.sessionStorage.getItem(`${requestStoragePrefix}${targetKey}`) || '' } catch { /* Browser storage may be unavailable. */ }
      const nextID = savedID || newRequestID()
      setRequestID(nextID)
      form.setFieldsValue({ request_id: nextID, reason: '', confirmation: '' })
      setReceipt(null)
      setAttemptedCommand(null)
      setRestoredAttempt(Boolean(savedID))
      setError(savedID ? '此浏览器会话曾提交该结案编号。请先查询回执；原输入已不在页面中，不可新建编号或盲目重试。' : '')
    }
  }, [form, targetKey, visible])

  const checkReceipt = async (id: string): Promise<boolean> => {
    const [requestError, response] = await getSystemGovernanceDeliveryResolution(id)
    if (!requestError && response?.data?.status === 'succeeded') {
      setReceipt(response.data)
      setError('')
      onResolved()
      return true
    }
    return false
  }

  const submit = async () => {
    if (!canResolve(review, target) || !review || !target || !target.event_id || !target.delivery_attempts ||
      receipt || submitting || checking || (restoredAttempt && !attemptedCommand)) return
    let command = attemptedCommand
    if (!command) {
      let values: { request_id: string, reason: string }
      try { values = await form.validateFields() } catch { return }
      command = {
        request_id: String(values.request_id).trim(),
        original_replay_request_id: review.request_id,
        dead_letter_id: target.dead_letter_id,
        event_id: target.event_id,
        expected_delivery_attempts: target.delivery_attempts,
        reason: String(values.reason).trim(),
        confirm: true
      }
      setAttemptedCommand(command)
      try {
        window.sessionStorage.setItem(`${requestStoragePrefix}${targetKey}`, command.request_id)
      } catch {
        // The visible ID remains available to copy.
      }
    }
    setRequestID(command.request_id)
    setSubmitting(true)
    setError('')
    const [requestError, response] = await postSystemGovernanceDeliveryResolution(command)
    setSubmitting(false)
    if (!requestError && response?.data?.status === 'succeeded') {
      setReceipt(response.data)
      onResolved()
      return
    }
    setChecking(true)
    const committed = await checkReceipt(command.request_id)
    setChecking(false)
    if (!committed) {
      const failure = extractErrorMessage(requestError, '结案结果尚未确认')
      setError(`${failure}。请保留本次结案编号，先查询回执；本页面只允许用锁定的编号和原输入重试。`)
    }
  }

  const recheck = async () => {
    const id = requestID.trim()
    if (!id) return
    setChecking(true)
    const committed = await checkReceipt(id)
    setChecking(false)
    if (!committed) setError('尚未读到已提交的结案回执。不要据此判断原操作没有提交，也不要重新投递消息。')
  }

  return (
    <Drawer title="按业务事实核实传输死信" visible={visible} width={560} onClose={onClose} forceRender
      footer={<Space>
        <Button onClick={onClose}>关闭</Button>
        <Button loading={checking} onClick={() => void recheck()} disabled={!requestID}>查询结案回执</Button>
        <Button type="primary" loading={submitting} disabled={!canResolve(review, target) || Boolean(receipt) ||
          checking || (restoredAttempt && !attemptedCommand)} onClick={() => void submit()}>
          {attemptedCommand ? '按原编号重试结案' : '核实后结案'}
        </Button>
      </Space>}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert type="warning" showIcon message="不会重新投递消息"
          description="服务端仅对报告生成事件核验当前报告、测评和关注结果；证据不全、原操作仍运行或身份不符时拒绝结案。此操作会写入独立审计。" />
        {review && target ? <Space direction="vertical" size={2}>
          <Text>原重放编号：<Text code copyable>{review.request_id}</Text></Text>
          <Text>死信记录：<Text code>#{target.dead_letter_id}</Text>；原事件：<Text code copyable>{target.event_id || '-'}</Text></Text>
          <Text>事件类型：{target.event_type || '-'}；投递次数：{target.delivery_attempts || '-'}</Text>
        </Space> : null}
        {receipt ? <Alert type="success" showIcon message="结案已提交"
          description={<Space direction="vertical" size={0}>
            <Text>结案编号：<Text code copyable>{receipt.request_id}</Text></Text>
            <Text>证据：{String(receipt.result?.evidence_reference || '已记录在结案审计中')}</Text>
          </Space>} /> : null}
        {error ? <Alert type="error" showIcon message={error} /> : null}
        <Form form={form} layout="vertical">
          <Form.Item name="request_id" label="本次结案编号"
            rules={[{ required: true, whitespace: true, message: '请保留稳定的结案编号' }]}
            extra="响应丢失时先用此编号查回执；重试必须沿用同一编号及原输入。">
            <Input readOnly={Boolean(attemptedCommand) || restoredAttempt} onChange={(event) => setRequestID(event.target.value)} />
          </Form.Item>
          <Form.Item name="reason" label="业务核实说明"
            rules={[{ required: true, whitespace: true, message: '请填写核实说明' }]}>
            <Input.TextArea rows={3} readOnly={Boolean(attemptedCommand) || restoredAttempt}
              placeholder="说明已核对的报告与关注业务事实" />
          </Form.Item>
          <Form.Item name="confirmation" label="确认文本"
            rules={[{ validator: (_, value) => value === '确认结案' ? Promise.resolve() : Promise.reject(new Error('请输入“确认结案”')) }]}>
            <Input readOnly={Boolean(attemptedCommand) || restoredAttempt} placeholder="输入：确认结案" />
          </Form.Item>
        </Form>
      </Space>
    </Drawer>
  )
}
