import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
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
  ApiOutlined,
  AreaChartOutlined,
  ClockCircleOutlined,
  ClusterOutlined,
  DatabaseOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SyncOutlined
} from '@ant-design/icons'
import moment from 'moment'
import {
  getEventGovernanceLinks,
  getEventStatus,
  IEventGovernanceLinks,
  IEventOutboxBucket,
  IEventOutboxSummary,
  IEventStatusResponse
} from '@/api/path/eventGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

const { Paragraph, Text, Title } = Typography

const STATUS_POLL_INTERVAL_MS = 30000

const STATUS_LABELS: Record<string, string> = {
  pending: '待发布',
  failed: '失败待重试',
  publishing: '发布中'
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'blue',
  failed: 'red',
  publishing: 'orange'
}

const GRAFANA_LINK_ORDER: Array<keyof IEventGovernanceLinks> = ['overview', 'outbox', 'worker']

const GRAFANA_LINK_META: Record<keyof IEventGovernanceLinks, { label: string; icon: React.ReactNode }> = {
  overview: { label: 'Grafana 事件总览', icon: <AreaChartOutlined /> },
  outbox: { label: 'Grafana Outbox 趋势', icon: <DatabaseOutlined /> },
  worker: { label: 'Grafana Worker 消费', icon: <ClusterOutlined /> }
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = moment(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

const formatAge = (seconds?: number) => {
  if (!seconds || seconds <= 0) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

const getBucket = (outbox: IEventOutboxSummary | undefined, status: string): IEventOutboxBucket | undefined =>
  (outbox?.buckets || []).find((item) => item.status === status)

const getTotalCount = (outboxes: IEventOutboxSummary[], status: string) =>
  outboxes.reduce((total, item) => total + (getBucket(item, status)?.count || 0), 0)

const getMaxOldestAge = (outboxes: IEventOutboxSummary[]) =>
  outboxes.reduce((max, item) => Math.max(max, ...(item.buckets || []).map((bucket) => bucket.oldest_age_seconds || 0)), 0)

const renderStatusTag = (value: string) => (
  <Tag color={STATUS_COLORS[value] || 'default'}>{STATUS_LABELS[value] || value}</Tag>
)

const renderHealthTag = (value: boolean) => (
  <Tag color={value ? 'red' : 'green'}>{value ? 'Degraded' : 'Healthy'}</Tag>
)

const renderTooltipText = (value?: string) => (
  <Tooltip title={value || '-'}>
    <span>{value || '-'}</span>
  </Tooltip>
)

const EventGovernancePage: React.FC = () => {
  const [status, setStatus] = useState<IEventStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const grafanaLinks = useMemo(() => getEventGovernanceLinks(), [])

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
    }
    const [requestError, response] = await getEventStatus()
    if (requestError || !response?.data) {
      setError(extractErrorMessage(requestError, '获取事件系统状态失败'))
      if (!silent) {
        setLoading(false)
      }
      return
    }
    setStatus(response.data)
    setError('')
    if (!silent) {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (!pollingEnabled) {
      return undefined
    }
    const timer = window.setInterval(() => {
      void loadStatus(true)
    }, STATUS_POLL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [loadStatus, pollingEnabled])

  const outboxes = status?.outboxes || []
  const degradedOutboxes = outboxes.filter((item) => item.degraded)
  const pendingCount = getTotalCount(outboxes, 'pending')
  const failedCount = getTotalCount(outboxes, 'failed')
  const publishingCount = getTotalCount(outboxes, 'publishing')
  const oldestAge = getMaxOldestAge(outboxes)

  const outboxColumns = useMemo<ColumnsType<IEventOutboxSummary>>(
    () => [
      {
        title: 'Outbox',
        dataIndex: 'name',
        key: 'name',
        width: 220,
        render: renderTooltipText
      },
      {
        title: 'Store',
        dataIndex: 'store',
        key: 'store',
        width: 220,
        render: renderTooltipText
      },
      {
        title: '状态',
        dataIndex: 'degraded',
        key: 'degraded',
        width: 120,
        render: renderHealthTag
      },
      {
        title: 'Pending',
        key: 'pending',
        width: 120,
        render: (_value, record) => getBucket(record, 'pending')?.count || 0
      },
      {
        title: 'Failed',
        key: 'failed',
        width: 120,
        render: (_value, record) => getBucket(record, 'failed')?.count || 0
      },
      {
        title: 'Publishing',
        key: 'publishing',
        width: 120,
        render: (_value, record) => getBucket(record, 'publishing')?.count || 0
      },
      {
        title: '最老未完成',
        key: 'oldest_age',
        width: 140,
        render: (_value, record) => formatAge(getMaxOldestAge([record]))
      },
      {
        title: '最近采样',
        dataIndex: 'generated_at',
        key: 'generated_at',
        width: 180,
        render: (value?: string) => formatDateTime(value)
      },
      {
        title: '错误',
        dataIndex: 'error',
        key: 'error',
        ellipsis: true,
        render: renderTooltipText
      }
    ],
    []
  )

  const bucketColumns = useMemo<ColumnsType<IEventOutboxBucket & { outboxName: string }>>(
    () => [
      { title: 'Outbox', dataIndex: 'outboxName', key: 'outboxName', width: 220, render: renderTooltipText },
      { title: 'Bucket', dataIndex: 'status', key: 'status', width: 140, render: renderStatusTag },
      { title: '数量', dataIndex: 'count', key: 'count', width: 100 },
      {
        title: '最老年龄',
        dataIndex: 'oldest_age_seconds',
        key: 'oldest_age_seconds',
        width: 120,
        render: (value: number) => formatAge(value)
      },
      {
        title: '最老创建时间',
        dataIndex: 'oldest_created_at',
        key: 'oldest_created_at',
        render: (value?: string) => formatDateTime(value)
      }
    ],
    []
  )

  const bucketRows = useMemo(
    () => outboxes.flatMap((outbox) => (outbox.buckets || []).map((bucket) => ({
      ...bucket,
      outboxName: outbox.name
    }))),
    [outboxes]
  )

  return (
    <div className="event-governance-page">
      <div className="event-governance-page__hero">
        <div className="event-governance-page__hero-main">
          <Space className="event-governance-page__hero-eyebrow" size={8}>
            <ApiOutlined />
            <Text strong>事件系统 · Publish / Outbox / Consume</Text>
          </Space>
          <Title level={3} className="event-governance-page__hero-title">
            事件观测与出站状态
          </Title>
          <Paragraph className="event-governance-page__hero-description">
            当前页只读取 qs-server internal 状态接口，展示事件契约摘要与 outbox backlog / lag；
            历史趋势、告警和 handler 耗时请跳转 Grafana 查看。这里不提供 replay、repair、
            dead-letter 或手工 mark 操作。
          </Paragraph>
          <Space wrap className="event-governance-page__hero-tags">
            <Tag color="blue">Catalog events：{status?.catalog?.event_count || 0}</Tag>
            <Tag color="geekblue">Topics：{status?.catalog?.topic_count || 0}</Tag>
            <Tag color="orange">Durable outbox：{status?.catalog?.durable_outbox_count || 0}</Tag>
            <Tag color="default">最近更新时间：{formatDateTime(status?.generated_at)}</Tag>
          </Space>
        </div>

        <Space className="event-governance-page__grafana-links">
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

      <Space className="event-governance-page__header" align="start">
        <Space wrap>
          <Space className="event-governance-page__polling-control" align="center">
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
        className="event-governance-page__alert"
        type="info"
        showIcon
        message="页面语义说明"
        description="本页展示当前 snapshot；Grafana 展示 Prometheus 时序趋势。单个 outbox 状态读取失败时会标记 degraded，但不会代表事件治理动作可在本页执行。"
      />

      {error ? (
        <Alert
          className="event-governance-page__alert"
          type="error"
          showIcon
          message="事件系统状态获取失败"
          description={error}
        />
      ) : null}

      {degradedOutboxes.length ? (
        <Alert
          className="event-governance-page__alert"
          type="warning"
          showIcon
          message="存在 outbox status reader 降级"
          description={degradedOutboxes.map((item) => `${item.name}: ${item.error || 'unknown error'}`).join('；')}
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="event-governance-page__stat-card">
            <Statistic title="事件总数" value={status?.catalog?.event_count || 0} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="event-governance-page__stat-card">
            <Statistic title="Topic 总数" value={status?.catalog?.topic_count || 0} prefix={<ClusterOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="event-governance-page__stat-card">
            <Statistic
              title="Pending"
              value={pendingCount}
              valueStyle={{ color: pendingCount > 0 ? '#096dd9' : undefined }}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="event-governance-page__stat-card">
            <Statistic
              title="Failed"
              value={failedCount}
              valueStyle={{ color: failedCount > 0 ? '#cf1322' : undefined }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="event-governance-page__stat-card">
            <Statistic
              title="Publishing"
              value={publishingCount}
              valueStyle={{ color: publishingCount > 0 ? '#d46b08' : undefined }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="event-governance-page__stat-card">
            <Statistic title="最老未完成" value={formatAge(oldestAge)} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="event-governance-page__stat-card">
            <Statistic title="降级 Outbox" value={degradedOutboxes.length} valueStyle={{ color: degradedOutboxes.length ? '#cf1322' : '#389e0d' }} />
          </Card>
        </Col>
      </Row>

      <Card
        className="event-governance-page__section"
        title={(
          <Space size={8}>
            <ApiOutlined />
            <span>事件契约摘要</span>
          </Space>
        )}
        loading={loading && !status}
      >
        <Descriptions size="small" column={{ xs: 1, sm: 2, md: 4 }}>
          <Descriptions.Item label="Topic 数">{status?.catalog?.topic_count ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="事件数">{status?.catalog?.event_count ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Best effort">{status?.catalog?.best_effort_count ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Durable outbox">{status?.catalog?.durable_outbox_count ?? '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        className="event-governance-page__section"
        title={(
          <Space size={8}>
            <DatabaseOutlined />
            <span>Outbox Store 状态</span>
          </Space>
        )}
        loading={loading && !status}
      >
        <Table
          rowKey={(record) => record.name}
          columns={outboxColumns}
          dataSource={outboxes}
          pagination={false}
          size="small"
          scroll={{ x: 1300 }}
          rowClassName={(record) => (record.degraded ? 'event-governance-page__row--degraded' : '')}
          locale={{ emptyText: <Empty description="暂无 outbox 状态" /> }}
        />
      </Card>

      <Card
        className="event-governance-page__section"
        title={(
          <Space size={8}>
            <ClockCircleOutlined />
            <span>Backlog / Lag Bucket</span>
          </Space>
        )}
        loading={loading && !status}
      >
        <Table
          rowKey={(record) => `${record.outboxName}:${record.status}`}
          columns={bucketColumns}
          dataSource={bucketRows}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: <Empty description="暂无 backlog bucket" /> }}
        />
      </Card>
    </div>
  )
}

export default EventGovernancePage
