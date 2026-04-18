import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { DashboardOutlined, ReloadOutlined } from '@ant-design/icons'
import moment from 'moment'
import {
  CACHE_GOVERNANCE_HOTSET_KINDS,
  CacheGovernanceHotsetKind,
  getCacheGovernanceHotset,
  getCacheGovernanceLinks,
  getCacheGovernanceStatus,
  ICacheGovernanceFamilyStatus,
  ICacheGovernanceHotsetResponse,
  ICacheGovernanceStatusResponse,
  ICacheGovernanceWarmupRun
} from '@/api/path/cacheGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

const { Title, Text } = Typography

const HOTSET_LIMIT = 20

const FAMILY_LABELS: Record<string, string> = {
  static_meta: 'Static',
  object_view: 'Object',
  query_result: 'Query',
  meta_hotset: 'Meta',
  sdk_token: 'SDK',
  lock_lease: 'Lock'
}

const FAMILY_ORDER = ['static_meta', 'object_view', 'query_result', 'meta_hotset', 'sdk_token', 'lock_lease']

const GRAFANA_LINK_LABELS: Record<string, string> = {
  overview: '查看 Grafana 缓存总览',
  family: 'Family 状态趋势',
  warmup: 'Warmup 运行趋势',
  hotset: 'Hotset 热度趋势',
  query_version: 'Version Token 观测',
  worker_lock: '查看 Grafana Worker 锁治理'
}

