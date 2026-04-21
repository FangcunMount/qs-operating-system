import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  message,
  Modal,
  Row,
  Select,
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
  DashboardOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import moment from 'moment'
import {
  CACHE_GOVERNANCE_HOTSET_KINDS,
  CacheGovernanceHotsetKind,
  CacheGovernanceWarmupKind,
  getCacheGovernanceHotset,
  getCacheGovernanceLinks,
  getCacheGovernanceStatus,
  ICacheGovernanceFamilyStatus,
  ICacheGovernanceHotsetResponse,
  ICacheGovernanceManualWarmupItemResult,
  ICacheGovernanceManualWarmupResult,
  ICacheGovernanceManualWarmupTarget,
  ICacheGovernanceStatusResponse,
  ICacheGovernanceWarmupRun,
  postCacheGovernanceWarmupTargets
} from '@/api/path/cacheGovernance'
import { extractErrorMessage } from '@/utils/apiError'
import { getCurrentOrgId } from '@/utils/jwtClaims'
import './index.scss'

const { Title, Text } = Typography

const HOTSET_LIMIT = 20
const STATUS_POLL_INTERVAL_MS = 30000
const DEFAULT_STATUS_POLL_LIMIT = 10
const getInitialPageVisible = () => (typeof document === 'undefined' ? true : document.visibilityState === 'visible')

const DEFAULT_MANUAL_WARMUP_TARGET: ICacheGovernanceManualWarmupTarget = {
  kind: 'static.scale',
  scope: ''
}

const FAMILY_LABELS: Record<string, string> = {
  static_meta: 'Static',
  object_view: 'Object',
  query_result: 'Query',
  meta_hotset: 'Meta',
  sdk_token: 'SDK',
  lock_lease: 'Lock',
  ops_runtime: 'Ops'
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

const renderManualWarmupItemStatusTag = (value: ICacheGovernanceManualWarmupItemResult['status']) => {
  const color = value === 'ok' ? 'green' : value === 'skipped' ? 'default' : 'red'
  return <Tag color={color}>{value}</Tag>
}

const renderHotsetScope = (value: string) => (
  <Tooltip title={value}>
    <span>{value}</span>
  </Tooltip>
)

const getWarmupScopePlaceholder = (kind: CacheGovernanceWarmupKind, orgId?: number) => {
  switch (kind) {
  case 'static.scale':
    return 'scale:S-001'
  case 'static.questionnaire':
    return 'questionnaire:Q-001'
  case 'static.scale_list':
    return 'published'
  case 'query.stats_system':
    return `org:${orgId || 1}`
  case 'query.stats_questionnaire':
    return `org:${orgId || 1}:questionnaire:Q-001`
  case 'query.stats_plan':
    return `org:${orgId || 1}:plan:123`
  default:
    return ''
  }
}

const getScopeOrgId = (kind: CacheGovernanceWarmupKind, scope: string): number | undefined => {
  let match: RegExpMatchArray | null = null
  if (kind === 'query.stats_system') {
    match = scope.match(/^org:(\d+)$/)
  }
  if (kind === 'query.stats_questionnaire') {
    match = scope.match(/^org:(\d+):questionnaire:[^:\s]+$/)
  }
  if (kind === 'query.stats_plan') {
    match = scope.match(/^org:(\d+):plan:[^:\s]+$/)
  }
  if (!match) {
    return undefined
  }
  const orgId = Number(match[1])
  return Number.isSafeInteger(orgId) ? orgId : undefined
}

const validateManualWarmupTargets = (
  targets: ICacheGovernanceManualWarmupTarget[],
  currentOrgId?: number
): { validTargets?: ICacheGovernanceManualWarmupTarget[]; message?: string } => {
  if (!targets.length) {
    return { message: '至少添加一个预热目标' }
  }

  const validTargets = targets.map((item) => ({
    kind: item.kind,
    scope: item.scope.trim()
  }))

  for (let index = 0; index < validTargets.length; index += 1) {
    const item = validTargets[index]
    const prefix = `第 ${index + 1} 个目标`

    if (!CACHE_GOVERNANCE_HOTSET_KINDS.includes(item.kind)) {
      return { message: `${prefix} 的预热类型不受支持` }
    }

    if (!item.scope) {
      return { message: `${prefix} 的 scope 不能为空` }
    }

    switch (item.kind) {
    case 'static.scale':
      if (!/^scale:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 scale:S-001` }
      }
      break
    case 'static.questionnaire':
      if (!/^questionnaire:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 questionnaire:Q-001` }
      }
      break
    case 'static.scale_list':
      if (item.scope !== 'published') {
        return { message: `${prefix} 的 scope 目前只支持 published` }
      }
      break
    case 'query.stats_system':
      if (!/^org:(\d+)$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 org:1` }
      }
      break
    case 'query.stats_questionnaire':
      if (!/^org:(\d+):questionnaire:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 org:1:questionnaire:Q-001` }
      }
      break
    case 'query.stats_plan':
      if (!/^org:(\d+):plan:[^:\s]+$/.test(item.scope)) {
        return { message: `${prefix} 的 scope 必须形如 org:1:plan:123` }
      }
      break
    default:
      return { message: `${prefix} 的预热类型不受支持` }
    }

    if (item.kind.startsWith('query.')) {
      const scopeOrgId = getScopeOrgId(item.kind, item.scope)
      if (!currentOrgId) {
        return { message: `${prefix} 需要当前登录态具备受保护组织上下文` }
      }
      if (!scopeOrgId || scopeOrgId !== currentOrgId) {
        return { message: `${prefix} 的 org 必须与当前组织 ${currentOrgId} 完全一致` }
      }
    }
  }

  return { validTargets }
}

