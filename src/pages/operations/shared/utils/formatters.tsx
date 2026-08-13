import React from 'react'
import moment from 'moment'
import { Tag, Tooltip, Space } from 'antd'

export const formatDateTime = (value?: string): string => {
  if (!value) return '-'
  const parsed = moment(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

export const formatExecutionDateTime = (value?: string): string => {
  if (!value || /^0001-01-01(?:T|\s)/.test(value)) return '从未执行'
  return formatDateTime(value)
}

export const formatDurationSeconds = (seconds?: number): string => {
  if (!seconds || seconds <= 0) return '0s'
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

export const renderTooltipText = (value?: string): React.ReactElement => (
  <Tooltip title={value || '-'}>
    <span>{value || '-'}</span>
  </Tooltip>
)

export const renderHealthTag = (degraded: boolean, active = true): React.ReactElement => {
  if (!active) {
    return <Tag color="default">未配置</Tag>
  }
  return (
    <Tag color={degraded ? 'red' : 'green'}>
      {degraded ? 'Degraded' : 'Ready'}
    </Tag>
  )
}

export const renderBooleanAvailabilityTag = (value: boolean): React.ReactElement => (
  <Tag color={value ? 'green' : 'red'}>{value ? '是' : '否'}</Tag>
)

export const renderDegradedTag = (value: boolean): React.ReactElement => (
  <Tag color={value ? 'red' : 'green'}>{value ? '是' : '否'}</Tag>
)

export const renderActionStatusTags = (record: { enabled: boolean; planned: boolean }): React.ReactElement => (
  <Space>
    <Tag color={record.enabled ? 'green' : 'default'}>{record.enabled ? '可执行' : '禁用'}</Tag>
    {record.planned ? <Tag color="orange">规划中</Tag> : null}
  </Space>
)
