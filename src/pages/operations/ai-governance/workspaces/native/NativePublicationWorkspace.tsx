import { useEffect, useState } from 'react'
import { Alert, Button, Card, Checkbox, Descriptions, Form, Input, Space, Table, Typography } from 'antd'
import type { PublicationHistoryEntry, PublicationState } from '@/api/path/aiWorkflow'
import { JsonEvidence } from '../../components/JsonEvidence'
import { validReason, validUUID } from './commands'
import {
  defaultPublicationSelector,
  publicationLabels,
  sameSelector,
  validSelector
} from './publicationValidation'
import { usePublication } from './usePublication'

function StateEvidence({ value }: { value: PublicationState }): JSX.Element {
  const e = value.publication?.publication.evidence
  return (
    <Descriptions size="small" column={1}>
      <Descriptions.Item label="配置范围">
        {value.selector.model_code || '通用量表'} · {value.selector.model_version || '不限测评版本'}
      </Descriptions.Item>
      <Descriptions.Item label="变更版本">{value.version}</Descriptions.Item>
      <Descriptions.Item label="发布标识">
        {value.active_publication_id || (value.version === 0 ? '从未发布' : '已停用')}
      </Descriptions.Item>
      {e && (
        <>
          <Descriptions.Item label="解读策略">
            {e.profile.profile_id} · {e.profile.version}
          </Descriptions.Item>
          <Descriptions.Item label="生成 Prompt">
            {e.release.prompt.id} · {e.release.prompt.version}
          </Descriptions.Item>
          <Descriptions.Item label="模型路线">
            {e.release.generation_route.id} · {e.release.generation_route.version}
          </Descriptions.Item>
          <Descriptions.Item label="评测任务">
            {e.run_id} · 版本 {e.run_version}
          </Descriptions.Item>
          <Descriptions.Item label="最终审核人">{e.final_review.actor}</Descriptions.Item>
        </>
      )}
    </Descriptions>
  )
}

