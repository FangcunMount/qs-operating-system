import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AreaChartOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import moment from 'moment'
import {
  getResilienceGovernanceLinks,
  getResilienceStatuses,
  IResilienceBackpressureSnapshot,
  IResilienceCapabilitySnapshot,
  IResilienceComponentStatus,
  IResilienceGovernanceLinks,
  IResilienceQueueSnapshot
} from '@/api/path/resilienceGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

const { Paragraph, Text, Title } = Typography

const STATUS_POLL_INTERVAL_MS = 30000

const GRAFANA_LINK_ORDER: Array<keyof IResilienceGovernanceLinks> = [
  'overview',
  'ratelimit',
  'submitqueue',
  'backpressure',
  'locks'
]

const GRAFANA_LINK_META: Record<keyof IResilienceGovernanceLinks, { label: string; icon: React.ReactNode }> = {
  overview: { label: 'Grafana 总览', icon: <AreaChartOutlined /> },
  ratelimit: { label: 'Grafana 限流', icon: <DashboardOutlined /> },
  submitqueue: { label: 'Grafana SubmitQueue', icon: <DatabaseOutlined /> },
  backpressure: { label: 'Grafana 背压', icon: <ThunderboltOutlined /> },
  locks: { label: 'Grafana Redis Lock', icon: <LockOutlined /> }
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'Queued',
  processing: 'Processing',
  done: 'Done',
  failed: 'Failed'
}