const formatDateTime = (value?: string) => {
  if (!value) return '-'
  const parsed = moment(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

const renderBooleanTag = (value: boolean, positiveText = '是', negativeText = '否') => (
  <Tag color={value ? 'green' : 'default'}>{value ? positiveText : negativeText}</Tag>
)

const renderModeTag = (mode: string) => {
  switch (mode) {
  case 'named_profile':
    return <Tag color="blue">named_profile</Tag>
  case 'fallback_default':
    return <Tag color="orange">fallback_default</Tag>
  case 'degraded':
    return <Tag color="red">degraded</Tag>
  case 'disabled':
    return <Tag color="default">disabled</Tag>
  default:
    return <Tag color="green">{mode || 'default'}</Tag>
  }
}

const renderTooltipText = (value?: string) => (
  <Tooltip title={value || '-'}>
    <span>{value || '-'}</span>
  </Tooltip>
)

const renderWarmupResultTag = (value: string) => {
  const color = value === 'ok' ? 'green' : value === 'partial' ? 'orange' : value === 'skipped' ? 'default' : 'red'
  return <Tag color={color}>{value}</Tag>
}

const renderHotsetScope = (value: string) => (
  <Tooltip title={value}>
    <span>{value}</span>
  </Tooltip>
)

const CacheGovernancePage: React.FC = () => {
  const [status, setStatus] = useState<ICacheGovernanceStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [selectedKind, setSelectedKind] = useState<CacheGovernanceHotsetKind>('query.stats_system')
  const [hotset, setHotset] = useState<ICacheGovernanceHotsetResponse | null>(null)
  const [hotsetLoading, setHotsetLoading] = useState(false)
  const [hotsetError, setHotsetError] = useState('')

  const grafanaLinks = useMemo(() => getCacheGovernanceLinks(), [])

  const loadStatus = useCallback(async (silent = false) => {
    if (!silent) {
      setStatusLoading(true)
    }
    const [error, response] = await getCacheGovernanceStatus()
    if (error || !response?.data) {
      setStatusError(extractErrorMessage(error, '获取缓存治理状态失败'))
      if (!silent) {
        setStatusLoading(false)
      }
      return
    }
    setStatus(response.data)
    setStatusError('')
    if (!silent) {
      setStatusLoading(false)
    }
  }, [])

  const loadHotset = useCallback(async (kind: CacheGovernanceHotsetKind, silent = false) => {
    if (!silent) {
      setHotsetLoading(true)
    }
    const [error, response] = await getCacheGovernanceHotset(kind, HOTSET_LIMIT)
    if (error || !response?.data) {
      setHotsetError(extractErrorMessage(error, '获取热点预览失败'))
      if (!silent) {
        setHotsetLoading(false)
      }
      return
    }
    setHotset(response.data)
    setHotsetError('')
    if (!silent) {
      setHotsetLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    const timer = window.setInterval(() => {
      loadStatus(true)
    }, 30000)
    return () => window.clearInterval(timer)
  }, [loadStatus])

  useEffect(() => {
    loadHotset(selectedKind)
  }, [loadHotset, selectedKind])

  const refreshAll = useCallback(() => {
    loadStatus()
    loadHotset(selectedKind)
  }, [loadHotset, loadStatus, selectedKind])

  const families = useMemo(() => {
    const items = status?.families || []
    return [...items].sort((left, right) => {
      const leftIndex = FAMILY_ORDER.indexOf(left.family)
      const rightIndex = FAMILY_ORDER.indexOf(right.family)
      const normalizedLeft = leftIndex === -1 ? 99 : leftIndex
      const normalizedRight = rightIndex === -1 ? 99 : rightIndex
      if (normalizedLeft === normalizedRight) {
        return left.family.localeCompare(right.family)
      }
      return normalizedLeft - normalizedRight
    })
  }, [status?.families])

  const warmupRuns = status?.warmup?.latest_runs || []
  const summary = status?.summary
  const queryDegraded = families.some((item) => item.family === 'query_result' && item.degraded)
  const metaDegraded = families.some((item) => item.family === 'meta_hotset' && item.degraded)
  const disableHotsetPreview = Boolean(statusError)

  const familyColumns = useMemo<ColumnsType<ICacheGovernanceFamilyStatus>>(
    () => [
      {
        title: 'Family',
        dataIndex: 'family',
        key: 'family',
        width: 150,
        render: (value: string) => FAMILY_LABELS[value] || value
      },
      { title: 'Profile', dataIndex: 'profile', key: 'profile', width: 140, render: (value: string) => value || '-' },
      {
        title: 'Namespace',
        dataIndex: 'namespace',
        key: 'namespace',
        width: 220,
        ellipsis: true,
        render: renderTooltipText
      },
      {
        title: 'Mode',
        dataIndex: 'mode',
        key: 'mode',
        width: 140,
        render: (value: string) => renderModeTag(value)
      },
      {
        title: 'Available',
        dataIndex: 'available',
        key: 'available',
        width: 110,
        render: (value: boolean) => renderBooleanTag(value)
      },
      {
        title: 'Degraded',
        dataIndex: 'degraded',
        key: 'degraded',
        width: 110,
        render: (value: boolean) => renderBooleanTag(value)
      },
      {
        title: 'Configured',
        dataIndex: 'configured',
        key: 'configured',
        width: 110,
        render: (value: boolean) => renderBooleanTag(value)
      },
      {
        title: 'Last Success',
        dataIndex: 'last_success_at',
        key: 'last_success_at',
        width: 180,
        render: (value?: string) => formatDateTime(value)
      },
      {
        title: 'Last Failure',
        dataIndex: 'last_failure_at',
        key: 'last_failure_at',
        width: 180,
        render: (value?: string) => formatDateTime(value)
      },
      {
        title: 'Consecutive Failures',
        dataIndex: 'consecutive_failures',
        key: 'consecutive_failures',
        width: 160
      },
      {
        title: 'Last Error',
        dataIndex: 'last_error',
        key: 'last_error',
        ellipsis: true,
        render: renderTooltipText
      }
    ],
    []
  )

  const warmupColumns = useMemo<ColumnsType<ICacheGovernanceWarmupRun>>(
    () => [
      { title: 'Trigger', dataIndex: 'trigger', key: 'trigger', width: 140 },
      { title: 'Started At', dataIndex: 'started_at', key: 'started_at', width: 180, render: (value?: string) => formatDateTime(value) },
      { title: 'Finished At', dataIndex: 'finished_at', key: 'finished_at', width: 180, render: (value?: string) => formatDateTime(value) },
      {
        title: 'Result',
        dataIndex: 'result',
        key: 'result',
        width: 120,
        render: renderWarmupResultTag
      },
      { title: 'Targets', dataIndex: 'target_count', key: 'target_count', width: 100 },
      { title: 'OK', dataIndex: 'ok_count', key: 'ok_count', width: 80 },
      { title: 'Errors', dataIndex: 'error_count', key: 'error_count', width: 80 },
      { title: 'Skipped', dataIndex: 'skipped_count', key: 'skipped_count', width: 90 }
    ],
    []
  )

  const hotsetColumns = useMemo<ColumnsType<{ scope: string; score: number }>>(
    () => [
      {
        title: 'Scope',
        dataIndex: 'scope',
        key: 'scope',
        render: renderHotsetScope
      },
      { title: 'Score', dataIndex: 'score', key: 'score', width: 120 }
    ],
    []
  )

  return (
    <div className="cache-governance-page">
      <Space className="cache-governance-page__header" align="start">
        <div>
          <Title level={3}>缓存治理</Title>
          <Text type="secondary">
            更新时间：{formatDateTime(status?.generated_at)}
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={statusLoading || hotsetLoading}>
            刷新
          </Button>
          {Object.entries(grafanaLinks).map(([key, href]) => (
            <Button
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              icon={<DashboardOutlined />}
              disabled={!href}
            >
              {GRAFANA_LINK_LABELS[key] || key}
            </Button>
          ))}
        </Space>
      </Space>

      {statusError ? (
        <Alert
          className="cache-governance-page__alert"
          type="error"
          showIcon
          message="缓存治理状态获取失败"
          description={statusError}
        />
      ) : null}

      {!statusError && (queryDegraded || metaDegraded) ? (
        <Space direction="vertical" className="cache-governance-page__alert-stack">
          {queryDegraded ? (
            <Alert showIcon type="warning" message="Query family 当前处于 degraded，查询类 warmup 和热点命中可能受影响。" />
          ) : null}
          {metaDegraded ? (
            <Alert showIcon type="warning" message="Meta family 当前处于 degraded，热点预览和 version token 观测可能不完整。" />
          ) : null}
        </Space>
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Family 总数" value={summary?.family_total || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Available" value={summary?.available_count || 0} valueStyle={{ color: '#389e0d' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Degraded" value={summary?.degraded_count || 0} valueStyle={{ color: '#d46b08' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Unavailable" value={summary?.unavailable_count || 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Warmup" value={summary?.warmup_enabled ? 'Enabled' : 'Disabled'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
          <Card>
            <Statistic title="Hotset" value={summary?.hotset_enabled ? 'Enabled' : 'Disabled'} />
          </Card>
        </Col>
      </Row>

      <Card className="cache-governance-page__section" title="Family 状态" loading={statusLoading && !status}>
        <Table
          rowKey={(record) => `${record.component}:${record.family}`}
          columns={familyColumns}
          dataSource={families}
          pagination={false}
          size="small"
          scroll={{ x: 1500 }}
          rowClassName={(record) => {
            if (record.degraded || record.mode === 'degraded') return 'cache-governance-page__row--degraded'
            if (!record.available) return 'cache-governance-page__row--unavailable'
            return ''
          }}
          locale={{ emptyText: <Empty description="暂无 family 状态" /> }}
        />
      </Card>

      <Card className="cache-governance-page__section" title="Warmup 状态" loading={statusLoading && !status}>
        <Descriptions className="cache-governance-page__descriptions" size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="Enabled">{renderBooleanTag(status?.warmup?.enabled || false)}</Descriptions.Item>
          <Descriptions.Item label="Startup.Static">{renderBooleanTag(status?.warmup?.startup?.static || false)}</Descriptions.Item>
          <Descriptions.Item label="Startup.Query">{renderBooleanTag(status?.warmup?.startup?.query || false)}</Descriptions.Item>
          <Descriptions.Item label="Hotset.Enable">{renderBooleanTag(status?.warmup?.hotset?.enable || false)}</Descriptions.Item>
          <Descriptions.Item label="Hotset.Top N">{status?.warmup?.hotset?.top_n ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="Hotset.Max Items">{status?.warmup?.hotset?.max_items_per_kind ?? '-'}</Descriptions.Item>
        </Descriptions>

        <Table
          rowKey={(record) => `${record.trigger}:${record.started_at || 'unknown'}`}
          columns={warmupColumns}
          dataSource={warmupRuns}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: <Empty description="暂无 warmup 执行记录" /> }}
        />
      </Card>

      <Card
        className="cache-governance-page__section"
        title="Hotset 预览"
        extra={(
          <Space>
            <Select<CacheGovernanceHotsetKind>
              value={selectedKind}
              style={{ width: 240 }}
              onChange={setSelectedKind}
            >
              {CACHE_GOVERNANCE_HOTSET_KINDS.map((kind) => (
                <Select.Option key={kind} value={kind}>
                  {kind}
                </Select.Option>
              ))}
            </Select>
            <Button onClick={() => loadHotset(selectedKind)} loading={hotsetLoading}>
              刷新热点
            </Button>
          </Space>
        )}
        loading={hotsetLoading && !hotset}
      >
        {disableHotsetPreview ? (
          <Alert showIcon type="info" message="状态接口异常，Hotset 预览已暂时置灰。" />
        ) : null}
        {!disableHotsetPreview && hotsetError ? (
          <Alert className="cache-governance-page__alert" type="error" showIcon message="热点预览获取失败" description={hotsetError} />
        ) : null}
        {!disableHotsetPreview && hotset?.degraded ? (
          <Alert
            className="cache-governance-page__alert"
            type="warning"
            showIcon
            message="热点预览当前为 degraded"
            description={hotset.message || '热点预览可能不完整'}
          />
        ) : null}

        <Descriptions className="cache-governance-page__descriptions" size="small" column={{ xs: 1, sm: 3 }}>
          <Descriptions.Item label="Family">{FAMILY_LABELS[hotset?.family || ''] || hotset?.family || '-'}</Descriptions.Item>
          <Descriptions.Item label="Available">{renderBooleanTag(hotset?.available || false)}</Descriptions.Item>
          <Descriptions.Item label="Degraded">{renderBooleanTag(hotset?.degraded || false)}</Descriptions.Item>
        </Descriptions>

        <Table
          rowKey={(record) => record.scope}
          columns={hotsetColumns}
          dataSource={disableHotsetPreview ? [] : hotset?.items || []}
          pagination={false}
          size="small"
          locale={{ emptyText: <Empty description="暂无热点数据" /> }}
        />
      </Card>
    </div>
  )
}

export default CacheGovernancePage
