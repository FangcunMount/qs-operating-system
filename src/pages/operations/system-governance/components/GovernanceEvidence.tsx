import React from 'react'
import { Space, Tag, Typography } from 'antd'
import type { MetricEvidence } from '@/api/path/systemGovernance'

const { Text } = Typography

export const severityColor = (severity?: string): string => {
  if (severity === 'critical') return 'red'
  if (severity === 'warning') return 'orange'
  if (severity === 'healthy') return 'green'
  return 'default'
}

export const renderSeverityTag = (severity?: string): React.ReactElement => (
  <Tag color={severityColor(severity)}>{severity || '-'}</Tag>
)

export const MetricEvidenceList: React.FC<{ items?: MetricEvidence[] }> = ({ items }) => {
  if (!items?.length) return <>-</>
  return (
    <Space direction="vertical" size={0}>
      {items.map((item) => (
        <Text key={item.name} type={item.available ? undefined : 'secondary'}>
          {item.name}: {item.available ? `${item.value ?? '-'}${item.unit ? ` ${item.unit}` : ''}` : item.reason || '不可用'}
        </Text>
      ))}
    </Space>
  )
}

export const renderMetricEvidence = (items?: MetricEvidence[]): React.ReactElement => <MetricEvidenceList items={items} />
