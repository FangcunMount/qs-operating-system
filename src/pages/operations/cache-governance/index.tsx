import React, { useMemo } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  InputNumber,
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
  AppstoreOutlined,
  AreaChartOutlined,
  ClusterOutlined,
  DashboardOutlined,
  DeleteOutlined,
  FireOutlined,
  InfoCircleOutlined,
  LockOutlined,
  PlusOutlined,
  ReloadOutlined,
  SyncOutlined,
  ThunderboltOutlined
} from '@ant-design/icons'
import moment from 'moment'
import {
  CACHE_GOVERNANCE_HOTSET_KINDS,
  CACHE_GOVERNANCE_WARMUP_KINDS,
  CacheGovernanceHotsetKind,
  CacheGovernanceWarmupKind,
  getCacheGovernanceLinks,
  ICacheGovernanceLinks,
  ICacheGovernanceFamilyStatus,
  ICacheGovernanceManualWarmupItemResult,
  ICacheGovernanceWarmupRun
} from '@/api/path/cacheGovernance'
import { useBoundedPolling } from './hooks/useBoundedPolling'
import { useCacheGovernanceStatus } from './hooks/useCacheGovernanceStatus'
import { useManualWarmup } from './hooks/useManualWarmup'
import { getWarmupScopePlaceholder } from './utils'
import './index.scss'

const { Paragraph, Text, Title } = Typography

const STATUS_POLL_INTERVAL_MS = 30000
const DEFAULT_STATUS_POLL_LIMIT = 10

const FAMILY_LABELS: Record<string, string> = {
  static_meta: '静态元数据',
  object_view: '对象视图',
  query_result: '查询结果',
  meta_hotset: '热点元数据',
  sdk_token: 'SDK 令牌',
  lock_lease: '锁租约',
  ops_runtime: '运行态'
}

const COMPONENT_LABELS: Record<string, string> = {
  apiserver: 'qs-apiserver',
  worker: 'qs-worker',
  'collection-server': 'qs-collection-server'
}

const KIND_LABELS: Record<string, string> = {
  'static.scale': '静态量表',
  'static.questionnaire': '静态问卷',
  'static.scale_list': '量表列表',
  'query.stats_system': '系统统计查询',
  'query.stats_questionnaire': '问卷统计查询',
  'query.stats_plan': '计划统计查询'
}

const GRAFANA_LINK_ORDER: Array<keyof ICacheGovernanceLinks> = [
  'overview',
  'family',
  'warmup',
  'hotset',
  'query_version',
  'worker_lock'
]

const GRAFANA_LINK_META: Record<keyof ICacheGovernanceLinks, { label: string; icon: React.ReactNode }> = {
  overview: { label: 'Grafana 全局缓存趋势', icon: <AreaChartOutlined /> },
  family: { label: 'Grafana 缓存族趋势', icon: <AppstoreOutlined /> },
  warmup: { label: 'Grafana 预热趋势', icon: <ThunderboltOutlined /> },
  hotset: { label: 'Grafana 热点趋势', icon: <FireOutlined /> },
  query_version: { label: 'Grafana 版本令牌趋势', icon: <SyncOutlined /> },
  worker_lock: { label: 'Grafana Worker 锁趋势', icon: <LockOutlined /> }
}

const formatComponentLabel = (value?: string) => {
  if (!value) return 'qs-apiserver'
  return COMPONENT_LABELS[value] || value
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
    return <Tag color="blue">命名配置</Tag>
  case 'fallback_default':
    return <Tag color="orange">回退默认</Tag>
  case 'degraded':
    return <Tag color="red">降级</Tag>
  case 'disabled':
    return <Tag color="default">已禁用</Tag>
  default:
    return <Tag color="green">{mode || '默认'}</Tag>
  }
}

const renderTooltipText = (value?: string) => (
  <Tooltip title={value || '-'}>
    <span>{value || '-'}</span>
  </Tooltip>
)

const renderWarmupResultTag = (value: string) => {
  const color = value === 'ok' ? 'green' : value === 'partial' ? 'orange' : value === 'skipped' ? 'default' : 'red'
  const label = value === 'ok' ? '成功' : value === 'partial' ? '部分成功' : value === 'skipped' ? '已跳过' : '失败'
  return <Tag color={color}>{label}</Tag>
}

const renderManualWarmupItemStatusTag = (value: ICacheGovernanceManualWarmupItemResult['status']) => {
  const color = value === 'ok' ? 'green' : value === 'skipped' ? 'default' : 'red'
  const label = value === 'ok' ? '成功' : value === 'skipped' ? '跳过' : '失败'
  return <Tag color={color}>{label}</Tag>
}

