import React, { useCallback, useState } from 'react'
import { Alert, Button, Card, Select, Space, Tag, Typography } from 'antd'
import {
  AuditOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SyncOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { SimplePollingControl } from '../shared/components/GovernanceHeader'
import { useSimplePolling } from '../shared/hooks/useSimplePolling'
import { useSystemGovernance } from './hooks/useSystemGovernance'
import {
  defaultViewForDomain,
  PRIMARY_GOVERNANCE_NAVIGATION,
  SECONDARY_GOVERNANCE_NAVIGATION,
  sectionForGovernanceView
} from './navigation'
import { ActionsTab } from './tabs/ActionsTab'
import { CacheTab } from './tabs/CacheTab'
import { EventRetryTab } from './tabs/EventRetryTab'
import { EventsTab } from './tabs/EventsTab'
import { IssuesTab } from './tabs/IssuesTab'
import { OverviewTab } from './tabs/OverviewTab'
import { RawTab } from './tabs/RawTab'
import { RecoveryTab } from './tabs/RecoveryTab'
import { ResilienceTab } from './tabs/ResilienceTab'
import './index.scss'

const { Paragraph, Text, Title } = Typography

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'green',
  degraded: 'orange',
  critical: 'red'
}

const healthPresentation = (health?: string) => {
  if (!health || health === 'unknown') {
    return {
      icon: <SyncOutlined spin />,
      eyebrow: '正在获取快照',
      title: '正在确认系统状态',
      description: '治理结论尚未生成，请勿将加载中的空数据解释为系统正常。'
    }
  }
  if (health === 'critical') {
    return {
      icon: <ExclamationCircleOutlined />,
      eyebrow: '存在高优先级故障',
      title: '系统需要立即处理',
      description: '先查看问题中心中的严重问题，确认影响范围后再执行治理动作。'
    }
  }
  if (health === 'degraded') {
    return {
      icon: <WarningOutlined />,
      eyebrow: '存在需要关注的问题',
      title: '系统部分能力正在降级',
      description: '核心服务仍可运行，但部分链路、缓存或保护能力需要进一步诊断。'
    }
  }
  return {
    icon: <CheckCircleOutlined />,
    eyebrow: '当前运行平稳',
    title: '系统运行正常',
    description: '最近一次治理快照未发现需要人工处理的问题。'
  }
}

