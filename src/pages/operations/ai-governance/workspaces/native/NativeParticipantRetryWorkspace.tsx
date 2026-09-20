import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, Input, Space, Typography } from 'antd'
import { getParticipantExecution, getParticipantRetryReceipt, retryParticipant } from '@/api/path/aiWorkflow'
import type { ParticipantExecution, ParticipantRetryReceipt } from '@/api/path/aiWorkflow'
import { definitelyRejected, newCommandID, validReason, validUUID } from './commands'

type Pending = { sessionID: string; commandID: string; runID: string; version: number }
const pendingKey = (owner: string) => `qs-ai:participant-retry:v1:${encodeURIComponent(owner)}`
function loadPending(owner: string): Pending | null {
  const raw = sessionStorage.getItem(pendingKey(owner))
  if (!raw) return null
  const value: Pending = JSON.parse(raw)
  if (!validUUID(value.sessionID || '') || !validUUID(value.commandID || '') ||
    !validUUID(value.runID || '') || !Number.isSafeInteger(value.version) || value.version < 1)
    throw new Error('invalid pending record')
  return value
}
function validateReceipt(value: ParticipantRetryReceipt, pending: Pending): void {
  if (value.session_id !== pending.sessionID || !validUUID(value.run_id) || value.run_id === pending.runID ||
    value.version !== pending.version + 1 || value.status !== 'queued') throw new Error('receipt mismatch')
}
function rejected(error: unknown): boolean {
  if (definitelyRejected(error)) return true
  const value = error as { status?: number; response?: { status?: number } } | null
  return (value?.status || value?.response?.status) === 409
}
const statuses: Record<string, string> = {
  queued: '排队中', running: '执行中', awaiting_answer: '等待回答', blocked: '已阻塞', cancelled: '已取消', completed: '已完成'
}
export function NativeParticipantRetryWorkspace({ owner, initialSessionID = '' }: { owner: string; initialSessionID?: string }): JSX.Element {
  const [sessionID, setSessionID] = useState(initialSessionID)
  const [current, setCurrent] = useState<ParticipantExecution | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [receipt, setReceipt] = useState<ParticipantRetryReceipt | null>(null)
  const [storageError, setStorageError] = useState(false)
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [risk, setRisk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const live = useRef(true)
  const working = useRef(false)
  useEffect(() => {
    live.current = true
    try { setPending(loadPending(owner)) } catch { setStorageError(true) }
    return () => { live.current = false }
  }, [owner])
  const locked = busy || Boolean(pending) || storageError
  const begin = () => {
    if (working.current) return false
    working.current = true
    setBusy(true)
    setMessage('')
    return true
  }
  const end = () => { working.current = false; if (live.current) setBusy(false) }
  const clearPending = () => {
    sessionStorage.removeItem(pendingKey(owner))
    setPending(null)
  }
  const read = async () => {
    if (locked || !validUUID(sessionID) || !begin()) return
    setCurrent(null)
    setReceipt(null)
    setConfirmed(false)
    setRisk(false)
    try {
      const [error, response] = await getParticipantExecution(sessionID)
      if (!live.current) return
      if (error || !response?.data || response.data.session_id !== sessionID ||
        !validUUID(response.data.run_id) || !Number.isSafeInteger(response.data.version) || response.data.version < 1)
        throw new Error('invalid state')
      setCurrent(response.data)
    } catch { if (live.current) setMessage('无法读取执行状态，请检查管理权限与会话编号。') }
    finally { end() }
  }
  const retry = async () => {
    if (locked || !current?.can_retry || !confirmed || !validReason(reason) ||
      current.retry_provider_invocations !== 1 || (current.unknown_result_risk && !risk) || !begin()) return
    try {
      const intent = { sessionID: current.session_id, runID: current.run_id, version: current.version, commandID: newCommandID() }
      try {
        sessionStorage.setItem(pendingKey(owner), JSON.stringify(intent))
        setPending(intent)
      } catch { setStorageError(true); return }
      const [error, response] = await retryParticipant(intent.sessionID, {
        command_id: intent.commandID, expected_run_id: intent.runID, expected_version: intent.version,
        reason: reason.trim(), confirm: true, expected_provider_invocations: 1, accept_result_unknown_risk: risk
      })
      if (!live.current) return
      setCurrent(null)
      setConfirmed(false)
      setRisk(false)
      if (error) {
        if (rejected(error)) {
          clearPending()
          setMessage('重试未被接受，请重新查询状态、权限和额度后再决定。')
          return
        }
        throw new Error('unknown outcome')
      }
      if (!response?.data) throw new Error('missing receipt')
      validateReceipt(response.data, intent)
      setReceipt(response.data)
      clearPending()
    } catch { if (live.current) setMessage('命令结果尚未确认，请查询原命令回执。不要重复创建重试。') }
    finally { end() }
  }
  const recover = async () => {
    if (!pending || busy || storageError || !begin()) return
    try {
      const [error, response] = await getParticipantRetryReceipt(pending.commandID)
      if (!live.current) return
      if (error || !response?.data) throw new Error('receipt unavailable')
      validateReceipt(response.data, pending)
      setSessionID(pending.sessionID)
      setCurrent(null)
      setReceipt(response.data)
      clearPending()
    } catch { if (live.current) setMessage('暂时无法确认原命令；未找到回执也不代表命令未提交。请保留编号继续核对。') }
    finally { end() }
  }
  return <Card title="参与者执行与重试" style={{ marginTop: 16 }}>
    {storageError && <Alert type="error" message="无法保存或读取待核对命令，已暂停提交。请先恢复浏览器存储并核对原命令。" />}
    <Space>
      <Input aria-label="参与者会话编号" placeholder="AI 会话 UUID" value={sessionID} disabled={locked}
        onChange={(e) => { setSessionID(e.target.value.trim()); setCurrent(null); setReceipt(null); setConfirmed(false); setRisk(false) }} />
      <Button disabled={locked || !validUUID(sessionID)} onClick={read}>查询参与者执行</Button>
    </Space>
    {message && <Alert type="warning" showIcon message={message} />}
    {pending && <Alert type="warning" message="存在待确认的重试命令" description={<>
      <Typography.Paragraph copyable>{pending.commandID}</Typography.Paragraph>
      <Button disabled={busy || storageError} onClick={recover}>查询原重试回执</Button>
    </>} />}
    {receipt && <Alert type="success" message="重试已受理，等待执行"
      description={`执行编号：${receipt.run_id}；受理版本：${receipt.version}。请查询当前状态确认后续结果。`} />}
    {current && <>
      <Descriptions column={1} size="small" style={{ marginTop: 16 }}>
        <Descriptions.Item label="原业务请求">{current.request_id}</Descriptions.Item>
        <Descriptions.Item label="当前执行">{current.run_id}</Descriptions.Item>
        <Descriptions.Item label="状态">{statuses[current.status] || current.status}</Descriptions.Item>
        <Descriptions.Item label="版本">{current.version}</Descriptions.Item>
        <Descriptions.Item label="失败原因">{current.failure_code || '无'}</Descriptions.Item>
        <Descriptions.Item label="模型调用">{current.model_call_status || '尚未调用'}</Descriptions.Item>
        {current.source_run_id && <Descriptions.Item label="上次执行">{current.source_run_id}</Descriptions.Item>}
      </Descriptions>
      {current.can_retry && <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Paragraph>重试保留原报告、配置和历史，预留一次新的模型调用额度；原调用费用不会退还。服务端会再次检查状态、权限和额度。</Typography.Paragraph>
        <Input.TextArea aria-label="参与者重试理由" value={reason} disabled={locked}
          onChange={(e) => { setReason(e.target.value); setConfirmed(false) }} />
        <Checkbox checked={confirmed} disabled={locked} onChange={(e) => setConfirmed(e.target.checked)}>确认新增一次模型调用及费用</Checkbox>
        {current.unknown_result_risk && <Checkbox checked={risk} disabled={locked} onChange={(e) => setRisk(e.target.checked)}>
          原调用结果未知，我接受重复调用和重复费用风险
        </Checkbox>}
        <Button disabled={locked || !confirmed || !validReason(reason) || (current.unknown_result_risk && !risk)} onClick={retry}>确认重试原解读</Button>
      </Space>}
    </>}
  </Card>
}
