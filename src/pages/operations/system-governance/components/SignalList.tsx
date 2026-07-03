import React from 'react'
import { List, Space, Tag, Typography } from 'antd'
import type { Signal } from '@/api/path/systemGovernance'
import { normalizeSignalEvidence } from '@/api/path/systemGovernance'

const { Text } = Typography

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'red',
  warning: 'orange',
  info: 'blue'
}

interface SignalListProps {
  signals: Signal[]
}

export const SignalList: React.FC<SignalListProps> = ({ signals }) => {
  if (!signals.length) {
    return <Text type="secondary">当前没有需要关注的问题信号。</Text>
  }

  return (
    <List
      dataSource={signals}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={(
              <Space wrap>
                <Tag color={SEVERITY_COLORS[item.severity] || 'default'}>{item.severity}</Tag>
                <Tag>{item.domain}</Tag>
                <span>{item.title}</span>
              </Space>
            )}
            description={(
              <Space direction="vertical" size={4}>
                {normalizeSignalEvidence(item.evidence).map((line) => <Text key={line}>{line}</Text>)}
                {(Array.isArray(item.metric_evidence) ? item.metric_evidence : []).map((metric) => (
                  <Text key={metric.name} type={metric.available ? undefined : 'secondary'}>
                    {metric.name}: {metric.available ? `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}` : metric.reason || '不可用'}
                  </Text>
                ))}
              </Space>
            )}
          />
        </List.Item>
      )}
    />
  )
}
