import { useState } from 'react'
import { Alert, Button, Card, Checkbox, Input, Radio, Select, Space, Table, Typography } from 'antd'
import type { NativeCandidateEvidence, NativeEvaluationState, NativeReviewCommand, NativeReviewRole } from '@/api/path/aiWorkflow'
import { validReason } from './commands'
import { contradictionTargets, reviewRecords, validSemanticReview } from './reviewValidation'

export function NativeReviewWorkspace({ run, detail, locked, submit }: {
  run: NativeEvaluationState
  detail: NativeCandidateEvidence
  locked: boolean
  submit(command: NativeReviewCommand, confirm: boolean): Promise<void>
}): JSX.Element {
  const [role, setRole] = useState<NativeReviewRole>('assessment_semantics')
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [exception, setException] = useState(false)
  const [ordinal, setOrdinal] = useState<number>()
  const [excerpt, setExcerpt] = useState('')
  const [exceptionReason, setExceptionReason] = useState('')
  let history
  try { history = reviewRecords(run.reviews).filter((r) => r.candidate_id === detail.candidate_id) }
  catch { return <Alert type="warning" message="审核历史暂不可读，请重新查询任务。" /> }
  const targets = contradictionTargets(detail, run)
  const target = targets.find((t) => t.ordinal === ordinal)
  const semantic = exception && target ? {
    policy_version: 'semantic-contradiction-dual-review/v1' as const,
    execution_id: target.executionID,
    output_fingerprint: target.outputFingerprint,
    assertion_ordinal: target.ordinal,
    original_detail: target.detail,
    candidate_excerpt: excerpt,
    reason: exceptionReason.trim()
  } : undefined
  const disabled = locked || !run.creation || run.status !== 'awaiting_review' ||
    detail.run_id !== run.run_id || detail.version !== run.version || history.some((r) => r.role === role)
  const ready = !disabled && confirmed && validReason(reason) && (!exception ||
    (decision === 'approve' && semantic && validSemanticReview(semantic) && detail.normalized_output.includes(excerpt)))
  return (
    <Card title="候选人工审核" style={{ width: '100%' }}>
      <Typography.Paragraph type="secondary">
        每个候选需要两位不同操作者分别完成两类审核。审核记录不能覆盖，审核通过后仍需最终门槛确认和发布。
      </Typography.Paragraph>
      <Table pagination={false} size="small" rowKey="role" dataSource={history}
        locale={{ emptyText: '此候选尚无人工审核' }} columns={[
          { title: '审核职责', dataIndex: 'role', render: (v) => v === 'assessment_semantics' ? '测评语义' : '安全与产品' },
          { title: '操作者', dataIndex: 'reviewer' },
          { title: '决定', dataIndex: 'decision', render: (v) => v === 'approve' ? '通过' : '拒绝' },
          { title: '理由', dataIndex: 'reason' }, { title: '时间', dataIndex: 'reviewed_at' }
        ]} />
      <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
        <Radio.Group aria-label="审核职责" value={role} disabled={locked} onChange={(e) => { setRole(e.target.value); setConfirmed(false) }}>
          <Radio value="assessment_semantics">测评语义</Radio><Radio value="safety_product">安全与产品</Radio>
        </Radio.Group>
        <Radio.Group aria-label="审核决定" value={decision} disabled={disabled} onChange={(e) => {
          setDecision(e.target.value); setException(false); setConfirmed(false)
        }}><Radio value="approve">通过此候选</Radio><Radio value="reject">拒绝此候选</Radio></Radio.Group>
        <Input.TextArea aria-label="候选审核理由" rows={2} value={reason} disabled={disabled}
          onChange={(e) => { setReason(e.target.value); setConfirmed(false) }} placeholder="填写审核依据" />
        {targets.length > 0 && decision === 'approve' && (
          <Checkbox disabled={disabled} checked={exception} onChange={(e) => { setException(e.target.checked); setConfirmed(false) }}>
            对语义裁判的禁止性断言进行证据复核
          </Checkbox>
        )}
        {exception && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Alert type="info" message="仅复核原始失败断言，两位审核者均需绑定同一证据；原始模型结果不会被修改。" />
            <Select aria-label="待复核断言" placeholder="选择原始失败断言" value={ordinal} disabled={disabled}
              style={{ width: '100%' }} onChange={(v: number) => { setOrdinal(v); setConfirmed(false) }}
              options={targets.map((t) => ({ value: t.ordinal, label: `${t.ordinal}：${t.detail}` }))} />
            {target && <Typography.Paragraph>{target.detail}</Typography.Paragraph>}
            <Input.TextArea aria-label="候选原文引用" value={excerpt} disabled={disabled} placeholder="粘贴候选生成结果中的原文片段"
              onChange={(e) => { setExcerpt(e.target.value); setConfirmed(false) }} />
            <Input.TextArea aria-label="断言复核理由" value={exceptionReason} disabled={disabled} placeholder="说明为何原始断言与候选内容矛盾"
              onChange={(e) => { setExceptionReason(e.target.value); setConfirmed(false) }} />
          </Space>
        )}
        <Checkbox checked={confirmed} disabled={disabled} onChange={(e) => setConfirmed(e.target.checked)}>
          我已核对当前候选及证据，确认提交审核决定
        </Checkbox>
        <Button type="primary" disabled={!ready} onClick={() => submit({
          expected_version: run.version, role,
          reviews: [{ candidate_id: detail.candidate_id, decision, reason: reason.trim(),
            ...(semantic ? { semantic_review: semantic } : {}) }]
        }, confirmed)}>提交候选审核</Button>
      </Space>
    </Card>
  )
}
