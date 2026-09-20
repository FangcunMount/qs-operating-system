import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Card, Descriptions, Drawer, Radio, Space, Table, Tag, Typography } from 'antd'
import { getFlow } from '@/api/path/aiWorkflow/flow'
import type { EditTarget, FlowDescription, FlowNode, FlowSource } from '@/api/path/aiWorkflow/flow'
import { readError } from '../runtime/state'
import './flow.scss'

function checked(value: FlowDescription | undefined, kind: FlowSource, id: string, digest?: string) {
  if (
    !value ||
    value.schema_version !== 'qs-ai-flow/v1' ||
    value.source_id !== id ||
    value.source_kind !== kind ||
    value.definition_version !== 'qs-published-snapshot-v1' ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    !Array.isArray(value.gaps) ||
    value.availability !== 'available' ||
    (digest && value.version !== digest)
  )
    throw new Error('fixed_flow_unavailable')
  const ids = new Set(value.nodes.map((node) => node.id))
  if (ids.size !== value.nodes.length || value.edges.some((edge) =>
    !ids.has(edge.source) || !ids.has(edge.target) ||
    !['sequence', 'reuses_configuration'].includes(edge.relation))) throw new Error('fixed_flow_unavailable')
  return value
}
const forbidden = (e: unknown) => {
  const error = e as { status?: number; response?: { status?: number } } | null
  return [401, 403].includes(error?.status || error?.response?.status || 0)
}
function Details({ node }: { node: FlowNode }) {
  const values = node.details as Record<string, unknown> | null
  if (!values)
    return <Typography.Paragraph type="secondary">此节点没有额外正文记录。</Typography.Paragraph>
  const names: Record<string, string> = {
    system_message: '系统说明',
    task_template: '任务模板',
    data_preamble: '事实前言',
    allowed_placeholders: '允许的事实占位符',
    model: '模型',
    max_output_tokens: '输出 token 上限',
    timeout_milliseconds: '调用超时（毫秒）',
    reasoning_effort: '推理强度',
    prompt: '语义 Prompt（只读）',
    generation_case_count: '生成案例组数',
    candidates_per_case: '每组候选数',
    candidate_count: '完整候选数',
    preflight_case_count: '预检案例数',
    max_generation_invocations: '生成调用上限',
    max_semantic_invocations: '语义调用上限'
  }
  return (
    <Descriptions column={1} bordered size="small">
      {Object.entries(values)
        .filter(([key]) => key !== 'prompt_editable')
        .map(([key, value]) => (
          <Descriptions.Item key={key} label={names[key] || key}>
            <div className="flow-node-content">
              {typeof value === 'string' ? value : JSON.stringify(value, null, 2) || '正文未登记'}
            </div>
          </Descriptions.Item>
        ))}
    </Descriptions>
  )
}
export function FlowPanel({
  owner,
  kind,
  id,
  compareID,
  expectedDigest,
  sourceRevision,
  onEdit,
  onCreate
}: {
  owner: string
  kind: FlowSource
  id: string
  compareID?: string
  expectedDigest?: string
  sourceRevision?: number
  onEdit?: (target: EditTarget) => void
  onCreate?: () => void
}): JSX.Element {
  const [flow, setFlow] = useState<FlowDescription | null>(null)
  const [comparison, setComparison] = useState<FlowDescription | null>(null)
  const [comparisonError, setComparisonError] = useState(false)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const [view, setView] = useState('graph'),
    [selected, setSelected] = useState('')
  const [revision, setRevision] = useState(0)
  const epoch = useRef(0)
  useEffect(() => {
    const current = ++epoch.current
    setFlow(null)
    setComparison(null)
    setSelected('')
    setComparisonError(false)
    setError('')
    setBusy(true)
    const load = async () => {
      try {
        const [[failure, response], [compareFailure, compareResponse]] = await Promise.all([
          getFlow(kind, id),
          compareID
            ? getFlow('publication', compareID)
            : Promise.resolve([null, undefined] as [null, undefined])
        ])
        if (current !== epoch.current) return
        if (forbidden(failure) || forbidden(compareFailure)) throw failure || compareFailure
        if (failure) throw failure
        const loaded = checked(response?.data, kind, id, expectedDigest)
        if (sourceRevision !== undefined && loaded.version !== sourceRevision) throw new Error('fixed_flow_unavailable')
        setFlow(loaded)
        if (compareID) {
          if (compareFailure) setComparisonError(true)
          else setComparison(checked(compareResponse?.data, 'publication', compareID))
        }
      } catch (e) {
        if (current === epoch.current) {
          setFlow(null)
          setComparison(null)
          setError(readError(e))
        }
      } finally {
        if (current === epoch.current) setBusy(false)
      }
    }
    load()
    return () => {
      epoch.current++
    }
  }, [owner, kind, id, compareID, expectedDigest, sourceRevision, revision])
  const node = flow?.nodes.find((n) => n.id === selected)
  const priorNode = comparison?.nodes.find((n) => n.id === selected)
  const editTarget = node?.edit_target
  return (
    <Card
      title="解读流程"
      loading={busy}
      extra={<Button onClick={() => setRevision(revision + 1)}>刷新流程</Button>}
    >
      {error && (
        <Alert
          type="warning"
          showIcon
          message="暂不能展示此固定版本的流程"
          description={`${error} 请保留并核对原配置证据，不以当前版本替代。`}
        />
      )}
      {flow && (
        <>
          <Space wrap>
            <Tag>{flow.draft ? '修改中的方案' : '固定版本 · 只读'}</Tag>
            <Radio.Group
              aria-label="流程展示方式"
              value={view}
              onChange={(e) => setView(e.target.value)}
            >
              <Radio.Button value="graph">流程图</Radio.Button>
              <Radio.Button value="list">等价列表</Radio.Button>
            </Radio.Group>
            {onCreate && flow.immutable && <Button onClick={onCreate}>从此版本创建修改</Button>}
          </Space>
          <Typography.Paragraph type="secondary">
            流程展示现有执行结构；点击节点查看用途、输入输出和配置。图形不控制执行。
          </Typography.Paragraph>
          {flow.draft && (
            <Alert
              type="info"
              message="Prompt 和模型参数展示已保存的修改；资产指纹仍为来源引用，完成固定配置后生成新指纹。"
            />
          )}
          {flow.gaps.map((gap) => (
            <Alert key={gap} type="warning" message={gap} />
          ))}
          {(['business', 'evaluation'] as const).map((lane) => (
            <section
              key={lane}
              className="flow-lane"
              aria-label={lane === 'business' ? '用户解读流程' : '配置评测流程'}
            >
              <Typography.Title level={5}>
                {lane === 'business' ? '一次用户解读' : '配置测试、审核与发布'}
              </Typography.Title>
              <Typography.Paragraph>
                {lane === 'business'
                  ? '三个 Prompt 消息片段组成一次生成请求。'
                  : '评测候选复用生成配置，另外执行语义评测；不会增加每次用户解读的调用。'}
              </Typography.Paragraph>
              <div className={view === 'graph' ? 'flow-nodes' : 'flow-nodes flow-nodes--list'}>
                {flow.nodes
                  .filter((n) => n.lane === lane)
                  .map((n, index) => (
                    <div className="flow-node" key={n.id}>
                      <Button
                        className="flow-node-button"
                        onClick={() => setSelected(n.id)}
                        aria-label={`查看${n.title}`}
                      >
                        <span>
                          {index + 1}. {n.title}
                        </span>
                        <small>
                          {n.kind === 'model_call'
                            ? '模型调用'
                            : n.kind === 'composition'
                              ? '消息组成'
                              : '业务步骤'}
                        </small>
                      </Button>
                      {view === 'list' && <Typography.Paragraph>{n.purpose}</Typography.Paragraph>}
                      {flow.edges.filter((edge) => edge.source === n.id).map((edge) => (
                        <Typography.Paragraph key={`${edge.source}:${edge.target}`} className="flow-connection">
                          {edge.relation === 'sequence' ? '下一步 → ' : '配置复用于 → '}
                          <Button type="link" onClick={() => setSelected(edge.target)}>
                            {flow.nodes.find((target) => target.id === edge.target)?.title}
                          </Button>
                        </Typography.Paragraph>
                      ))}
                    </div>
                  ))}
              </div>
            </section>
          ))}
          {comparisonError && <Alert type="warning" message="来源版本暂不可用，未生成版本差异。" />}
          {comparison && (
            <Card size="small" title="与来源发布版本对照">
              <Table
                rowKey="id"
                pagination={false}
                dataSource={flow.nodes}
                columns={[
                  { title: '节点', dataIndex: 'title' },
                  {
                    title: '差异',
                    render: (_, n) => {
                      const prior = comparison.nodes.find((p) => p.id === n.id)
                      return !prior
                        ? '新增步骤'
                        : JSON.stringify([n.assets, n.details]) ===
                          JSON.stringify([prior.assets, prior.details])
                          ? '内容相同'
                          : '配置或正文已变化（点节点查看）'
                    }
                  }
                ]}
              />
            </Card>
          )}
          <details>
            <summary>固定版本与技术引用</summary>
            <Typography.Paragraph copyable>{flow.release_fingerprint}</Typography.Paragraph>
            <Typography.Paragraph>
              定义 {flow.definition_version} · 观测于 {flow.observed_at}
            </Typography.Paragraph>
          </details>
        </>
      )}
      <Drawer
        title={node?.title}
        visible={Boolean(node)}
        width="min(720px, 100vw)"
        onClose={() => setSelected('')}
        destroyOnClose
      >
        {node && (
          <>
            <Typography.Paragraph>{node.purpose}</Typography.Paragraph>
            <Descriptions column={1}>
              <Descriptions.Item label="输入">{node.inputs.join('、')}</Descriptions.Item>
              <Descriptions.Item label="输出">{node.outputs.join('、')}</Descriptions.Item>
            </Descriptions>
            <Details node={node} />
            {priorNode && (
              <details>
                <summary>来源版本正文与参数</summary>
                <Details node={priorNode} />
              </details>
            )}
            {onEdit && node.editable && editTarget && (
              <Button
                type="primary"
                onClick={() => {
                  onEdit(editTarget)
                  setSelected('')
                }}
              >
                修改{node.edit_target === 'semantic' ? '语义评测模型参数' : '此节点配置'}
              </Button>
            )}
            {!node.editable && (
              <Typography.Paragraph type="secondary">
                只读节点。固定版本需先创建修改版本；规则和语义 Prompt 本轮不开放编辑。
              </Typography.Paragraph>
            )}
            <details>
              <summary>资产引用</summary>
              {node.assets.map((a) => (
                <Typography.Paragraph key={`${a.id}:${a.version}`}>
                  {a.id} · {a.version}
                  <br />
                  {a.fingerprint}
                </Typography.Paragraph>
              ))}
            </details>
          </>
        )}
      </Drawer>
    </Card>
  )
}