const renderHotsetScope = (value: string) => (
  <Tooltip title={value}>
    <span>{value}</span>
  </Tooltip>
)

const CacheGovernancePage: React.FC = () => {
  const grafanaLinks = useMemo(() => getCacheGovernanceLinks(), [])

  const {
    status,
    statusLoading,
    statusError,
    selectedKind,
    setSelectedKind,
    hotset,
    hotsetLoading,
    hotsetError,
    families,
    warmupRuns,
    summary,
    queryDegraded,
    metaDegraded,
    disableHotsetPreview,
    loadStatus,
    loadHotset,
    refreshAll
  } = useCacheGovernanceStatus()

  const {
    pollingEnabled,
    pollingLimit,
    pollingCount,
    pollingPausedByVisibility,
    handlePollingToggle,
    handlePollingLimitChange
  } = useBoundedPolling({
    intervalMs: STATUS_POLL_INTERVAL_MS,
    defaultLimit: DEFAULT_STATUS_POLL_LIMIT,
    onTick: () => loadStatus(true)
  })

  const {
    manualWarmupVisible,
    manualWarmupSubmitting,
    manualWarmupError,
    manualWarmupResult,
    manualWarmupTargets,
    openManualWarmupModal,
    closeManualWarmupModal,
    addManualWarmupTarget,
    removeManualWarmupTarget,
    updateManualWarmupTarget,
    submitManualWarmup
  } = useManualWarmup({
    onFinished: () => loadStatus(true)
  })

  const familyColumns = useMemo<ColumnsType<ICacheGovernanceFamilyStatus>>(
    () => [
      {
        title: '缓存族',
        dataIndex: 'family',
        key: 'family',
        width: 150,
        render: (value: string) => FAMILY_LABELS[value] || value
      },
      { title: '配置档', dataIndex: 'profile', key: 'profile', width: 140, render: (value: string) => value || '-' },
      {
        title: '命名空间',
        dataIndex: 'namespace',
        key: 'namespace',
        width: 220,
        ellipsis: true,
        render: renderTooltipText
      },
      {
        title: '路由模式',
        dataIndex: 'mode',
        key: 'mode',
        width: 140,
        render: (value: string) => renderModeTag(value)
      },
      {
        title: '可用',
        dataIndex: 'available',
        key: 'available',
        width: 110,
        render: (value: boolean) => renderBooleanTag(value)
      },
      {
        title: '降级',
        dataIndex: 'degraded',
        key: 'degraded',
        width: 110,
        render: (value: boolean) => renderBooleanTag(value)
      },
      {
        title: '已配置',
        dataIndex: 'configured',
        key: 'configured',
        width: 110,
        render: (value: boolean) => renderBooleanTag(value)
      },
      {
        title: '最近成功',
        dataIndex: 'last_success_at',
        key: 'last_success_at',
        width: 180,
        render: (value?: string) => formatDateTime(value)
      },
      {
        title: '最近失败',
        dataIndex: 'last_failure_at',
        key: 'last_failure_at',
        width: 180,
        render: (value?: string) => formatDateTime(value)
      },
      {
        title: '连续失败次数',
        dataIndex: 'consecutive_failures',
        key: 'consecutive_failures',
        width: 160
      },
      {
        title: '最近错误',
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
      { title: '触发来源', dataIndex: 'trigger', key: 'trigger', width: 140 },
      { title: '开始时间', dataIndex: 'started_at', key: 'started_at', width: 180, render: (value?: string) => formatDateTime(value) },
      { title: '结束时间', dataIndex: 'finished_at', key: 'finished_at', width: 180, render: (value?: string) => formatDateTime(value) },
      {
        title: '结果',
        dataIndex: 'result',
        key: 'result',
        width: 120,
        render: renderWarmupResultTag
      },
      { title: '目标数', dataIndex: 'target_count', key: 'target_count', width: 100 },
      { title: '成功', dataIndex: 'ok_count', key: 'ok_count', width: 80 },
      { title: '失败', dataIndex: 'error_count', key: 'error_count', width: 80 },
      { title: '跳过', dataIndex: 'skipped_count', key: 'skipped_count', width: 90 }
    ],
    []
  )

  const hotsetColumns = useMemo<ColumnsType<{ scope: string; score: number }>>(
    () => [
      {
        title: '作用域',
        dataIndex: 'scope',
        key: 'scope',
        render: renderHotsetScope
      },
      { title: '热度分数', dataIndex: 'score', key: 'score', width: 120 }
    ],
    []
  )

  const manualWarmupColumns = useMemo<ColumnsType<ICacheGovernanceManualWarmupItemResult>>(
    () => [
      {
        title: '缓存族',
        dataIndex: 'family',
        key: 'family',
        width: 140,
        render: (value: string) => FAMILY_LABELS[value] || value
      },
      {
        title: '预热类型',
        dataIndex: 'kind',
        key: 'kind',
        width: 180,
        render: (value: string) => KIND_LABELS[value] || value
      },
      {
        title: '作用域',
        dataIndex: 'scope',
        key: 'scope',
        render: renderTooltipText
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: renderManualWarmupItemStatusTag
      },
      {
        title: '结果说明',
        dataIndex: 'message',
        key: 'message',
        render: renderTooltipText
      }
    ],
    []
  )

  return (
    <div className="cache-governance-page">
      <div className="cache-governance-page__hero">
        <div className="cache-governance-page__hero-main">
          <Space className="cache-governance-page__hero-eyebrow" size={8}>
            <ClusterOutlined />
            <Text strong>缓存治理 · 三进程协同观测</Text>
          </Space>
          <Title level={3} className="cache-governance-page__hero-title">
            缓存治理与全局趋势
          </Title>
          <Paragraph className="cache-governance-page__hero-description">
            当前页中的摘要、缓存族状态、预热记录与热点预览来自
            <Text strong> {formatComponentLabel(status?.component)} </Text>
            的实时治理接口，适合快速定位当前问题；下方 Grafana 按钮用于查看
            <Text strong> qs-apiserver / qs-collection-server / qs-worker </Text>
            三进程的全局缓存趋势，便于做时序对比和跨进程排查。
          </Paragraph>
          <Space wrap className="cache-governance-page__hero-tags">
            <Tag color="blue">
              <Space size={4}>
                <InfoCircleOutlined />
                <span>实时治理面：{formatComponentLabel(status?.component)}</span>
              </Space>
            </Tag>
            <Tag color="geekblue">
              <Space size={4}>
                <AreaChartOutlined />
                <span>趋势覆盖：三进程全局趋势</span>
              </Space>
            </Tag>
            <Tag color="default">组织上下文由 qs-server 解析</Tag>
            <Tag color="default">最近更新时间：{formatDateTime(status?.generated_at)}</Tag>
          </Space>
        </div>

        <Space className="cache-governance-page__grafana-links">
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

      <Space className="cache-governance-page__header" align="start">
        <Space wrap>
          <Space className="cache-governance-page__polling-control" align="center">
            <SyncOutlined />
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

          <Space>
            <Text type="secondary">
              当前治理源：{formatComponentLabel(status?.component)}
            </Text>
          </Space>

      
        </Space>

        <Space wrap>
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={openManualWarmupModal}>
            手工预热
          </Button>
          <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={statusLoading || hotsetLoading}>
            刷新当前治理状态
          </Button>
        </Space>
        
      </Space>

      <Alert
        className="cache-governance-page__alert"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="页面语义说明"
        description="本页上半部分是当前治理面实时状态，下方 Grafana 按钮查看三进程全局历史趋势。这样可以兼顾“看现在”与“看走势”，避免把单进程即时状态与全局时序趋势混为一谈。"
      />
      

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
          <Card className="cache-governance-page__stat-card">
            <Statistic title="缓存族总数" value={summary?.family_total || 0} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="cache-governance-page__stat-card">
            <Statistic title="可用" value={summary?.available_count || 0} valueStyle={{ color: '#389e0d' }} prefix={<DashboardOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="cache-governance-page__stat-card">
            <Statistic title="降级" value={summary?.degraded_count || 0} valueStyle={{ color: '#d46b08' }} prefix={<InfoCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card className="cache-governance-page__stat-card">
            <Statistic title="不可用" value={summary?.unavailable_count || 0} valueStyle={{ color: '#cf1322' }} prefix={<LockOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="cache-governance-page__stat-card">
            <Statistic title="运行态就绪" value={summary?.ready ? '就绪' : '未就绪'} prefix={<ClusterOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="cache-governance-page__stat-card">
            <Statistic title="预热开关" value={status?.warmup?.enabled ? '已启用' : '已关闭'} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={8}>
          <Card className="cache-governance-page__stat-card">
            <Statistic title="热点驱动预热" value={status?.warmup?.hotset?.enable ? '已启用' : '已关闭'} prefix={<FireOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        className="cache-governance-page__section"
        title={(
          <Space size={8}>
            <AppstoreOutlined />
            <span>缓存族状态（当前治理面）</span>
          </Space>
        )}
        loading={statusLoading && !status}
      >
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
          locale={{ emptyText: <Empty description="暂无缓存族状态" /> }}
        />
      </Card>

      <Card
        className="cache-governance-page__section"
        title={(
          <Space size={8}>
            <ThunderboltOutlined />
            <span>预热状态（当前治理面）</span>
          </Space>
        )}
        loading={statusLoading && !status}
      >
        <Descriptions className="cache-governance-page__descriptions" size="small" column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="预热总开关">{renderBooleanTag(status?.warmup?.enabled || false)}</Descriptions.Item>
          <Descriptions.Item label="启动时静态预热">{renderBooleanTag(status?.warmup?.startup?.static || false)}</Descriptions.Item>
          <Descriptions.Item label="启动时查询预热">{renderBooleanTag(status?.warmup?.startup?.query || false)}</Descriptions.Item>
          <Descriptions.Item label="热点驱动预热">{renderBooleanTag(status?.warmup?.hotset?.enable || false)}</Descriptions.Item>
          <Descriptions.Item label="热点榜单 Top N">{status?.warmup?.hotset?.top_n ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="单类最大条数">{status?.warmup?.hotset?.max_items_per_kind ?? '-'}</Descriptions.Item>
        </Descriptions>

        <Table
          rowKey={(record) => `${record.trigger}:${record.started_at || 'unknown'}`}
          columns={warmupColumns}
          dataSource={warmupRuns}
          pagination={false}
          size="small"
          scroll={{ x: 900 }}
          locale={{ emptyText: <Empty description="暂无预热执行记录" /> }}
        />
      </Card>

      <Card
        className="cache-governance-page__section"
        title={(
          <Space size={8}>
            <FireOutlined />
            <span>热点预览（当前治理面）</span>
          </Space>
        )}
        extra={(
          <Space>
            <Select<CacheGovernanceHotsetKind>
              value={selectedKind}
              style={{ width: 240 }}
              onChange={setSelectedKind}
            >
              {CACHE_GOVERNANCE_HOTSET_KINDS.map((kind) => (
                <Select.Option key={kind} value={kind}>
                  {KIND_LABELS[kind] || kind}
                </Select.Option>
              ))}
            </Select>
            <Button onClick={() => loadHotset(selectedKind)} loading={hotsetLoading}>
              刷新热点预览
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
          <Descriptions.Item label="缓存族">{FAMILY_LABELS[hotset?.family || ''] || hotset?.family || '-'}</Descriptions.Item>
          <Descriptions.Item label="可用">{renderBooleanTag(hotset?.available || false)}</Descriptions.Item>
          <Descriptions.Item label="降级">{renderBooleanTag(hotset?.degraded || false)}</Descriptions.Item>
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
        onOk={() => { void submitManualWarmup() }}
        onCancel={closeManualWarmupModal}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="手工预热会同步调用 qs-server 的 warmup-targets 内部接口"
            description="查询类 scope 使用 org:<id> 形态；组织归属由 qs-server 根据登录态解析，前端无需传 org_id。"
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
                  {CACHE_GOVERNANCE_WARMUP_KINDS.map((kind) => (
                    <Select.Option key={kind} value={kind}>
                      {KIND_LABELS[kind] || kind}
                    </Select.Option>
                  ))}
                </Select>
                <Input
                  value={item.scope}
                  className="cache-governance-page__manual-target-input"
                  placeholder={getWarmupScopePlaceholder(item.kind)}
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
                例：<code>scale:S-001</code>、<code>questionnaire:Q-001</code>、<code>published</code>、<code>org:1</code>
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
                <Descriptions.Item label="触发来源">{manualWarmupResult.trigger}</Descriptions.Item>
                <Descriptions.Item label="开始时间">{formatDateTime(manualWarmupResult.started_at)}</Descriptions.Item>
                <Descriptions.Item label="结束时间">{formatDateTime(manualWarmupResult.finished_at)}</Descriptions.Item>
                <Descriptions.Item label="执行结果">{renderWarmupResultTag(manualWarmupResult.summary.result)}</Descriptions.Item>
                <Descriptions.Item label="目标数">{manualWarmupResult.summary.target_count}</Descriptions.Item>
                <Descriptions.Item label="成功">{manualWarmupResult.summary.ok_count}</Descriptions.Item>
                <Descriptions.Item label="跳过">{manualWarmupResult.summary.skipped_count}</Descriptions.Item>
                <Descriptions.Item label="失败">{manualWarmupResult.summary.error_count}</Descriptions.Item>
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
