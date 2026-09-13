import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, Input, Space, Typography } from 'antd'
import type { EvaluationReference, EvaluationSelection } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason, validUUID } from './commands'
import { statusLabels, validRef } from './evaluationValidation'
import { useNativeEvaluation } from './useNativeEvaluation'
import { NativeGateWorkspace } from './NativeGateWorkspace'
import { NativeCandidateWorkspace } from './NativeCandidateWorkspace'
import { NativeReopeningWorkspace } from './NativeReopeningWorkspace'

const pendingLabels = { create: '创建', start: '启动', review: '审核', finalize: '最终审核', reopen: '复审' }
const label = (ref?: EvaluationReference) =>
  ref ? `${ref.id} · ${ref.version}` : '请从配置目录选择'
export function NativeEvaluationWorkspace({
  owner,
  selection,
  onPublish
}: {
  owner: string
  selection: EvaluationSelection
  onPublish?: (runID: string) => void
}): JSX.Element {
  const c = useNativeEvaluation(owner, selection)
  const [runID, setRunID] = useState(c.journal?.runID || '')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [startReason, setStartReason] = useState('')
  const [startConfirmed, setStartConfirmed] = useState(false)
  useEffect(() => {
    setConfirmed(false)
  }, [c.plan])
  useEffect(() => {
    setStartConfirmed(false)
  }, [c.run?.run_id, c.run?.version])
  useEffect(() => {
    if (c.journal) setRunID(c.journal.runID)
  }, [c.journal?.runID])
  const locked = c.busy || Boolean(c.journal) || Boolean(c.run) || c.storageFailed
  const canPrepare = [selection.suite, selection.generation_route, selection.semantic_route].every(
    validRef
  )
  return (
    <Card title="原生评测任务" style={{ marginTop: 20 }}>
      <Alert
        showIcon
        type="info"
        message="先确认配置与预算，再创建和启动任务。创建只保存固定版本，启动后才进入执行队列。"
      />
      {c.error && <Alert showIcon type="error" message={c.error} style={{ marginTop: 12 }} />}
      {c.journal?.pending && (
        <Alert
          showIcon
          type="warning"
          style={{ marginTop: 12 }}
          message={`${pendingLabels[c.journal.pending]}结果待核对`}
          description="保留原任务标识，通过下方查询恢复。暂不重复提交任务操作。"
        />
      )}
      <Space wrap style={{ marginTop: 16, marginBottom: 16 }}>
        <Input
          aria-label="评测任务标识"
          placeholder="输入任务标识，恢复查看"
          value={runID}
          disabled={c.busy || Boolean(c.journal?.pending)}
          onChange={(e) => setRunID(e.target.value)}
          style={{ width: 360 }}
        />
        <Button
          loading={c.busy}
          disabled={!validUUID(runID.trim()) || c.busy}
          onClick={() => c.read(runID)}
        >
          查询任务状态
        </Button>
      </Space>
      {!c.run && !c.journal && (
        <>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="评测套件">{label(selection.suite)}</Descriptions.Item>
            <Descriptions.Item label="生成模型路线">
              {label(selection.generation_route)}
            </Descriptions.Item>
            <Descriptions.Item label="语义评测路线">
              {label(selection.semantic_route)}
            </Descriptions.Item>
          </Descriptions>
          <Button disabled={locked || !canPrepare} loading={c.busy} onClick={c.prepare}>
            读取评测计划
          </Button>
          {c.plan && (
            <Card title="待确认的评测计划" size="small" style={{ marginTop: 16 }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="生成案例">
                  {c.plan.generation_case_count}
                </Descriptions.Item>
                <Descriptions.Item label="每案例候选">
                  {c.plan.candidates_per_case}
                </Descriptions.Item>
                <Descriptions.Item label="候选总数">{c.plan.candidate_count}</Descriptions.Item>
                <Descriptions.Item label="预检案例">
                  {c.plan.preflight_case_count}
                </Descriptions.Item>
                <Descriptions.Item label="生成调用上限">
                  {c.plan.max_generation_invocations}
                </Descriptions.Item>
                <Descriptions.Item label="语义调用上限">
                  {c.plan.max_semantic_invocations}
                </Descriptions.Item>
              </Descriptions>
              <Typography.Paragraph type="secondary">
                以上为此版本策略的调用上限，不代表当前机构剩余额度，也不是本次实际调用量。
              </Typography.Paragraph>
              <details>
                <summary>查看完整配置版本与执行策略</summary>
                <JsonEvidence value={c.plan} />
              </details>
              <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
                <Input.TextArea
                  aria-label="创建评测理由"
                  placeholder="说明本次评测目的"
                  value={reason}
                  disabled={locked}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
                <Checkbox
                  checked={confirmed}
                  disabled={locked}
                  onChange={(e) => setConfirmed(e.target.checked)}
                >
                  我确认冻结以上配置并创建评测任务
                </Checkbox>
                <Button
                  type="primary"
                  loading={c.busy}
                  disabled={locked || !confirmed || !validReason(reason)}
                  onClick={() => c.create(reason, confirmed)}
                >
                  创建评测任务
                </Button>
              </Space>
            </Card>
          )}
        </>
      )}
      {c.run && (
        <Card title="当前评测任务" size="small">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="任务标识">
              <Typography.Text copyable>{c.run.run_id}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="状态">{statusLabels[c.run.status]}</Descriptions.Item>
            <Descriptions.Item label="任务版本">{c.run.version}</Descriptions.Item>
            <Descriptions.Item label="待核对调用">
              {c.run.unresolved_result_unknown_count}
            </Descriptions.Item>
            {c.run.creation && (
              <Descriptions.Item label="冻结套件">
                {label(c.run.creation.release.suite)}
              </Descriptions.Item>
            )}
            {c.run.creation && (
              <Descriptions.Item label="创建人">{c.run.creation.requested_by}</Descriptions.Item>
            )}
            {c.run.creation && (
              <Descriptions.Item label="创建时间">{c.run.creation.created_at}</Descriptions.Item>
            )}
            {c.run.creation && (
              <Descriptions.Item label="创建理由">
                {c.run.creation.request_reason}
              </Descriptions.Item>
            )}
          </Descriptions>
          {!c.run.creation && (
            <Alert
              type="warning"
              message="当前响应缺少原始创建记录，仅可查看状态；暂不能从此处启动。"
            />
          )}
          {c.run.status === 'requested' && c.run.creation && (
            <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
              <Input.TextArea
                aria-label="启动评测理由"
                placeholder="说明启动原因"
                value={startReason}
                disabled={c.busy || Boolean(c.journal?.pending)}
                onChange={(e) => setStartReason(e.target.value)}
                rows={2}
              />
              <Checkbox
                checked={startConfirmed}
                disabled={c.busy || Boolean(c.journal?.pending)}
                onChange={(e) => setStartConfirmed(e.target.checked)}
              >
                我确认启动此任务，执行可能产生模型调用费用
              </Checkbox>
              <Button
                type="primary"
                loading={c.busy}
                disabled={
                  c.busy ||
                  c.storageFailed ||
                  Boolean(c.journal?.pending) ||
                  !startConfirmed ||
                  !validReason(startReason)
                }
                onClick={() => c.start(startReason, startConfirmed)}
              >
                启动评测任务
              </Button>
            </Space>
          )}
          <details style={{ marginTop: 16 }}>
            <summary>查看固定版本与任务审计记录</summary>
            <JsonEvidence value={c.run} />
          </details>
          {['awaiting_review', 'approved', 'rejected'].includes(c.run.status) && (
            <NativeGateWorkspace key={`gates:${c.run.run_id}:${c.run.version}`} run={c.run}
              preview={c.gates} locked={c.busy || c.storageFailed || Boolean(c.journal?.pending)}
              load={c.previewGates} finalize={c.finalize} />
          )}
          <NativeReopeningWorkspace key={`reopening:${c.run.run_id}:${c.run.version}`} run={c.run}
            locked={c.busy || c.storageFailed || Boolean(c.journal?.pending)} reopen={c.reopen} />
          {c.run.status === 'approved' && onPublish && (
            <Button style={{ marginTop: 12 }}
              disabled={c.busy || c.storageFailed || Boolean(c.journal?.pending)}
              onClick={() => c.run && onPublish(c.run.run_id)}>
              前往核对并发布配置
            </Button>
          )}
          {c.run.status !== 'requested' && (
            <NativeCandidateWorkspace key={`${c.run.run_id}:${c.run.version}`} run={c.run}
              locked={c.busy || c.storageFailed || Boolean(c.journal?.pending)} review={c.review} />
          )}
        </Card>
      )}
      {(c.run || c.journal) && (
        <Button
          style={{ marginTop: 16 }}
          disabled={c.busy || c.storageFailed || Boolean(c.journal?.pending)}
          onClick={() => {
            c.reset()
            setReason('')
            setStartReason('')
            setConfirmed(false)
            setStartConfirmed(false)
          }}
        >
          结束查看，准备另一评测
        </Button>
      )}
    </Card>
  )
}
