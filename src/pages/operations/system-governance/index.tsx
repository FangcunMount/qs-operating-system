import React, { useState } from 'react'
import { Alert, Button, Card, Select, Space, Tabs, Tag, Typography } from 'antd'

const { TabPane } = Tabs
import { AuditOutlined, ReloadOutlined } from '@ant-design/icons'
import { GovernanceHero } from '../shared/components/GovernanceHero'
import { useSimplePolling } from '../shared/hooks/useSimplePolling'
import { SignalList } from './components/SignalList'
import { useSystemGovernance } from './hooks/useSystemGovernance'
import { ActionsTab } from './tabs/ActionsTab'
import { CacheTab } from './tabs/CacheTab'
import { EventsTab } from './tabs/EventsTab'
import { RawTab } from './tabs/RawTab'
import { ResilienceTab } from './tabs/ResilienceTab'
import './index.scss'

const { Text } = Typography

const HEALTH_COLORS: Record<string, string> = {
  healthy: 'green',
  degraded: 'orange',
  critical: 'red'
}

const SystemGovernancePage: React.FC = () => {
  const {
    activeTab,
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

  useSimplePolling({
    enabled: pollingEnabled,
    intervalMs: 30000,
    onTick: reload
  })

  return (
    <div className="system-governance-page governance-page governance-page--event">
      <GovernanceHero
        theme="event"
        eyebrowIcon={<AuditOutlined />}
        eyebrowText="系统治理 2.0 · 统一工作台"
        title="系统治理工作台"
        description="聚合事件排水、缓存预热、承压保护与受控治理动作。诊断信号由后端统一评估，Prometheus 不可用时仅降级指标证据，不阻断页面。"
        tags={(
          <>
            <Tag className="system-governance-page__health-tag" color={HEALTH_COLORS[overview?.health || 'healthy'] || 'default'}>
              总体健康：{overview?.health || '-'}
            </Tag>
            <Tag color={overview?.metrics?.available === false ? 'orange' : 'blue'}>
              Metrics：{overview?.metrics?.available === false ? '不可用' : '可用'}
            </Tag>
            <Tag>窗口：{window}</Tag>
          </>
        )}
      />

      <Space className="governance-page__header" align="start">
        <Space wrap>
          <Select
            value={window}
            onChange={(value) => setQuery({ window: value })}
            options={[
              { value: '5m', label: '近 5 分钟' },
              { value: '15m', label: '近 15 分钟' },
              { value: '1h', label: '近 1 小时' }
            ]}
          />
          <Button onClick={() => setPollingEnabled((current) => !current)}>
            {pollingEnabled ? '关闭轮询' : '开启轮询'}
          </Button>
        </Space>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={reload}>
          刷新
        </Button>
      </Space>

      {error ? (
        <Alert className="governance-page__alert" type="error" showIcon message="系统治理数据获取失败" description={error} />
      ) : null}

      {overview?.metrics?.available === false ? (
        <Alert
          className="governance-page__alert"
          type="warning"
          showIcon
          message="Prometheus 指标暂不可用"
          description={overview.metrics.reason || '近窗口 metric_evidence 将降级，仅展示 snapshot 与信号文本证据。'}
        />
      ) : null}

      <Card className="governance-page__section" title="问题信号" loading={loading && !overview}>
        <SignalList signals={signals} />
      </Card>

      <Card className="governance-page__section">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setQuery({ tab: key as typeof activeTab })}
        >
          <TabPane tab="事件排水" key="events">
            <EventsTab data={events} loading={loading} />
          </TabPane>
          <TabPane tab="缓存预热" key="cache">
            <CacheTab data={cache} loading={loading} />
          </TabPane>
          <TabPane tab="承压保护" key="resilience">
            <ResilienceTab data={resilience} loading={loading} />
          </TabPane>
          <TabPane tab="治理动作" key="actions">
            <ActionsTab actions={actions} />
          </TabPane>
          <TabPane tab="原始快照" key="raw">
            <RawTab
              overview={overview}
              events={events}
              cache={cache}
              resilience={resilience}
              actions={actions}
            />
          </TabPane>
        </Tabs>
        <Text type="secondary">当前展示 {signals.length} 条信号。</Text>
      </Card>
    </div>
  )
}

export default SystemGovernancePage
