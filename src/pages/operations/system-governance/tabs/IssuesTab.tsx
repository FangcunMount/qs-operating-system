import React, { useMemo, useState } from 'react'
import { Alert, Card, Col, Row, Space, Statistic, Typography } from 'antd'
import type { Signal } from '@/api/path/systemGovernance'
import { SignalList } from '../components/SignalList'
import { domainPresentation } from '../presentation'

const { Text, Title } = Typography

interface IssuesTabProps {
  signals: Signal[]
  onOpenDomain: (domain: string) => void
}

export const IssuesTab: React.FC<IssuesTabProps> = ({ signals, onOpenDomain }) => {
  const [domain, setDomain] = useState('all')
  const [severity, setSeverity] = useState('all')
  const filteredSignals = useMemo(
    () => signals.filter((signal) =>
      (domain === 'all' || signal.domain === domain) &&
      (severity === 'all' || signal.severity === severity)
    ),
    [domain, severity, signals]
  )

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div className="system-governance-section-heading">
        <div>
          <Title level={4}>当前问题收件箱</Title>
          <Text type="secondary">从问题出发查看影响、建议处理方式和领域证据。</Text>
        </div>
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card size="small"><Statistic title="当前问题" value={signals.length} suffix="个" /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small"><Statistic title="严重" value={signals.filter((item) => item.severity === 'critical').length} /></Card>
        </Col>
        <Col xs={12} sm={8}>
          <Card size="small"><Statistic title="需关注" value={signals.filter((item) => item.severity === 'warning').length} /></Card>
        </Col>
      </Row>
      <Alert
        type="info"
        showIcon
        message={`${signals.length} 个当前问题`}
        description="当前仅展示实时快照问题；确认、处理中和已恢复状态将在服务端提供生命周期后启用。"
      />
      <div className="system-governance-filter-bar">
        <label>
          <span>问题领域</span>
          <select aria-label="问题领域" value={domain} onChange={(event) => setDomain(event.target.value)}>
            <option value="all">全部领域</option>
            {['events', 'cache', 'resilience', 'checkpoint'].map((item) => (
              <option key={item} value={item}>{domainPresentation(item).label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>严重度</span>
          <select aria-label="问题严重度" value={severity} onChange={(event) => setSeverity(event.target.value)}>
            <option value="all">全部严重度</option>
            <option value="critical">严重</option>
            <option value="warning">需关注</option>
          </select>
        </label>
        <Text type="secondary">筛选结果：{filteredSignals.length}</Text>
      </div>
      <SignalList signals={filteredSignals} onOpenDomain={onOpenDomain} />
    </Space>
  )
}
