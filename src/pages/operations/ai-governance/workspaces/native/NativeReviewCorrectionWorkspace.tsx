import { useEffect, useState } from 'react'
import { Alert, Button, Checkbox, Input, Radio, Space, Typography } from 'antd'
import type { NativeCandidateEvidence, NativeEvaluationState, NativeReviewCorrectionCommand, NativeReviewRecord } from '@/api/path/aiWorkflow'
import { newCommandID, validReason } from './commands'
import { fingerprint } from './evaluationValidation'
import { reviewRecords } from './reviewValidation'

export function NativeReviewCorrectionWorkspace({ run, detail, owner, locked, submit, onDirty }: {
  run: NativeEvaluationState
  detail: NativeCandidateEvidence
  owner: string
  locked: boolean
  submit(command: NativeReviewCorrectionCommand): Promise<void>
  onDirty?(value: boolean): void
}): JSX.Element {
  const [selected, setSelected] = useState<NativeReviewRecord | null>(null)
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => { onDirty?.(Boolean(selected && (reason || confirmed))) }, [selected, reason, confirmed, onDirty])
  const records = reviewRecords(run.reviews).filter((r) => r.candidate_id === detail.candidate_id)
  const bodyFingerprint = (detail.evidence as { candidate?: { normalized_output_fingerprint?: string } }).candidate?.normalized_output_fingerprint
  const current = run.review_fingerprints?.find((r) => r.candidate_id === selected?.candidate_id && r.role === selected?.role)?.fingerprint
  const blocked = locked || run.status !== 'awaiting_review' || run.version !== detail.version ||
    run.run_id !== detail.run_id || !run.creation || !bodyFingerprint || !fingerprint(bodyFingerprint)
  const available = (r: NativeReviewRecord) => !blocked && r.reviewer === `user:${owner}` && !r.semantic_review &&
    Boolean(run.review_fingerprints?.some((f) => f.candidate_id === r.candidate_id && f.role === r.role && fingerprint(f.fingerprint))) &&
    (run.review_corrections || []).filter((c) => c.review.candidate_id === r.candidate_id && c.review.role === r.role).length < 3
  return <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
    {records.map((r) => <Button key={r.role} disabled={!available(r)} onClick={() => {
      setSelected(r); setDecision(r.decision); setReason(''); setConfirmed(false)
    }}>更正决定：{r.role === 'assessment_semantics' ? '内容质量' : '安全与产品'}</Button>)}
    {selected && <>
      <Alert type="info" message="只更正自己的审核意见，保留原记录与更正历史。不会修改候选、重新调用模型或自动批准发布。" />
      <Typography.Text>原决定：{selected.decision === 'approve' ? '通过' : '拒绝'}；原理由：{selected.reason}</Typography.Text>
      <Radio.Group aria-label="更正后的决定" value={decision} disabled={blocked} onChange={(e) => {
        setDecision(e.target.value); setConfirmed(false)
      }}><Radio value="approve">通过并记录意见</Radio><Radio value="reject">拒绝</Radio></Radio.Group>
      <Input.TextArea aria-label="审核更正理由" value={reason} disabled={blocked} placeholder="说明重新核对依据及更正原因，可记录非阻塞改进意见"
        onChange={(e) => { setReason(e.target.value); setConfirmed(false) }} />
      <Checkbox checked={confirmed} disabled={blocked} onChange={(e) => setConfirmed(e.target.checked)}>
        我已重新核对原候选、冻结事实与引用，确认更正自己的决定
      </Checkbox>
      <Space>
        <Button type="primary" disabled={!available(selected) || !current || !confirmed || !validReason(reason)} onClick={() => {
          if (!current || !bodyFingerprint) return
          submit({ command_id: newCommandID(), expected_version: run.version, candidate_id: selected.candidate_id,
            role: selected.role, previous_review_fingerprint: current, candidate_output_fingerprint: bodyFingerprint,
            decision, reason: reason.trim(), confirm: true })
        }}>提交审核更正</Button>
        <Button disabled={locked} onClick={() => { setSelected(null); setReason(''); setConfirmed(false) }}>关闭更正表单</Button>
      </Space>
    </>}
    {(run.review_corrections || []).filter((c) => c.review.candidate_id === detail.candidate_id).length > 0 &&
      <details><summary>不可变审核更正历史</summary>
        {(run.review_corrections || []).filter((c) => c.review.candidate_id === detail.candidate_id).map((c) =>
          <Typography.Paragraph key={c.command_id}>
            {c.review.reviewer} · {c.previous_review.decision} → {c.review.decision} · {c.review.reviewed_at}<br />
            原理由：{c.previous_review.reason}<br />更正理由：{c.review.reason}
          </Typography.Paragraph>)}
      </details>}
  </Space>
}
