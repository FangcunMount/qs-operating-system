import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Space, Table, Typography } from 'antd'
import { getNativeCandidate, listNativeCandidates } from '@/api/path/aiWorkflow'
import type {
  NativeCandidateEvidence,
  NativeCandidateIndex,
  NativeEvaluationState
} from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'

export function NativeCandidateWorkspace({ run }: { run: NativeEvaluationState }): JSX.Element {
  const [index, setIndex] = useState<NativeCandidateIndex | null>(null)
  const [detail, setDetail] = useState<NativeCandidateEvidence | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const epoch = useRef(0)
  useEffect(
    () => () => {
      epoch.current++
    },
    []
  )
  const load = async (candidate?: string) => {
    const request = ++epoch.current
    setBusy(true)
    setError('')
    setDetail(null)
    try {
      if (candidate) {
        if (!index || !index.candidates.some((c) => c.candidate_id === candidate)) return
        const [failure, response] = await getNativeCandidate(run.run_id, candidate, index.version)
        if (request !== epoch.current) return
        const value = response?.data
        if (
          failure ||
          !value ||
          value.run_id !== run.run_id ||
          value.version !== run.version ||
          value.candidate_id !== candidate ||
          typeof value.normalized_output !== 'string' ||
          typeof value.semantic_output !== 'string' ||
          !value.evidence
        )
          throw new Error('Candidate mismatch')
        setDetail(value)
      } else {
        setIndex(null)
        const [failure, response] = await listNativeCandidates(run.run_id)
        if (request !== epoch.current) return
        const value = response?.data
        if (
          failure ||
          !value ||
          value.run_id !== run.run_id ||
          value.version !== run.version ||
          !Array.isArray(value.candidates) ||
          value.candidates.length > 35 ||
          new Set(value.candidates.map((c) => c.candidate_id)).size !== value.candidates.length ||
          value.candidates.some(
            (c) =>
              !/^[A-Za-z0-9][A-Za-z0-9:._/-]{0,127}$/.test(c.candidate_id) ||
              !c.case_id ||
              !Number.isInteger(c.slot_ordinal) ||
              c.slot_ordinal < 1
          )
        )
          throw new Error('Index mismatch')
        setIndex(value)
      }
    } catch {
      if (request === epoch.current) setError('结果暂不可读或任务版本已变化，请先刷新任务状态。')
    } finally {
      if (request === epoch.current) setBusy(false)
    }
  }
  return (
    <Card title="评测结果" style={{ marginTop: 16 }}>
      <Typography.Paragraph type="secondary">
        候选内容、语义检查与审核记录均来自当前任务版本。结果存在不代表审核通过或已发布。
      </Typography.Paragraph>
      {error && <Alert showIcon type="warning" message={error} />}
      <Button loading={busy} onClick={() => load()}>
        读取候选结果
      </Button>
      {index && (
        <Table
          pagination={false}
          dataSource={index.candidates}
          rowKey="candidate_id"
          style={{ marginTop: 12 }}
          locale={{ emptyText: '当前版本尚无候选结果' }}
          columns={[
            { title: '案例', dataIndex: 'case_id' },
            { title: '候选序号', dataIndex: 'slot_ordinal' },
            {
              title: '操作',
              render: function renderCandidate(_, item) {
                return (
                  <Button disabled={busy} onClick={() => load(item.candidate_id)}>
                    查看候选详情
                  </Button>
                )
              }
            }
          ]}
        />
      )}
      {detail && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          <Typography.Title level={5}>生成结果</Typography.Title>
          <Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>
            {detail.normalized_output}
          </Typography.Paragraph>
          <details>
            <summary>语义检查原文</summary>
            <JsonEvidence value={detail.semantic_output} />
          </details>
          <details>
            <summary>来源、调用及审核证据</summary>
            <JsonEvidence value={detail.evidence} />
          </details>
        </Space>
      )}
    </Card>
  )
}