const STATUS_COLORS: Record<string, string> = {
  queued: 'blue',
  processing: 'orange',
  done: 'green',
  failed: 'red'
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = moment(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

const formatSeconds = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

const renderHealthTag = (degraded: boolean, configured = true) => {
  if (!configured) return <Tag color="default">未配置</Tag>
  return <Tag color={degraded ? 'red' : 'green'}>{degraded ? 'Degraded' : 'Ready'}</Tag>
}

const renderTooltipText = (value?: string) => (
  <Tooltip title={value || '-'}>
    <span>{value || '-'}</span>
  </Tooltip>
)

interface CapabilityRow extends IResilienceCapabilitySnapshot {
  component: string
  category: string
}

const collectQueues = (components: IResilienceComponentStatus[]): IResilienceQueueSnapshot[] =>
  components.flatMap((item) => item.snapshot?.queues || [])

const collectBackpressure = (components: IResilienceComponentStatus[]): IResilienceBackpressureSnapshot[] =>
  components.flatMap((item) => item.snapshot?.backpressure || [])

const collectCapabilities = (components: IResilienceComponentStatus[]): CapabilityRow[] =>
  components.flatMap((item) => {
    const snapshot = item.snapshot
    if (!snapshot) return []
    return [
      ...(snapshot.rate_limits || []).map((cap) => ({ ...cap, component: snapshot.component, category: 'rate_limit' })),
      ...(snapshot.locks || []).map((cap) => ({ ...cap, component: snapshot.component, category: 'lock' })),
      ...(snapshot.idempotency || []).map((cap) => ({ ...cap, component: snapshot.component, category: 'idempotency' })),
      ...(snapshot.duplicate_suppression || []).map((cap) => ({ ...cap, component: snapshot.component, category: 'duplicate_suppression' }))
    ]
  })

const renderQueueStatusCounts = (_value: unknown, record: IResilienceQueueSnapshot) => (
  <Space wrap size={[4, 4]}>
    {Object.entries(record.status_counts || {}).map(([status, count]) => (
      <Tag key={status} color={STATUS_COLORS[status] || 'default'}>
        {STATUS_LABELS[status] || status}: {count}
      </Tag>
    ))}
  </Space>
)

const ResilienceGovernancePage: React.FC = () => {
  const [components, setComponents] = useState<IResilienceComponentStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const grafanaLinks = useMemo(() => getResilienceGovernanceLinks(), [])

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const result = await getResilienceStatuses()
      setComponents(result)
      setError('')
    } catch (requestError) {
      setError(extractErrorMessage(requestError, '获取高并发治理状态失败'))
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!pollingEnabled) return undefined
    const timer = window.setInterval(() => {
      void loadStatus(true)
    }, STATUS_POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [loadStatus, pollingEnabled])

  const queues = useMemo(() => collectQueues(components), [components])
  const backpressure = useMemo(() => collectBackpressure(components), [components])
  const capabilities = useMemo(() => collectCapabilities(components), [components])
  const degradedComponents = components.filter((item) => item.degraded)
  const degradedCapabilities = capabilities.filter((item) => item.degraded)
  const queueDepth = queues.reduce((total, item) => total + (item.depth || 0), 0)
  const queueCapacity = queues.reduce((total, item) => total + (item.capacity || 0), 0)
  const queueFailed = queues.reduce((total, item) => total + (item.status_counts?.failed || 0), 0)
  const inFlight = backpressure.reduce((total, item) => total + (item.in_flight || 0), 0)

  const componentColumns = useMemo<ColumnsType<IResilienceComponentStatus>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 190 },
      { title: 'Source', dataIndex: 'source', key: 'source', ellipsis: true, render: renderTooltipText },
      {
        title: '状态',
        key: 'health',
        width: 120,
        render: (_value, record) => renderHealthTag(record.degraded, record.configured)
      },
      {
        title: 'Capability',
        key: 'capability_count',
        width: 120,
        render: (_value, record) => record.snapshot?.summary?.capability_count ?? 0
      },
      {
        title: 'Degraded',
        key: 'degraded_count',
        width: 120,
        render: (_value, record) => record.snapshot?.summary?.degraded_count ?? (record.degraded ? 1 : 0)
      },
      {
        title: 'Generated At',
        key: 'generated_at',
        width: 180,
        render: (_value, record) => formatDateTime(record.snapshot?.generated_at)
      },
      { title: '错误', dataIndex: 'error', key: 'error', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const queueColumns = useMemo<ColumnsType<IResilienceQueueSnapshot>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 180 },
      { title: 'Queue', dataIndex: 'name', key: 'name', width: 220 },
      { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 150 },
      { title: 'Depth', dataIndex: 'depth', key: 'depth', width: 100 },
      { title: 'Capacity', dataIndex: 'capacity', key: 'capacity', width: 110 },
      {
        title: 'Status',
        key: 'status_counts',
        render: renderQueueStatusCounts
      },
      { title: 'TTL', dataIndex: 'status_ttl_seconds', key: 'status_ttl_seconds', width: 100, render: formatSeconds },
      { title: 'Lifecycle', dataIndex: 'lifecycle_boundary', key: 'lifecycle_boundary', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const backpressureColumns = useMemo<ColumnsType<IResilienceBackpressureSnapshot>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 160 },
      { title: 'Name', dataIndex: 'name', key: 'name', width: 160 },
      { title: 'Dependency', dataIndex: 'dependency', key: 'dependency', width: 150 },
      { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 130 },
      {
        title: '状态',
        key: 'health',
        width: 120,
        render: (_value, record) => renderHealthTag(record.degraded, record.enabled)
      },
      { title: 'In-flight', dataIndex: 'in_flight', key: 'in_flight', width: 110 },
      { title: 'Max', dataIndex: 'max_inflight', key: 'max_inflight', width: 90 },
      { title: 'Timeout', dataIndex: 'timeout_millis', key: 'timeout_millis', width: 110, render: (value: number) => `${value || 0}ms` },
      { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  const capabilityColumns = useMemo<ColumnsType<CapabilityRow>>(
    () => [
      { title: 'Component', dataIndex: 'component', key: 'component', width: 160 },
      { title: 'Category', dataIndex: 'category', key: 'category', width: 170 },
      { title: 'Name', dataIndex: 'name', key: 'name', width: 220 },
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 170 },
      { title: 'Strategy', dataIndex: 'strategy', key: 'strategy', width: 150 },
      {
        title: '状态',
        key: 'health',
        width: 120,
        render: (_value, record) => renderHealthTag(record.degraded, record.configured)
      },
      { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true, render: renderTooltipText }
    ],
    []
  )

  return (
    <div className="resilience-governance-page">
      <div className="resilience-governance-page__hero">
        <div className="resilience-governance-page__hero-main">
          <Space className="resilience-governance-page__hero-eyebrow" size={8}>
            <SafetyCertificateOutlined />
            <Text strong>Resilience Plane · RateLimit / Queue / Backpressure / Lock</Text>
          </Space>
          <Title level={3} className="resilience-governance-page__hero-title">
            高并发治理只读摘要
          </Title>
          <Paragraph className="resilience-governance-page__hero-description">
            当前页聚合 apiserver、collection-server、worker 的只读 snapshot；Grafana 用于查看
            Prometheus 历史趋势和告警。这里不提供限流调参、队列 drain、锁释放或 retry 动作。
          </Paragraph>
          <Space wrap className="resilience-governance-page__hero-tags">
            <Tag color="blue">Components：{components.length}</Tag>
            <Tag color={degradedComponents.length ? 'red' : 'green'}>Degraded：{degradedComponents.length}</Tag>
            <Tag color="geekblue">Queue depth：{queueDepth}</Tag>
            <Tag color="orange">Backpressure in-flight：{inFlight}</Tag>
          </Space>
        </div>

        <Space className="resilience-governance-page__grafana-links">
          {GRAFANA_LINK_ORDER.map((key) => {
            const href = grafanaLinks[key]
            const meta = GRAFANA_LINK_META[key]
            return (
              <Button
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                icon={meta.icon}
                type={key === 'overview' ? 'primary' : 'default'}
                disabled={!href}
              >
                {meta.label}
              </Button>
            )
          })}
        </Space>
      </div>

      <Space className="resilience-governance-page__header" align="start">
        <Space wrap>
          <Space className="resilience-governance-page__polling-control" align="center">
            <SyncOutlined />
            <Text>状态轮询</Text>
            <Switch checked={pollingEnabled} onChange={setPollingEnabled} checkedChildren="开" unCheckedChildren="关" />
            <Text type="secondary">每 30 秒刷新</Text>
          </Space>
        </Space>
        <Button icon={<ReloadOutlined />} onClick={() => loadStatus()} loading={loading}>
          刷新当前状态
        </Button>
      </Space>

      <Alert
        className="resilience-governance-page__alert"
        type="info"
        showIcon
        message="页面语义说明"
        description="Operating 展示的是多进程当前状态；Grafana 展示 qs_resilience_* 指标的趋势。collection/worker governance URL 未配置或不可用时，只标记该组件 degraded，不影响其他组件展示。"
      />

      {error ? (
        <Alert
          className="resilience-governance-page__alert"
          type="error"
          showIcon
          message="高并发治理状态获取失败"
          description={error}
        />
      ) : null}

      {degradedComponents.length ? (
        <Alert
          className="resilience-governance-page__alert"
          type="warning"
          showIcon
          message="存在组件状态降级"
          description={degradedComponents
            .map((item) => `${item.component}: ${item.error || item.snapshot?.summary?.degraded_count || 'degraded'}`)
            .join('；')}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="组件数" value={components.length} prefix={<ClusterOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="降级组件" value={degradedComponents.length} valueStyle={{ color: degradedComponents.length ? '#cf1322' : '#389e0d' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="队列深度" value={queueDepth} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="队列容量" value={queueCapacity} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="队列失败状态" value={queueFailed} valueStyle={{ color: queueFailed ? '#cf1322' : undefined }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="背压 In-flight" value={inFlight} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="resilience-governance-page__stat-card">
            <Statistic title="降级能力" value={degradedCapabilities.length} valueStyle={{ color: degradedCapabilities.length ? '#cf1322' : '#389e0d' }} />
          </Card>
        </Col>
      </Row>

      <Card className="resilience-governance-page__section" title="组件状态" loading={loading && !components.length}>
        <Table
          rowKey={(record) => record.component}
          columns={componentColumns}
          dataSource={components}
          pagination={false}
          size="small"
          scroll={{ x: 1100 }}
          rowClassName={(record) => (record.degraded ? 'resilience-governance-page__row--degraded' : '')}
          locale={{ emptyText: <Empty description="暂无组件状态" /> }}
        />
      </Card>

      <Card className="resilience-governance-page__section" title="SubmitQueue 状态" loading={loading && !components.length}>
        <Table
          rowKey={(record) => `${record.component}:${record.name}`}
          columns={queueColumns}
          dataSource={queues}
          pagination={false}
          size="small"
          scroll={{ x: 1200 }}
          locale={{ emptyText: <Empty description="暂无队列状态" /> }}
        />
      </Card>

      <Card className="resilience-governance-page__section" title="Backpressure 状态" loading={loading && !components.length}>
        <Table
          rowKey={(record) => `${record.component}:${record.name}`}
          columns={backpressureColumns}
          dataSource={backpressure}
          pagination={false}
          size="small"
          scroll={{ x: 1100 }}
          rowClassName={(record) => (record.degraded ? 'resilience-governance-page__row--degraded' : '')}
          locale={{ emptyText: <Empty description="暂无背压状态" /> }}
        />
      </Card>

      <Card className="resilience-governance-page__section" title="Rate Limit / Lock / Idempotency 能力" loading={loading && !components.length}>
        <Table
          rowKey={(record) => `${record.component}:${record.category}:${record.name}`}
          columns={capabilityColumns}
          dataSource={capabilities}
          pagination={false}
          size="small"
          scroll={{ x: 1200 }}
          rowClassName={(record) => (record.degraded ? 'resilience-governance-page__row--degraded' : '')}
          locale={{ emptyText: <Empty description="暂无能力状态" /> }}
        />
      </Card>
    </div>
  )
}

export default ResilienceGovernancePage
