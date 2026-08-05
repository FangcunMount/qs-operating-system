import React from 'react'
import { Button, Card, List, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, RightOutlined } from '@ant-design/icons'
import type { Signal } from '@/api/path/systemGovernance'
import { normalizeSignalEvidence } from '@/api/path/systemGovernance'
import {
  domainPresentation,
  presentEvidenceLine,
  severityLabel,
  signalImpact,
  signalRecommendation,
  signalTitle
} from '../presentation'

const { Text } = Typography

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'red',
  warning: 'orange',
  info: 'blue'
}

interface SignalListProps {
  signals: Signal[]
  onOpenDomain?: (domain: string) => void
}

export const SignalList: React.FC<SignalListProps> = ({ signals, onOpenDomain }) => {
  if (!signals.length) {
    return (
      <div className="system-governance-empty-state">
        <CheckCircleOutlined />
        <div>
          <Text strong>当前没有需要处理的问题</Text>
          <br />
          <Text type="secondary">最近一次治理快照未发现严重或需关注信号。</Text>
        </div>
      </div>
    )
  }

  return (
    <List
      className="system-governance-signal-list"
      dataSource={signals}
      renderItem={(item) => (
        <List.Item className="system-governance-signal-list__item">
          <Card className={`system-governance-signal system-governance-signal--${item.severity}`}>
            <div className="system-governance-signal__header">
              <div>
                <Space wrap size={8}>
                  <Tag color={SEVERITY_COLORS[item.severity] || 'default'}>{severityLabel(item.severity)}</Tag>
                  <Tag>{domainPresentation(item.domain).label}</Tag>
                </Space>
                <Typography.Title level={5} className="system-governance-signal__title">
                  {signalTitle({ ...item, evidence: normalizeSignalEvidence(item.evidence) })}
                </Typography.Title>
              </div>
              {onOpenDomain && ['events', 'cache', 'resilience', 'checkpoint'].includes(item.domain) ? (
                <Button
                  type="link"
                  aria-label={`查看${domainPresentation(item.domain).detailLabel}详情`}
                  onClick={() => onOpenDomain(item.domain)}
                >
                  查看{domainPresentation(item.domain).detailLabel}详情 <RightOutlined />
                </Button>
              ) : null}
            </div>
            <div className="system-governance-signal__explanation">
              <Text><Text strong>可能影响：</Text>{signalImpact(item.domain)}</Text>
              <Text><Text strong>建议处理：</Text>{signalRecommendation(item.domain)}</Text>
            </div>
            <Space wrap size={[8, 8]} className="system-governance-signal__evidence">
              {normalizeSignalEvidence(item.evidence).map((line) => (
                <Tag key={line}>{presentEvidenceLine(line)}</Tag>
              ))}
            </Space>
            {(Array.isArray(item.metric_evidence) ? item.metric_evidence : []).length ? (
              <div className="system-governance-signal__metrics">
                {(Array.isArray(item.metric_evidence) ? item.metric_evidence : []).map((metric) => (
                  <Text key={metric.name} type="secondary">
                    {metric.name}：{metric.available ? `${metric.value ?? '-'}${metric.unit ? ` ${metric.unit}` : ''}` : metric.reason || '指标不可用'}
                  </Text>
                ))}
              </div>
            ) : null}
          </Card>
        </List.Item>
      )}
    />
  )
}