const CacheGovernancePage: React.FC = () => {
  const [status, setStatus] = useState<ICacheGovernanceStatusResponse | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [selectedKind, setSelectedKind] = useState<CacheGovernanceHotsetKind>('query.stats_system')
  const [hotset, setHotset] = useState<ICacheGovernanceHotsetResponse | null>(null)
  const [hotsetLoading, setHotsetLoading] = useState(false)
  const [hotsetError, setHotsetError] = useState('')
  const [manualWarmupVisible, setManualWarmupVisible] = useState(false)
  const [manualWarmupSubmitting, setManualWarmupSubmitting] = useState(false)
  const [manualWarmupError, setManualWarmupError] = useState('')
  const [manualWarmupResult, setManualWarmupResult] = useState<ICacheGovernanceManualWarmupResult | null>(null)
  const [manualWarmupTargets, setManualWarmupTargets] = useState<ICacheGovernanceManualWarmupTarget[]>([
    { ...DEFAULT_MANUAL_WARMUP_TARGET }
  ])
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [pollingLimit, setPollingLimit] = useState(DEFAULT_STATUS_POLL_LIMIT)
  const [pollingCount, setPollingCount] = useState(0)
  const [pageVisible, setPageVisible] = useState(getInitialPageVisible)
  const hotsetSelectionInitializedRef = useRef(false)

  const grafanaLinks = useMemo(() => getCacheGovernanceLinks(), [])
  const currentOrgId = getCurrentOrgId()

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
  }, [loadStatus])

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!pollingEnabled) {
      return undefined
    }
    if (!pageVisible) {
      return undefined
    }
    if (pollingCount >= pollingLimit) {
      setPollingEnabled(false)
      message.info(`缓存治理轮询已达到上限 ${pollingLimit} 次，已自动停止`)
      return undefined
    }

    const timer = window.setTimeout(() => {
      loadStatus(true)
      setPollingCount((current) => current + 1)
    }, STATUS_POLL_INTERVAL_MS)

    return () => window.clearTimeout(timer)
  }, [loadStatus, pageVisible, pollingCount, pollingEnabled, pollingLimit])

  useEffect(() => {
    if (!hotsetSelectionInitializedRef.current) {
      hotsetSelectionInitializedRef.current = true
      return
    }
    loadHotset(selectedKind)
  }, [loadHotset, selectedKind])

  const refreshAll = useCallback(() => {
    loadStatus()
    loadHotset(selectedKind)
  }, [loadHotset, loadStatus, selectedKind])

  const handlePollingToggle = useCallback((checked: boolean) => {
    if (checked) {
      loadStatus(true)
      setPollingCount(1)
      setPollingEnabled(true)
      return
    }
    setPollingEnabled(false)
  }, [loadStatus])

  const handlePollingLimitChange = useCallback((value: number | null) => {
    if (!value || !Number.isFinite(value)) {
      return
    }
    setPollingLimit(Math.max(1, Math.floor(value)))
  }, [])

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

  const manualWarmupColumns = useMemo<ColumnsType<ICacheGovernanceManualWarmupItemResult>>(
    () => [
      {
        title: 'Family',
        dataIndex: 'family',
        key: 'family',
        width: 140,
        render: (value: string) => FAMILY_LABELS[value] || value
      },
      { title: 'Kind', dataIndex: 'kind', key: 'kind', width: 180 },
      {
        title: 'Scope',
        dataIndex: 'scope',
        key: 'scope',
        render: renderTooltipText
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: renderManualWarmupItemStatusTag
      },
      {
        title: 'Message',
        dataIndex: 'message',
        key: 'message',
        render: renderTooltipText
      }
    ],
    []
  )

  const updateManualWarmupTarget = useCallback((index: number, patch: Partial<ICacheGovernanceManualWarmupTarget>) => {
    setManualWarmupTargets((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) {
        return item
      }
      return { ...item, ...patch }
    }))
  }, [])

  const addManualWarmupTarget = useCallback(() => {
    setManualWarmupTargets((current) => [...current, { ...DEFAULT_MANUAL_WARMUP_TARGET }])
  }, [])

  const removeManualWarmupTarget = useCallback((index: number) => {
    setManualWarmupTargets((current) => {
      if (current.length <= 1) {
        return current
      }
      return current.filter((_item, itemIndex) => itemIndex !== index)
    })
  }, [])

  const openManualWarmupModal = useCallback(() => {
    setManualWarmupVisible(true)
    setManualWarmupError('')
    setManualWarmupResult(null)
    setManualWarmupTargets([{ ...DEFAULT_MANUAL_WARMUP_TARGET }])
  }, [])

  const closeManualWarmupModal = useCallback(() => {
    if (manualWarmupSubmitting) {
      return
    }
    setManualWarmupVisible(false)
  }, [manualWarmupSubmitting])

  const submitManualWarmup = useCallback(async () => {
    const validation = validateManualWarmupTargets(manualWarmupTargets, currentOrgId)
    if (!validation.validTargets) {
      const validationMessage = validation.message || '手工预热请求不合法'
      setManualWarmupError(validationMessage)
      message.error(validationMessage)
      return
    }

    setManualWarmupSubmitting(true)
    setManualWarmupError('')
    const [error, response] = await postCacheGovernanceWarmupTargets({ targets: validation.validTargets })
    if (error || !response?.data) {
      const errorMessage = extractErrorMessage(error, '手工预热执行失败')
      setManualWarmupError(errorMessage)
      setManualWarmupSubmitting(false)
      return
    }

    setManualWarmupResult(response.data)
    await loadStatus(true)
    setManualWarmupSubmitting(false)

    if (response.data.summary.result === 'ok') {
      message.success('手工预热执行完成')
      return
    }
    if (response.data.summary.result === 'partial') {
      message.warning('手工预热已执行完成，但存在部分失败项')
      return
    }
    if (response.data.summary.result === 'skipped') {
      message.info('手工预热已执行完成，目标全部被跳过')
      return
    }
    message.warning('手工预热已执行完成，请检查明细结果')
  }, [currentOrgId, loadStatus, manualWarmupTargets])

  const warmupRuns = status?.warmup?.latest_runs || []
  const summary = status?.summary
  const queryDegraded = families.some((item) => item.family === 'query_result' && item.degraded)
  const metaDegraded = families.some((item) => item.family === 'meta_hotset' && item.degraded)
  const disableHotsetPreview = Boolean(statusError)
  const pollingPausedByVisibility = pollingEnabled && !pageVisible

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
          <Space className="cache-governance-page__polling-control" align="center">
            <Text>状态轮询</Text>
            <Switch checked={pollingEnabled} onChange={handlePollingToggle} checkedChildren="开" unCheckedChildren="关" />
            <Text type="secondary">已轮询 {pollingCount}/{pollingLimit} 次</Text>
            {pollingPausedByVisibility ? <Tag color="orange">页面不可见，已暂停</Tag> : null}
            <InputNumber
              min={1}
              max={50}
              precision={0}
              value={pollingLimit}
              onChange={handlePollingLimitChange}
            />
            <Text type="secondary">次后自动停止</Text>
          </Space>
          <Button type="primary" onClick={openManualWarmupModal}>
            手工预热
          </Button>
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
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic title="Family 总数" value={summary?.family_total || 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic title="Available" value={summary?.available_count || 0} valueStyle={{ color: '#389e0d' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic title="Degraded" value={summary?.degraded_count || 0} valueStyle={{ color: '#d46b08' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card>
            <Statistic title="Unavailable" value={summary?.unavailable_count || 0} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card>
            <Statistic title="Runtime Ready" value={summary?.ready ? 'Ready' : 'Not Ready'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card>
            <Statistic title="Warmup" value={status?.warmup?.enabled ? 'Enabled' : 'Disabled'} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card>
            <Statistic title="Hotset" value={status?.warmup?.hotset?.enable ? 'Enabled' : 'Disabled'} />
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

      <Modal
        visible={manualWarmupVisible}
        title="手工预热"
        width={960}
        okText="执行预热"
        cancelText="关闭"
        confirmLoading={manualWarmupSubmitting}
        onOk={submitManualWarmup}
        onCancel={closeManualWarmupModal}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="手工预热会同步调用 qs-server 的 warmup-targets 内部接口"
            description={`当前组织：${currentOrgId || '未识别'}。查询类 scope 必须带 org:<id> 且必须与当前组织一致；静态类 target 不要求 org。`}
          />

          {manualWarmupError ? (
            <Alert
              type="error"
              showIcon
              message="手工预热执行失败"
              description={manualWarmupError}
            />
          ) : null}

          <div>
            {manualWarmupTargets.map((item, index) => (
              <Space key={`${item.kind}-${index}`} className="cache-governance-page__manual-target-row" align="start">
                <Select<CacheGovernanceWarmupKind>
                  value={item.kind}
                  style={{ width: 220 }}
                  onChange={(value) => updateManualWarmupTarget(index, { kind: value, scope: '' })}
                >
                  {CACHE_GOVERNANCE_HOTSET_KINDS.map((kind) => (
                    <Select.Option key={kind} value={kind}>
                      {kind}
                    </Select.Option>
                  ))}
                </Select>
                <Input
                  value={item.scope}
                  className="cache-governance-page__manual-target-input"
                  placeholder={getWarmupScopePlaceholder(item.kind, currentOrgId)}
                  onChange={(event) => updateManualWarmupTarget(index, { scope: event.target.value })}
                />
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeManualWarmupTarget(index)}
                  disabled={manualWarmupTargets.length <= 1}
                >
                  删除
                </Button>
              </Space>
            ))}
            <Space className="cache-governance-page__manual-target-actions">
              <Button icon={<PlusOutlined />} onClick={addManualWarmupTarget}>
                添加目标
              </Button>
              <Text type="secondary">
                例：<code>scale:S-001</code>、<code>questionnaire:Q-001</code>、<code>published</code>、<code>{`org:${currentOrgId || 1}`}</code>
              </Text>
            </Space>
          </div>

          {manualWarmupResult ? (
            <Card size="small" title="执行结果" className="cache-governance-page__manual-result">
              <Descriptions
                className="cache-governance-page__manual-result-summary"
                size="small"
                column={{ xs: 1, sm: 2, md: 3 }}
              >
                <Descriptions.Item label="Trigger">{manualWarmupResult.trigger}</Descriptions.Item>
                <Descriptions.Item label="Started At">{formatDateTime(manualWarmupResult.started_at)}</Descriptions.Item>
                <Descriptions.Item label="Finished At">{formatDateTime(manualWarmupResult.finished_at)}</Descriptions.Item>
                <Descriptions.Item label="Result">{renderWarmupResultTag(manualWarmupResult.summary.result)}</Descriptions.Item>
                <Descriptions.Item label="Targets">{manualWarmupResult.summary.target_count}</Descriptions.Item>
                <Descriptions.Item label="OK">{manualWarmupResult.summary.ok_count}</Descriptions.Item>
                <Descriptions.Item label="Skipped">{manualWarmupResult.summary.skipped_count}</Descriptions.Item>
                <Descriptions.Item label="Errors">{manualWarmupResult.summary.error_count}</Descriptions.Item>
              </Descriptions>

              <Table
                rowKey={(record) => `${record.kind}:${record.scope}`}
                columns={manualWarmupColumns}
                dataSource={manualWarmupResult.items}
                pagination={false}
                size="small"
                scroll={{ x: 900 }}
                locale={{ emptyText: <Empty description="暂无手工预热结果" /> }}
              />
            </Card>
          ) : null}
        </Space>
      </Modal>
    </div>
  )
}

export default CacheGovernancePage
