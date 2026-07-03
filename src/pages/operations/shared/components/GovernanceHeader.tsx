import React from 'react'
import { Button, InputNumber, Space, Switch, Tag, Typography } from 'antd'
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'

const { Text } = Typography

interface GovernanceHeaderProps {
  loading: boolean
  onRefresh: () => void
  pollingControl: React.ReactNode
  extraActions?: React.ReactNode
}

export const GovernanceHeader: React.FC<GovernanceHeaderProps> = ({
  loading,
  onRefresh,
  pollingControl,
  extraActions
}) => (
  <Space className="governance-page__header" align="start">
    <Space wrap>
      {pollingControl}
      {extraActions}
    </Space>
    <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
      刷新当前状态
    </Button>
  </Space>
)

interface SimplePollingControlProps {
  enabled: boolean
  onChange: (checked: boolean) => void
  intervalLabel?: string
}

export const SimplePollingControl: React.FC<SimplePollingControlProps> = ({
  enabled,
  onChange,
  intervalLabel = '每 30 秒刷新'
}) => (
  <Space className="governance-page__polling-control" align="center">
    <SyncOutlined />
    <Text>状态轮询</Text>
    <Switch checked={enabled} onChange={onChange} checkedChildren="开" unCheckedChildren="关" />
    <Text type="secondary">{intervalLabel}</Text>
  </Space>
)

interface BoundedPollingControlProps {
  enabled: boolean
  pollingCount: number
  pollingLimit: number
  pollingPausedByVisibility: boolean
  onToggle: (checked: boolean) => void
  onLimitChange: (value: number | null) => void
}

export const BoundedPollingControl: React.FC<BoundedPollingControlProps> = ({
  enabled,
  pollingCount,
  pollingLimit,
  pollingPausedByVisibility,
  onToggle,
  onLimitChange
}) => (
  <Space className="governance-page__polling-control" align="center">
    <SyncOutlined />
    <Text>状态轮询</Text>
    <Switch checked={enabled} onChange={onToggle} checkedChildren="开" unCheckedChildren="关" />
    <Text type="secondary">已轮询 {pollingCount}/{pollingLimit} 次</Text>
    {pollingPausedByVisibility ? <Tag color="orange">页面不可见，已暂停</Tag> : null}
    <Text type="secondary">上限</Text>
    <InputNumber min={1} max={100} value={pollingLimit} onChange={onLimitChange} size="small" />
  </Space>
)
