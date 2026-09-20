import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Checkbox, Input, Select, Space, Table, Typography } from 'antd'
import type { NativeCandidateIndex, NativeEvaluationState, NativeReviewCommand, NativeReviewItem, NativeReviewRole } from '@/api/path/aiWorkflow'
import { importBatch, validateBatch } from './batchReview'
import { validReason } from './commands'

export function NativeBatchReviewWorkspace({ run, index, locked, submit, queued, onConsumed, initialRole, onPlanCount }: {
  onPlanCount?(count: number): void
  initialRole?: NativeReviewRole
  run: NativeEvaluationState
  index: NativeCandidateIndex
  locked: boolean
  submit(command: NativeReviewCommand, confirm: boolean): Promise<void>
  queued: NativeReviewCommand | null
  onConsumed(value: NativeReviewCommand | null): void
}): JSX.Element {
  const [plan, setPlan] = useState<NativeReviewCommand | null>(null)
  const [role, setRole] = useState<NativeReviewRole>(initialRole || 'assessment_semantics')
  const [selected, setSelected] = useState<React.Key[]>([])
  const [decision, setDecision] = useState<'approve' | 'reject'>('approve')
  const [reason, setReason] = useState('')
  const [raw, setRaw] = useState('')
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  const mounted = useRef(true)
  useEffect(() => () => { mounted.current = false }, [])
  const inFlight = useRef(false)
  const lastQueued = useRef<NativeReviewCommand | null>(null)
  const disabled = locked || sending || run.status !== 'awaiting_review' || !run.creation ||
    index.run_id !== run.run_id || index.version !== run.version
  useEffect(() => {
    if (!queued || queued === lastQueued.current) return
    lastQueued.current = queued
    setConfirmed(false)
    try {
      if (plan && plan.role !== queued.role) throw new Error('一个批次只能包含一个审核角色，请先提交或清空当前计划。')
      const next = { ...queued, reviews: [...(plan?.reviews || []).filter((r) =>
        !queued.reviews.some((v) => v.candidate_id === r.candidate_id)), ...queued.reviews] }
      validateBatch(run, index, next)
      setPlan(next)
      setRole(next.role)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : '无法加入审核计划。') }
    onConsumed(null)
  }, [queued, run, index, plan, onConsumed])
  const load = () => {
    setConfirmed(false)
    try {
      const next = importBatch(raw, run, index)
      setPlan(next)
      setRole(next.role)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : '审核计划格式无效。') }
  }
  const send = async () => {
    if (disabled || !confirmed || !plan || inFlight.current) return
    try { validateBatch(run, index, plan) } catch {
      setConfirmed(false); setError('计划已失效，请重新读取任务。'); return
    }
    inFlight.current = true
    setSending(true)
    setConfirmed(false)
    try { await submit(plan, true) } catch {
      if (mounted.current) setError('提交结果待核对，请查询原任务，勿重复提交。')
    } finally { inFlight.current = false; if (mounted.current) setSending(false) }
  }
  useEffect(() => { onPlanCount?.(plan?.reviews.length || 0) }, [plan, onPlanCount])
  const rejected = plan?.reviews.filter((r) => r.decision === 'reject').length || 0
  return <Card title="批量候选审核" size="small" style={{ marginTop: 16 }}>
    <Typography.Paragraph>
      查看候选后可加入审核计划，或导入已逐条核对的计划。每批同一角色最多 35 条，需保留各自决定和理由；两类审核仍需不同操作者。
      草稿仅保留在当前页面，刷新页面或切换任务版本后需重新整理。
    </Typography.Paragraph>
    {error && <Alert type="warning" showIcon message={error} />}
    {run.status !== 'awaiting_review' && <Alert type="info" message="完整评测完成后开放批量审核，目前可继续查看候选。" />}
    <Card size="small" title="选择候选并填写审核意见">
      <Space wrap>
        <Select aria-label="批量审核角色" value={role} disabled={disabled || !!plan} onChange={setRole}
          options={[{ value: 'assessment_semantics', label: '测评语义' }, { value: 'safety_product', label: '安全与产品' }]} />
        <Select aria-label="本批审核决定" value={decision} disabled={disabled} onChange={setDecision}
          options={[{ value: 'approve', label: '通过' }, { value: 'reject', label: '拒绝' }]} />
      </Space>
      <Table rowKey="candidate_id" size="small" pagination={false} scroll={{ y: 220 }} dataSource={index.candidates}
        rowSelection={{ selectedRowKeys: selected, onChange: setSelected,
          getCheckboxProps: (item) => ({ disabled, 'aria-label': `选择 ${item.case_id} 候选 ${item.slot_ordinal}` }) }}
        columns={[{ title: '案例', dataIndex: 'case_id' }, { title: '候选', dataIndex: 'slot_ordinal' }]} />
      <Input.TextArea aria-label="批量审核意见" placeholder="仅对已经实际查看且理由相同的候选批量填写；不同意见请分批加入。"
        value={reason} disabled={disabled} onChange={(e) => { setReason(e.target.value); setConfirmed(false) }} />
      <Button disabled={disabled || !selected.length || !validReason(reason)} onClick={() => {
        const additions = selected.map((id) => ({ candidate_id: String(id), decision, reason }))
        const next: NativeReviewCommand = { expected_version: run.version, role: plan?.role || role,
          reviews: [...(plan?.reviews || []).filter((r) => !selected.includes(r.candidate_id)), ...additions] }
        try { validateBatch(run, index, next); setPlan(next); setSelected([]); setReason(''); setError('') }
        catch (e) { setError(e instanceof Error ? e.message : '无法加入审核计划') }
        setConfirmed(false)
      }}>加入本批审核（{selected.length}）</Button>
    </Card>
    <details>
      <summary>导入批量审核计划</summary>
      <Typography.Paragraph>填写当前任务编号、版本、审核角色及逐条决定。导入只替换页面草稿，不提交审核。</Typography.Paragraph>
      <Typography.Paragraph copyable={{ text: JSON.stringify({ run_id: run.run_id, expected_version: run.version,
        role: 'assessment_semantics',
        reviews: index.candidates.map((c) => ({ candidate_id: c.candidate_id, decision: '', reason: '' })) }, null, 2) }}>
        复制当前候选计划模板（决定和理由留空，需审核者填写；安全与产品角色为 safety_product）
      </Typography.Paragraph>
      <Input.TextArea aria-label="批量审核计划 JSON" rows={6} value={raw} disabled={disabled}
        onChange={(e) => { setRaw(e.target.value); setConfirmed(false) }} />
      <Button disabled={disabled || !raw.trim()} onClick={load}>校验并载入审核计划</Button>
    </details>
    <Typography.Paragraph style={{ marginTop: 12 }}>
      当前角色：{plan ? (plan.role === 'assessment_semantics' ? '测评语义' : '安全与产品') : '尚未选择'}；
      已选 {plan?.reviews.length || 0} 条，通过 {(plan?.reviews.length || 0) - rejected} 条，拒绝 {rejected} 条。
    </Typography.Paragraph>
    <Table<NativeReviewItem> rowKey="candidate_id" pagination={false} scroll={{ y: 260, x: 600 }} dataSource={plan?.reviews || []}
      locale={{ emptyText: '尚未加入候选审核决定' }} columns={[
        { title: '案例 / 候选', render: (_, r) => { const c = index.candidates.find((v) => v.candidate_id === r.candidate_id)
          return `${c?.case_id} / ${c?.slot_ordinal}` } },
        { title: '决定', render: (_, r) => r.decision === 'approve' ? '通过' : '拒绝' },
        { title: '理由', dataIndex: 'reason' },
        { title: '裁判复核', render: (_, r) => r.semantic_review ? '已绑定原始证据' : '无' },
        { title: '操作', render: function renderRemove(_, r) { return <Button disabled={disabled} onClick={() => {
          const reviews = plan?.reviews.filter((v) => v.candidate_id !== r.candidate_id) || []
          setPlan(plan && reviews.length ? { ...plan, reviews } : null); setConfirmed(false)
        }}>移出计划</Button> } }
      ]} />
    <Space className="candidate-batch-footer" direction="vertical" style={{ width: '100%', marginTop: 12 }}>
      {plan && <Typography.Paragraph copyable={{ text: JSON.stringify({ run_id: run.run_id, ...plan }, null, 2) }}>复制当前审核计划</Typography.Paragraph>}
      <Checkbox checked={confirmed} disabled={disabled || !plan} onChange={(e) => setConfirmed(e.target.checked)}>
        我已逐条核对本批候选、决定及理由，确认按当前角色一次提交
      </Checkbox>
      <Space>
        <Button type="primary" disabled={disabled || !confirmed || !plan} loading={sending} onClick={send}>
          批量提交审核（{plan?.reviews.length || 0}）
        </Button>
        <Button disabled={disabled || !plan} onClick={() => { setPlan(null); setConfirmed(false) }}>清空审核计划</Button>
      </Space>
    </Space>
  </Card>
}