const SystemGovernancePage: React.FC = () => {
  const {
    activeView,
    window,
    overview,
    actions,
    events,
    cache,
    resilience,
    signals,
    loading,
    error,
    setQuery,
    reload
  } = useSystemGovernance()

  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [retryRefreshKey, setRetryRefreshKey] = useState(0)
  const health = overview?.health || 'unknown'
  const healthCopy = healthPresentation(health)
  const metricsLabel = !overview ? '获取中' : overview.metrics?.available === false ? '降级' : '完整'
  const activeSection = sectionForGovernanceView(activeView)
  const secondaryNavigation = SECONDARY_GOVERNANCE_NAVIGATION[activeSection] || []
  const openDomain = (domain: string) => setQuery({ view: defaultViewForDomain(domain) })
  const refresh = useCallback(() => {
    setRetryRefreshKey((current) => current + 1)
    reload()
  }, [reload])

  useSimplePolling({ enabled: pollingEnabled, intervalMs: 30000, onTick: refresh })

  const renderWorkspace = () => {
    switch (activeView) {
    case 'overview':
      return <OverviewTab overview={overview} actions={actions} signals={signals} onOpenDomain={openDomain} />
    case 'issues':
      return <IssuesTab signals={signals} onOpenDomain={openDomain} />
    case 'events-drain':
      return <EventsTab data={events} loading={loading} section="drain" />
    case 'events-retry':
      return (
        <EventRetryTab
          refreshKey={retryRefreshKey}
          onOpenActions={() => setQuery({ view: 'actions' })}
        />
      )
    case 'events-runtime':
      return <EventsTab data={events} loading={loading} section="runtime" />
    case 'cache-runtime':
    case 'cache-policies':
    case 'cache-warmup':
      return (
        <CacheTab
          data={cache}
          loading={loading}
          section={activeView === 'cache-runtime' ? 'runtime' : activeView === 'cache-policies' ? 'policies' : 'warmup'}
          manualWarmupAction={actions.find((item) => item.id === 'cache.manual_warmup')}
          reloadPolicyAction={actions.find((item) => item.id === 'cache.reload_policy')}
          onGovernanceActionFinished={refresh}
        />
      )
    case 'resilience-queues':
    case 'resilience-dependencies':
    case 'resilience-capabilities':
      return (
        <ResilienceTab
          data={resilience}
          loading={loading}
          section={activeView === 'resilience-queues'
            ? 'queues'
            : activeView === 'resilience-dependencies' ? 'dependencies' : 'capabilities'}
        />
      )
    case 'recovery':
      return <RecoveryTab checkpoints={overview?.checkpoints} signals={signals} />
    case 'actions':
      return <ActionsTab actions={actions} signals={signals} />
    case 'diagnostics':
      return <RawTab overview={overview} events={events} cache={cache} resilience={resilience} actions={actions} />
    default:
      return null
    }
  }

  return (
    <div className={`system-governance-page governance-page system-governance-page--${health}`}>
      <div className="system-governance-page__hero">
        <div className="system-governance-page__hero-status">
          <span className="system-governance-page__hero-icon">{healthCopy.icon}</span>
          <div>
            <Space size={8} className="system-governance-page__eyebrow">
              <AuditOutlined />
              <Text strong>系统运行态势</Text>
              <Tag color={HEALTH_COLORS[health] || 'default'}>{healthCopy.eyebrow}</Tag>
            </Space>
            <Title level={2}>{healthCopy.title}</Title>
            <Paragraph>{healthCopy.description}</Paragraph>
          </div>
        </div>
        <Space wrap className="system-governance-page__hero-meta">
          <Tag>观测窗口：{window}</Tag>
          <Tag color={overview?.metrics?.available === false ? 'orange' : 'blue'}>指标证据：{metricsLabel}</Tag>
          <Tag>快照时间：{overview?.generated_at ? new Date(overview.generated_at).toLocaleString() : '获取中'}</Tag>
        </Space>
      </div>

      <nav className="system-governance-primary-nav" aria-label="系统治理功能">
        {PRIMARY_GOVERNANCE_NAVIGATION.map((item) => (
          <button
            type="button"
            key={item.view}
            className={sectionForGovernanceView(item.view) === activeSection ? 'is-active' : ''}
            onClick={() => setQuery({ view: item.view })}
          >
            {item.label}
            {item.view === 'issues' && signals.length ? <span className="system-governance-primary-nav__badge">{signals.length}</span> : null}
          </button>
        ))}
      </nav>

      <Space className="system-governance-page__toolbar" align="center">
        <Space wrap>
          <Select
            aria-label="观测窗口"
            value={window}
            onChange={(value) => setQuery({ window: value })}
            options={[
              { value: '5m', label: '近 5 分钟' },
              { value: '15m', label: '近 15 分钟' },
              { value: '1h', label: '近 1 小时' }
            ]}
          />
          <SimplePollingControl enabled={pollingEnabled} onChange={setPollingEnabled} intervalLabel="每 30 秒刷新" />
          <Button type="link" icon={<BugOutlined />} onClick={() => setQuery({ view: 'diagnostics' })}>工程诊断</Button>
        </Space>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={refresh}>刷新状态</Button>
      </Space>

      {error ? <Alert className="governance-page__alert" type="error" showIcon message="系统治理数据获取失败" description={error} /> : null}
      {overview?.metrics?.available === false ? (
        <Alert
          className="governance-page__alert"
          type="warning"
          showIcon
          message="趋势指标暂不可用，当前结论基于组件快照"
          description={overview.metrics.reason || '近窗口错误次数、延迟和利用率证据将暂时缺失，但快照类健康判断仍然有效。'}
        />
      ) : null}

      <Card className="system-governance-page__workspace" loading={loading && !overview}>
        {secondaryNavigation.length ? (
          <nav className="system-governance-secondary-nav" aria-label="当前治理领域功能">
            {secondaryNavigation.map((item) => (
              <button
                type="button"
                key={item.view}
                className={item.view === activeView ? 'is-active' : ''}
                onClick={() => setQuery({ view: item.view })}
              >
                {item.label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="system-governance-page__content">{renderWorkspace()}</div>
      </Card>
    </div>
  )
}

export default SystemGovernancePage
