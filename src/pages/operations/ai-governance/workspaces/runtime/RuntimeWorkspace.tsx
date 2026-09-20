import { RuntimeHealth } from './RuntimeHealth'
import { RuntimeTimeline } from './RuntimeTimeline'
import type { RuntimeTimeline as TimelineEvidence } from '@/api/path/aiWorkflow/runtime'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useHistory, useLocation, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography
} from 'antd'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import {
  getRuntimeRequest,
  getRuntimeTimeline,
  listRuntimeRequests
} from '@/api/path/aiWorkflow/runtime'
import type {
  RuntimeDetail,
  RuntimePage,
  RuntimeQuery,
  RuntimeRequest
} from '@/api/path/aiWorkflow/runtime'
import { NativeParticipantRetryWorkspace } from '../native/NativeParticipantRetryWorkspace'
import { validUUID } from '../native/commands'
import { active, failureNames, formatTime, readError, stage, statusNames } from './state'

const base = '/operations/ai-governance/runtime'
function useRefresh(enabled: boolean, refresh: () => void) {
  useEffect(() => {
    if (!enabled) return
    const timer = window.setInterval(() => {
      if (!document.hidden) refresh()
    }, 10000)
    return () => window.clearInterval(timer)
  }, [enabled, refresh])
}
export function RuntimeList(): JSX.Element {
  const location = useLocation(),
    history = useHistory()
  const search = new URLSearchParams(location.search)
  const [assessment, setAssessment] = useState(search.get('assessment_id') || '')
  const [request, setRequest] = useState(search.get('request_id') || '')
  const [status, setStatus] = useState(search.get('status') || '')
  const [historical, setHistorical] = useState(search.get('history') === 'true')
  const [page, setPage] = useState<RuntimePage | null>(null)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const epoch = useRef(0),
    working = useRef(false)
  const refresh = useCallback(async () => {
    if (working.current) return
    working.current = true
    const current = ++epoch.current
    setBusy(true)
    setError('')
    const params = new URLSearchParams(location.search)
    const query: RuntimeQuery = { limit: 20 }
    for (const key of ['assessment_id', 'request_id', 'status', 'cursor'] as const) {
      const v = params.get(key)
      if (v) query[key] = v
    }
    if (params.get('history') === 'true') query.history = true
    try {
      const [failure, result] = await listRuntimeRequests(query)
      if (current !== epoch.current) return
      if (failure || !result?.data || !Array.isArray(result.data.items)) throw failure || new Error()
      setPage(result.data)
    } catch (e) {
      if (current === epoch.current) {
        setPage(null)
        setError(readError(e))
      }
    } finally {
      if (current === epoch.current) {
        working.current = false
        setBusy(false)
      }
    }
  }, [location.search])
  useEffect(() => {
    working.current = false
    setPage(null)
    refresh()
    return () => {
      epoch.current++
    }
  }, [refresh])
  useRefresh(Boolean(page?.items.some(active)), refresh)
  const navigate = (cursor = '') => {
    const next = new URLSearchParams()
    if (assessment.trim()) next.set('assessment_id', assessment.trim())
    if (request.trim()) next.set('request_id', request.trim())
    if (status) next.set('status', status)
    if (historical) next.set('history', 'true')
    if (cursor) next.set('cursor', cursor)
    history.push(`${base}?${next}`)
  }
  return (
    <Card
      title="用户解读请求"
      extra={
        <Button loading={busy} onClick={refresh}>
          刷新
        </Button>
      }
    >
      <Typography.Paragraph>
        输入测评编号查找全部相关请求。未指定编号时默认最近七天；历史记录时间未记录，单独查询。
      </Typography.Paragraph>
      <Space wrap>
        <Input
          aria-label="查找测评编号"
          placeholder="测评编号"
          value={assessment}
          onChange={(e) => setAssessment(e.target.value)}
        />
        <Input
          aria-label="查找请求编号"
          placeholder="请求 UUID（可选）"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
        />
        <Select
          aria-label="QS 接收状态"
          value={status}
          style={{ width: 165 }}
          onChange={setStatus}
          options={[
            { value: '', label: '全部 QS 状态' },
            ...Object.entries(statusNames).map(([value, label]) => ({
              value,
              label: value === 'completed' ? 'QS 已收到成果' : label
            }))
          ]}
        />
        <Checkbox checked={historical} onChange={(e) => setHistorical(e.target.checked)}>
          仅历史无时间记录
        </Checkbox>
        <Button
          type="primary"
          disabled={
            busy ||
            (!!request && !validUUID(request)) ||
            (!!assessment && !/^[1-9][0-9]*$/.test(assessment))
          }
          onClick={() => navigate()}
        >
          查找请求
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}
      {page?.partial && (
        <Alert
          type="warning"
          showIcon
          message="AI 证据暂不完整，下方保留 QS 已知记录。未读取到状态不代表未执行。"
        />
      )}
      {page && (
        <>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            QS 观测：{formatTime(page.observed_at)}；AI 观测：{formatTime(page.ai_observed_at)}
            。活动请求每十秒刷新，页面隐藏时暂停。
          </Typography.Paragraph>
          <Table<RuntimeRequest>
            rowKey="request_id"
            loading={busy}
            dataSource={page.items}
            pagination={false}
            scroll={{ x: 850 }}
            locale={{ emptyText: '没有符合条件的已索引请求；可按测评编号或切换历史记录查询。' }}
            columns={[
              { title: '测评编号', render: (_, row) => row.assessment_ids.join('、') },
              {
                title: '请求',
                render: function requestLink(_, row) {
                  return <Link to={`${base}/requests/${row.request_id}`}>{row.request_id}</Link>
                }
              },
              { title: '当前阶段', render: (_, row) => stage(row) },
              {
                title: 'QS 结果接收',
                render: (_, row) =>
                  row.status === 'completed'
                    ? '已收到成果'
                    : `状态 ${statusNames[row.status] || row.status} · v${row.version}`
              },
              {
                title: '创建时间',
                render: function createdTime(_, row) {
                  return row.created_at ? formatTime(row.created_at) : <Tag>历史记录</Tag>
                }
              }
            ]}
          />
          <Space style={{ marginTop: 16 }}>
            <Button onClick={() => history.goBack()}>返回上一页</Button>
            <Button
              disabled={!page.next_cursor || busy}
              onClick={() => {
                const next = new URLSearchParams(location.search)
                next.set('cursor', page.next_cursor)
                history.push(`${base}?${next}`)
              }}
            >
              下一页
            </Button>
          </Space>
        </>
      )}
    </Card>
  )
}
export function RuntimeRequestDetail({ owner }: { owner: string }): JSX.Element {
  const { requestID } = useParams<{ requestID: string }>()
  const [detail, setDetail] = useState<RuntimeDetail | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvidence | null>(null)
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [action, setAction] = useState(false)
  const epoch = useRef(0),
    working = useRef(false)
  const refresh = useCallback(async () => {
    if (working.current) return
    working.current = true
    const current = ++epoch.current
    setBusy(true)
    setError('')
    try {
      if (!validUUID(requestID)) throw { status: 404 }
      const [[failure, result], [timelineFailure, trace]] = await Promise.all([
        getRuntimeRequest(requestID),
        getRuntimeTimeline(requestID)
      ])
      const denied = timelineFailure as { status?: number; response?: { status?: number } } | null
      if (denied?.status === 403 || denied?.response?.status === 403) throw timelineFailure
      if (current !== epoch.current) return
      if (failure || !result?.data || result.data.request.request_id !== requestID)
        throw failure || new Error()
      setDetail(result.data)
      setTimeline(!timelineFailure && trace?.data.request_id === requestID ? trace.data : null)
    } catch (e) {
      if (current === epoch.current) {
        setDetail(null)
        setTimeline(null)
        setAction(false)
        setError(readError(e))
      }
    } finally {
      if (current === epoch.current) {
        working.current = false
        setBusy(false)
      }
    }
  }, [requestID])
  useEffect(() => {
    working.current = false
    setDetail(null)
    setTimeline(null)
    setAction(false)
    refresh()
    return () => {
      epoch.current++
    }
  }, [refresh])
  useRefresh(Boolean(detail && active({ ...detail.request, ai: detail.ai?.execution })), refresh)
  const ai = detail?.ai
  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Link to={base}>返回请求列表</Link>
        <Button loading={busy} onClick={refresh}>
          刷新详情
        </Button>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}
      {detail && (
        <>
          <Card title="请求进展">
            {detail.partial && (
              <Alert
                type="warning"
                showIcon
                message="AI 证据暂不可用，不能据此判断未执行；仅展示 QS 已知事实。"
              />
            )}
            <Descriptions column={1}>
              <Descriptions.Item label="测评">
                {detail.request.assessment_ids.join('、')}
              </Descriptions.Item>
              <Descriptions.Item label="请求">{detail.request.request_id}</Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                {stage({ ...detail.request, ai: ai?.execution })}
              </Descriptions.Item>
              <Descriptions.Item label="QS 结果接收">
                {detail.request.status === 'completed'
                  ? 'QS 已接收成果（不代表用户已阅读）'
                  : `${statusNames[detail.request.status] || detail.request.status} · v${
                    detail.request.version
                  }`}
              </Descriptions.Item>
              <Descriptions.Item label="尚待送达 AI 的命令">
                {detail.request.commands_pending}，累计尝试 {detail.request.command_attempts} 次
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatTime(detail.request.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="QS 观测时间">{formatTime(detail.observed_at)}</Descriptions.Item>
              <Descriptions.Item label="AI 观测时间">{formatTime(ai?.observed_at)}</Descriptions.Item>
            </Descriptions>
            {!detail.request.session_id && (
              <Alert
                type="info"
                message="尚未确认 AI 接收。请检查请求投递进程；不要重新创建用户请求。"
              />
            )}
            {ai && (
              <>
                {ai.execution.failure_code && (
                  <Alert
                    type="warning"
                    message={
                      failureNames[ai.execution.failure_code] ||
                      '执行被阻塞，需结合下方尝试与调用回执核对。'
                    }
                    description={`原因代码：${ai.execution.failure_code}`}
                  />
                )}
                <Descriptions column={1} title="本次固定配置">
                  <Descriptions.Item label="发布版本">
                    {ai.execution.publication_id || '历史记录未提供'}
                  </Descriptions.Item>
                  <Descriptions.Item label="配置指纹">
                    {ai.execution.publication_sha256 || '未记录'}
                  </Descriptions.Item>
                  <Descriptions.Item label="执行器版本">
                    {ai.execution.workflow_version}
                  </Descriptions.Item>
                  <Descriptions.Item label="当前执行">{ai.execution.run_id}</Descriptions.Item>
                </Descriptions>
                <Button onClick={() => setAction(!action)}>
                  {action ? '收起处置' : '核对允许的处置'}
                </Button>
                {action && (
                  <NativeParticipantRetryWorkspace
                    key={`${owner}:${detail.request.session_id}`}
                    owner={owner}
                    initialSessionID={detail.request.session_id}
                  />
                )}
              </>
            )}
          </Card>
          {ai && (
            <>
              <RuntimeTimeline value={timeline} />
              <Card title="执行尝试与模型回执" style={{ marginTop: 16 }}>
                {!ai.history_complete && (
                  <Alert
                    type="info"
                    message="以下为已有持久记录，不是完整日志；缺失时间不会推测补齐。"
                  />
                )}
                {ai.attempts_truncated && (
                  <Alert type="warning" message="仅展示最近 100 次执行，历史未全部加载。" />
                )}
                <Table
                  rowKey="run_id"
                  dataSource={ai.attempts}
                  pagination={false}
                  scroll={{ x: 750 }}
                  columns={[
                    { title: '执行', dataIndex: 'run_id' },
                    { title: '版本', dataIndex: 'session_version' },
                    { title: '状态', dataIndex: 'status', render: (v: string) => statusNames[v] || v },
                    { title: '执行队列', dataIndex: 'job_status' },
                    {
                      title: '模型回执',
                      dataIndex: 'model_call_status',
                      render: (v: string | null) => v || '未记录模型调用'
                    },
                    { title: '调用编号', dataIndex: 'invocation_id' },
                    { title: '调用开始', render: (_, row) => formatTime(row.model_call_created_at) }
                  ]}
                />
              </Card>
              <Card title="结果投递" style={{ marginTop: 16 }}>
                {ai.deliveries_truncated && (
                  <Alert type="warning" message="仅展示最近 100 条投递记录。" />
                )}
                <Table
                  rowKey="event_id"
                  dataSource={ai.deliveries}
                  pagination={false}
                  scroll={{ x: 650 }}
                  columns={[
                    { title: '事件', dataIndex: 'event_id' },
                    { title: '版本', dataIndex: 'version' },
                    {
                      title: '状态',
                      render: (_, row) => (row.delivered ? 'QS 已确认接收' : '等待投递或重投')
                    },
                    { title: '尝试次数', dataIndex: 'attempts' },
                    { title: '确认时间', render: (_, row) => formatTime(row.delivered_at) }
                  ]}
                />
                <Typography.Paragraph>结果重投沿用已生成成果，不再次调用模型。</Typography.Paragraph>
              </Card>
            </>
          )}
        </>
      )}
    </>
  )
}
export const RuntimeWorkspace = observer(({ detail = false }: { detail?: boolean }) => {
  const user = rootStore.userStore.currentUser
  if (!user || !rootStore.userStore.accessContext.capabilities.has('org_admin'))
    return <Alert type="warning" message="需要当前机构管理员权限才能查看用户解读请求。" />
  return detail ? (
    <RuntimeRequestDetail key={user.id} owner={user.id} />
  ) : (
    <>
      <RuntimeHealth key={`health:${user.id}`} />
      <RuntimeList key={user.id} />
    </>
  )
})
