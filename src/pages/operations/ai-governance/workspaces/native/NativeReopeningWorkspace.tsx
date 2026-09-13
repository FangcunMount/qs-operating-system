import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Collapse, Descriptions, Input, Space, Typography } from 'antd'
import type { NativeEvaluationState, NativeReviewReopening } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason } from './commands'
import { canRequestReopening, reopeningHistory } from './reopeningValidation'

export function NativeReopeningWorkspace({
  run,
  locked,
  reopen
}: {
  run: NativeEvaluationState
  locked: boolean
  reopen(reason: string, confirm: boolean): Promise<void>
}): JSX.Element {
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => {
    setConfirmed(false)
  }, [run.run_id, run.version])
  let history: NativeReviewReopening[] = []
  let error = ''
  try {
    history = reopeningHistory(run)
  } catch {
    error = '复审历史暂不可核对，请重新查询任务。'
  }
  if (!history.length && run.status !== 'rejected' && !error) return <></>
  const eligible = !error && canRequestReopening(run)
  return (
    <Card title="语义复审" style={{ marginTop: 16 }}>
      <Typography.Paragraph>
        对符合条件的语义判定争议，可重开指定候选的人工审核。原模型结果、历史门槛和签名会保留，不重新调用模型。是否可以申请，以当前任务的服务端判定为准。
      </Typography.Paragraph>
      {error && <Alert type="error" showIcon message={error} />}
      {history.length > 0 && (
        <Collapse>
          {history.map((entry, i) => (
            <Collapse.Panel
              key={entry.version}
              header={`第 ${i + 1} 轮复审 · ${entry.actor} · ${entry.reopened_at}`}
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="原审核版本">{entry.source_version}</Descriptions.Item>
                <Descriptions.Item label="重开后版本">{entry.version}</Descriptions.Item>
                <Descriptions.Item label="复审理由">{entry.reason}</Descriptions.Item>
                <Descriptions.Item label="复审候选">{entry.candidate_ids.join('、')}</Descriptions.Item>
              </Descriptions>
              <details>
                <summary>查看保留的原审核与门槛证据</summary>
                <JsonEvidence value={entry} />
              </details>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}
      {run.status === 'rejected' && !eligible && !error && (
        <Alert
          type="info"
          showIcon
          message={run.can_reopen_review === undefined
            ? '暂未取得服务端复审资格，请重新查询任务。'
            : '当前结果不在可申请复审范围内。请核对原审核依据。'}
        />
      )}
      {eligible && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 12 }}>
          <Alert
            type="info"
            showIcon
            message="提交后，AI 服务将根据原始证据核验资格并确定需要复审的候选。"
          />
          <Input.TextArea
            aria-label="重开复审理由"
            rows={2}
            value={reason}
            disabled={locked}
            onChange={(e) => {
              setReason(e.target.value)
              setConfirmed(false)
            }}
            placeholder="说明争议及需要重新核对的依据"
          />
          <Checkbox
            checked={confirmed}
            disabled={locked}
            onChange={(e) => setConfirmed(e.target.checked)}
          >
            我确认保留原始证据，并重新完成受影响候选的人工审核
          </Checkbox>
          <Button
            disabled={locked || !confirmed || !validReason(reason)}
            onClick={() => reopen(reason, confirmed)}
          >
            确认重开语义复审
          </Button>
        </Space>
      )}
    </Card>
  )
}
