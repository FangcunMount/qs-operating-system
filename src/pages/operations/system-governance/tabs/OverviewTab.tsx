import React from 'react'
import { Alert, Button, Card, Col, Progress, Row, Space, Statistic, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  WarningOutlined
} from '@ant-design/icons'
import type { ActionDescriptor, GovernanceOverviewResponse, Signal } from '@/api/path/systemGovernance'
import { SignalList } from '../components/SignalList'
import { domainPresentation, severityLabel } from '../presentation'

const { Paragraph, Text, Title } = Typography

interface OverviewTabProps {
  overview: GovernanceOverviewResponse | null
  actions: ActionDescriptor[]
  signals: Signal[]
  onOpenDomain: (domain: string) => void
}

const DOMAIN_CARDS = [
  { key: 'events', icon: <ThunderboltOutlined /> },
  { key: 'cache', icon: <DatabaseOutlined /> },
  { key: 'resilience', icon: <SafetyCertificateOutlined /> },
  { key: 'checkpoint', icon: <HistoryOutlined /> }
]

const severityColor = (severity?: string): string => {
  if (severity === 'critical') return 'red'
  if (severity === 'warning' || severity === 'degraded') return 'orange'
  return 'green'
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ overview, actions, signals, onOpenDomain }) => {
  const criticalCount = signals.filter((item) => item.severity === 'critical').length
  const warningCount = signals.filter((item) => item.severity === 'warning').length
  const enabledActions = actions.filter((item) => item.enabled && !item.planned).length
  const healthy = signals.length === 0 && overview?.health !== 'critical' && overview?.health !== 'degraded'

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <Card className={`system-governance-conclusion system-governance-conclusion--${healthy ? 'healthy' : overview?.health || 'degraded'}`}>
        <div className="system-governance-conclusion__main">
          <div className="system-governance-conclusion__icon">
            {healthy ? <CheckCircleOutlined /> : <WarningOutlined />}
          </div>
          <div>
            <Text type="secondary">当前治理结论</Text>
            <Title level={4}>{healthy ? '系统运行正常' : `发现 ${signals.length} 个需要关注的问题`}</Title>
            <Paragraph>
              {healthy
                ? '事件投递、缓存运行、容量保护和任务恢复均未产生告警信号。'
                : '先处理严重问题，再按领域查看证据；治理动作只应在确认影响范围后执行。'}
            </Paragraph>
          </div>
        </div>
        <div className="system-governance-conclusion__stats">
          <Statistic title="严重" value={criticalCount} valueStyle={{ color: criticalCount ? '#cf1322' : undefined }} />
          <Statistic title="需关注" value={warningCount} valueStyle={{ color: warningCount ? '#d46b08' : undefined }} />
          <Statistic title="可用治理动作" value={enabledActions} />
        </div>
      </Card>

      <section>
        <div className="system-governance-section-heading">
          <div>
            <Title level={4}>运行领域</Title>
            <Text type="secondary">每个领域先给出结论，详细表格只在需要下钻时查看。</Text>
          </div>
        </div>
        <Row gutter={[16, 16]}>
          {DOMAIN_CARDS.map(({ key, icon }) => {
            const presentation = domainPresentation(key)
            const summary = overview?.domains?.[key]
            const domainSignals = signals.filter((item) => item.domain === key)
            const signalCount = summary?.signal_count ?? domainSignals.length
            const severity = summary?.severity || (signalCount ? domainSignals[0]?.severity : 'healthy')
            const percent = signalCount > 0 ? (severity === 'critical' ? 100 : 68) : 100
            return (
              <Col xs={24} md={12} xl={6} key={key}>
                <Card className={`system-governance-domain-card system-governance-domain-card--${severity}`}>
                  <div className="system-governance-domain-card__topline">
                    <span className="system-governance-domain-card__icon">{icon}</span>
                    <Tag color={severityColor(severity)}>{severityLabel(severity)}</Tag>
                  </div>
                  <Title level={5}>{presentation.label}</Title>
                  <Paragraph>{presentation.description}</Paragraph>
                  <Progress
                    percent={percent}
                    showInfo={false}
                    strokeColor={severityColor(severity) === 'red' ? '#ff4d4f' : severityColor(severity) === 'orange' ? '#fa8c16' : '#52c41a'}
                    trailColor="#f0f0f0"
                    size="small"
                  />
                  <div className="system-governance-domain-card__footer">
                    <Text type="secondary">{signalCount ? `${signalCount} 个问题` : '未发现问题'}</Text>
                    <Button type="link" onClick={() => onOpenDomain(key)}>
                      查看详情 <RightOutlined />
                    </Button>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </section>

      <section>
        <div className="system-governance-section-heading">
          <div>
            <Title level={4}>现在需要处理什么</Title>
            <Text type="secondary">按严重度排序，并给出影响、建议步骤和原始证据。</Text>
          </div>
          {signals.length ? <Tag color="orange">{signals.length} 个待处理问题</Tag> : null}
        </div>
        <SignalList signals={signals} onOpenDomain={onOpenDomain} />
      </section>

      {overview?.metrics?.available === false ? (
        <Alert
          type="warning"
          showIcon
          icon={<CloudServerOutlined />}
          message="指标证据不完整"
          description="页面仍会使用组件快照判断运行状态，但近窗口趋势、错误次数和延迟证据暂不可用。"
        />
      ) : null}
    </Space>
  )
}
