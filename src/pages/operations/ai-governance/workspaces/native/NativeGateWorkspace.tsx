import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, Input, Space, Table, Tag, Typography } from 'antd'
import type { NativeEvaluationState, NativeFinalization, NativeGateID, NativeGatePreview, NativeGateResult } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason } from './commands'
import { finalizationReceipt, gateIDs, gatePassed, reviewIncomplete } from './finalizationValidation'

const gateLabels: Record<NativeGateID, string> = {
  G1: '配置与发布身份', G2: '执行证据完整性', G3: '执行可靠性', G4: '内容与语义质量', G5: '人工审核'
}
const reasonLabels: Record<string, string> = {
  human_review_incomplete: '候选人工审核尚未完成', human_review_count_incomplete: '人工审核数量未满足要求',
  human_review_rejected: '人工审核存在拒绝', infrastructure_success_rate_below_threshold: '基础执行成功率未达标',
  generation_contract_conformance_rate_below_threshold: '生成结构符合率未达标',
  semantic_execution_success_rate_below_threshold: '语义评测成功率未达标',
  candidate_completion_incomplete: '候选最终评测尚未全部完成',
  candidate_case_assertion_failed: '候选案例断言未通过', candidate_hard_assertion_failed: '候选必要断言未通过',
  candidate_semantic_score_below_minimum: '候选语义评分未达标', case_assertion_stability_failed: '案例稳定性未达标',
  case_assertion_overall_failed: '整体案例通过数未达标', semantic_average_below_threshold: '语义平均分未达标'
}
const metricLabels: Record<string, string> = {
  candidate_completion_rate: '候选最终完成率',
  observed_infrastructure_success_rate: '模型调用响应成功率',
  observed_generation_contract_conformance_rate: '生成结构符合率',
  observed_semantic_execution_success_rate: '全部语义调用成功率',
  observed_generation_first_attempt_success_rate: '首次生成成功率',
  observed_semantic_first_attempt_success_rate: '首次语义评判成功率',
  observed_generation_retry_count: '生成重试次数',
  observed_semantic_retry_count: '语义评判重试次数'
}
function GateEvidence({ value }: { value: NativeGateResult }): JSX.Element {
  return <>
    <Space wrap>{gateIDs.map((g) => <Tag key={g} color={value.gate_passes[g] ? 'green' : 'red'}>
      {g} {g === 'G3' && value.metrics.some((m) => m.name === 'candidate_completion_rate')
        ? '候选完成与执行校验' : gateLabels[g]}：{value.gate_passes[g] ? '通过' : '未通过'}
    </Tag>)}</Space>
    {value.reasons.length > 0 && <Table size="small" pagination={false} style={{ marginTop: 12 }}
      rowKey="key" dataSource={value.reasons.map((r, key) => ({ ...r, key }))} columns={[
        { title: '门槛', dataIndex: 'gate' },
        { title: '原因', dataIndex: 'code', render: (code) => reasonLabels[code] || code },
        { title: '相关证据', dataIndex: 'evidence_refs', render: (refs: string[]) => refs.join('、') || '整体任务' }
      ]} />}
    {value.metrics.some((m) => m.name === 'candidate_completion_rate') && <>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        发布要求全部候选完成有效评判，内容质量和人工审核仍须通过。调用成功率与重试次数仅用于观测，原始失败记录继续保留。
      </Typography.Paragraph>
      <Table size="small" pagination={false} rowKey="name" dataSource={value.metrics} columns={[
        { title: '指标', dataIndex: 'name', render: (name: string) => metricLabels[name] || name },
        { title: '结果', render: (_, metric) => Number.isFinite(metric.value)
          ? (metric.name.endsWith('_rate') ? `${metric.numerator}/${metric.denominator}（${(metric.value * 100).toFixed(2)}%）` : metric.value)
          : '—' },
        { title: '用途', dataIndex: 'threshold', render: function renderPurpose(threshold: number | null) {
          return threshold === null ? <Tag>观测指标</Tag> : <Tag color="blue">发布门槛：{(threshold * 100).toFixed(0)}%</Tag>
        } }
      ]} />
    </>}
    <details style={{ marginTop: 12 }}><summary>查看指标、阈值和证据复核记录</summary><JsonEvidence value={value} /></details>
  </>
}
export function NativeGateWorkspace({ run, preview, locked, load, finalize }: {
  run: NativeEvaluationState
  preview: NativeGatePreview | null
  locked: boolean
  load(): Promise<void>
  finalize(reason: string, confirm: boolean): Promise<void>
}): JSX.Element {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => { setConfirmed(false) }, [preview, run.run_id, run.version])
  const terminal = run.status === 'approved' || run.status === 'rejected'
  let receipt: NativeFinalization | undefined
  let receiptError = ''
  if (terminal) {
    try { receipt = finalizationReceipt(run) }
    catch { receiptError = '最终审核回执暂不可核对，请重新查询任务；不能据此发布配置。' }
  }
  const passed = preview ? gatePassed(preview.gate_result) : false
  const incomplete = preview ? reviewIncomplete(preview.gate_result) : true
  return <Card title="最终审核" style={{ marginTop: 16 }}>
    <Typography.Paragraph type="secondary">
      门槛由 AI 服务根据固定配置、执行证据及人工审核记录计算。确认最终审核会关闭本轮审核；配置发布是后续独立操作。
    </Typography.Paragraph>
    {receiptError && <Alert type="warning" showIcon message={receiptError} />}
    {receipt && <>
      <Alert showIcon type={receipt.passed ? 'success' : 'warning'} message={receipt.passed ? '本轮最终审核已通过；配置是否生效需查询发布状态' : '本轮最终审核已拒绝，不能发布配置'} />
      <Descriptions size="small" column={1} style={{ marginTop: 12 }}>
        <Descriptions.Item label="确认人">{receipt.actor}</Descriptions.Item>
        <Descriptions.Item label="确认时间">{receipt.finalized_at}</Descriptions.Item>
        <Descriptions.Item label="确认理由">{receipt.reason}</Descriptions.Item>
        <Descriptions.Item label="确认版本">{receipt.source_version} → {receipt.version}</Descriptions.Item>
      </Descriptions>
      <GateEvidence value={receipt.gate_result} />
    </>}
    {!terminal && <>
      <Button disabled={locked || run.status !== 'awaiting_review' || !run.creation} onClick={load}>读取最终审核门槛</Button>
      {preview && <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
        <Typography.Text>门槛对应任务版本：{preview.version}</Typography.Text>
        <GateEvidence value={preview.gate_result} />
        {incomplete ? <Alert showIcon type="warning" message="人工审核尚未完成，请先补齐候选审核。" /> : <>
          <Alert showIcon type={passed ? 'info' : 'warning'} message={passed ? '当前门槛全部通过，确认后将标记本轮审核通过。' : '当前门槛存在未通过项，确认后将标记本轮审核拒绝。'} />
          <Input.TextArea aria-label="最终审核理由" value={reason} disabled={locked} rows={2}
            placeholder="说明最终审核依据" onChange={(e) => { setReason(e.target.value); setConfirmed(false) }} />
          <Checkbox checked={confirmed} disabled={locked} onChange={(e) => setConfirmed(e.target.checked)}>
            我已核对当前门槛，确认本轮最终审核{passed ? '通过' : '拒绝'}
          </Checkbox>
          <Button type="primary" danger={!passed} disabled={locked || !confirmed || !validReason(reason)}
            onClick={() => finalize(reason, confirmed)}>确认最终审核{passed ? '通过' : '拒绝'}</Button>
        </>}
      </Space>}
    </>}
  </Card>
}