export function NativePublicationWorkspace({
  owner,
  initialRunID = '',
  onState
}: {
  owner: string
  initialRunID?: string
  onState?: (value: PublicationState | null) => void
}): JSX.Element {
  const c = usePublication(owner)
  useEffect(() => { onState?.(c.current) }, [c.current, onState])
  const [runID, setRunID] = useState(initialRunID)
  const [modelCode, setModelCode] = useState('')
  const [modelVersion, setModelVersion] = useState('')
  const [reason, setReason] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  useEffect(() => {
    setRunID(initialRunID)
    setConfirmed(false)
  }, [initialRunID])
  useEffect(() => {
    setConfirmed(false)
  }, [c.current, c.target, c.candidate, c.receipt])
  const selector = {
    ...defaultPublicationSelector,
    ...(modelCode ? { model_code: modelCode } : {}),
    ...(modelVersion ? { model_version: modelVersion } : {})
  }
  const canPublish =
    c.current &&
    c.candidate &&
    c.candidate.run.run_id === runID &&
    sameSelector(c.current.selector, c.candidate.selector)
  const canRollback =
    c.current &&
    c.current.version > 0 &&
    c.target?.current.active_publication_id &&
    c.target.current.active_publication_id !== c.current.active_publication_id
  const canWrite = !c.locked && confirmed && validReason(reason)
  return (
    <Card title="配置发布与回退">
      <Alert
        showIcon
        type="info"
        message="发布只影响后续采用该配置的新任务；在途任务继续使用原版本。"
        description="先核对当前状态和操作目标，再填写理由并确认。发布、回退和停用仍由服务端校验权限与质量门槛。"
      />
      {c.error && <Alert style={{ marginTop: 12 }} showIcon type="error" message={c.error} />}
      {c.pending && (
        <Alert
          style={{ marginTop: 12 }}
          showIcon
          type="warning"
          message="原操作结果待核对，暂不允许新的修改"
          description={
            <Space direction="vertical">
              <Typography.Text>
                {publicationLabels[c.pending.action]} ·{' '}
                <Typography.Text copyable>{c.pending.commandID}</Typography.Text>
              </Typography.Text>
              <Button loading={c.busy} onClick={c.reconcile}>
                查询原发布命令回执
              </Button>
            </Space>
          }
        />
      )}
      <Card size="small" title="准备发布已审核的评测配置" style={{ marginTop: 16 }}>
        <Space wrap>
          <Input
            aria-label="待发布评测任务"
            value={runID}
            disabled={c.locked}
            placeholder="评测任务标识"
            style={{ width: 330, maxWidth: '100%' }}
            onChange={(e) => {
              setRunID(e.target.value)
              setConfirmed(false)
            }}
          />
          <Button disabled={c.locked || !validUUID(runID)} onClick={() => c.prepare(runID)}>
            核对审核记录与发布范围
          </Button>
        </Space>
        {c.candidate && c.candidate.run.run_id === runID && (
          <Typography.Paragraph style={{ marginTop: 12 }}>
            任务 {runID} 的版本 {c.candidate.run.version} 已通过最终审核。发布范围：
            {c.candidate.selector.model_code || '通用量表'} ·{' '}
            {c.candidate.selector.model_version || '不限测评版本'}。
          </Typography.Paragraph>
        )}
      </Card>
      <Card size="small" title="按配置范围查询" style={{ marginTop: 16 }}>
        <Form layout="inline">
          <Form.Item label="测评编码（可选）">
            <Input
              aria-label="发布测评编码"
              value={modelCode}
              disabled={c.locked}
              onChange={(e) => {
                setModelCode(e.target.value)
                setConfirmed(false)
              }}
            />
          </Form.Item>
          <Form.Item label="测评版本（可选）">
            <Input
              aria-label="发布测评版本"
              value={modelVersion}
              disabled={c.locked}
              onChange={(e) => {
                setModelVersion(e.target.value)
                setConfirmed(false)
              }}
            />
          </Form.Item>
          <Form.Item>
            <Button disabled={c.locked || !validSelector(selector)} onClick={() => c.inspect(selector)}>
              查询当前发布
            </Button>
          </Form.Item>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 10, marginBottom: 0 }}>
          这里查询精确配置范围；具体测评运行时的配置选择仍由服务端决定。
        </Typography.Paragraph>
      </Card>
      {c.current && (
        <Card size="small" title="最近读取的发布状态" style={{ marginTop: 16 }}>
          <StateEvidence value={c.current} />
          <Space wrap>
            <Button disabled={c.locked} onClick={() => c.current && c.inspect(c.current.selector)}>
              刷新该范围状态
            </Button>
            <Button disabled={c.locked} onClick={() => c.loadHistory()}>
              读取发布历史
            </Button>
          </Space>
          {c.historyLoaded && (
            <Table<PublicationHistoryEntry>
              size="small"
              style={{ marginTop: 16 }}
              rowKey="version"
              pagination={false}
              dataSource={c.history}
              locale={{ emptyText: '该配置范围暂无发布历史' }}
              columns={[
                { title: '版本', dataIndex: 'version' },
                {
                  title: '操作',
                  dataIndex: 'action',
                  render: (v: keyof typeof publicationLabels) => publicationLabels[v]
                },
                { title: '操作者', dataIndex: 'actor' },
                { title: '变更时间', dataIndex: 'changed_at' },
                {
                  title: '查看',
                  render: function HistoryAction(_, row) {
                    return (
                      <Button size="small" disabled={c.locked} onClick={() => c.chooseHistory(row)}>
                        核对版本 {row.version}
                      </Button>
                    )
                  }
                }
              ]}
            />
          )}
          {c.cursor > 0 && (
            <Button disabled={c.locked} onClick={() => c.loadHistory(true)}>
              加载更早的发布记录
            </Button>
          )}
        </Card>
      )}
      {c.target && (
        <Card
          size="small"
          title={`历史变更 ${c.target.current.version} 的原始证据`}
          style={{ marginTop: 16 }}
        >
          <Typography.Paragraph>
            {publicationLabels[c.target.action]} · {c.target.actor} · {c.target.changed_at} ·{' '}
            {c.target.reason}
          </Typography.Paragraph>
          <StateEvidence value={c.target.current} />
          <Typography.Paragraph type="secondary">
            历史已发布不代表此刻仍满足回退条件；确认时服务端将重新核验。
          </Typography.Paragraph>
          <details>
            <summary>查看完整前后版本与审核证据</summary>
            <JsonEvidence value={c.target} />
          </details>
        </Card>
      )}
      {c.current && (
        <Card size="small" title="确认变更" style={{ marginTop: 16 }}>
          <Typography.Paragraph>
            本次操作基于配置变更版本 {c.current.version}。若他人已经更新，服务端会拒绝过期操作。
          </Typography.Paragraph>
          <Input.TextArea
            aria-label="发布操作理由"
            value={reason}
            rows={2}
            disabled={c.locked}
            placeholder="说明发布、回退或停用的依据"
            onChange={(e) => {
              setReason(e.target.value)
              setConfirmed(false)
            }}
          />
          <Checkbox
            style={{ marginTop: 12 }}
            checked={confirmed}
            disabled={c.locked}
            onChange={(e) => setConfirmed(e.target.checked)}
          >
            我已核对当前配置范围、版本和操作目标
          </Checkbox>
          <Space wrap style={{ display: 'flex', marginTop: 12 }}>
            <Button
              type="primary"
              disabled={!canWrite || !canPublish}
              onClick={() => c.submit('publish', reason, confirmed)}
            >
              确认发布已审核配置
            </Button>
            <Button
              disabled={!canWrite || !canRollback}
              onClick={() => c.submit('rollback', reason, confirmed)}
            >
              确认回退到所选配置
            </Button>
            <Button
              danger
              disabled={!canWrite || !c.current.active_publication_id}
              onClick={() => c.submit('disable', reason, confirmed)}
            >
              确认停用当前配置
            </Button>
          </Space>
        </Card>
      )}
      {c.receipt && (
        <Card size="small" title="原操作已确认" style={{ marginTop: 16 }}>
          <Alert
            type="success"
            showIcon
            message={`${publicationLabels[c.receipt.action]}命令已确认，变更版本 ${c.receipt.previous.version} → ${c.receipt.current.version}`}
            description="这是原命令的结果；继续操作前，请重新查询当前发布状态。"
          />
          <Typography.Paragraph style={{ marginTop: 12 }}>
            {c.receipt.actor} · {c.receipt.changed_at} · {c.receipt.reason}
          </Typography.Paragraph>
          <StateEvidence value={c.receipt.current} />
          <Button disabled={c.locked} onClick={() => c.receipt && c.inspect(c.receipt.current.selector)}>
            读取操作后的当前状态
          </Button>
        </Card>
      )}
    </Card>
  )
}
