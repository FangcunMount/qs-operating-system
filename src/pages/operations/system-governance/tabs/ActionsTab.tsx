import React, { useState } from 'react'
import { Alert, Button, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ActionDescriptor } from '@/api/path/systemGovernance'
import { renderActionStatusTags } from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'
import { actionPresentation, domainPresentation } from '../presentation'

const { Text } = Typography

interface ActionsTabProps {
  actions: ActionDescriptor[]
}

function renderActionRunButton(
  _value: unknown,
  record: ActionDescriptor,
  openDrawer: (action: ActionDescriptor) => void
) {
  return (
    <Button
      type="link"
      disabled={!record.enabled}
      onClick={() => openDrawer(record)}
    >
      执行
    </Button>
  )
}

function renderActionIdentity(_value: unknown, record: ActionDescriptor) {
  return (
    <Space direction="vertical" size={0}>
      <Text strong>{actionPresentation(record).label}</Text>
      <Text type="secondary" code>{record.id}</Text>
    </Space>
  )
}

function renderRiskLevel(value: string) {
  return (
    <Tag color={value === 'high' ? 'red' : value === 'medium' ? 'orange' : 'blue'}>
      {value === 'high' ? '高' : value === 'medium' ? '中' : '低'}
    </Tag>
  )
}

export const ActionsTab: React.FC<ActionsTabProps> = ({ actions }) => {
  const [selectedAction, setSelectedAction] = useState<ActionDescriptor | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const openDrawer = (action: ActionDescriptor) => {
    setSelectedAction(action)
    setDrawerVisible(true)
  }

  const columns: ColumnsType<ActionDescriptor> = [
    {
      title: '治理动作',
      key: 'label',
      width: 240,
      render: renderActionIdentity
    },
    {
      title: '适用场景',
      key: 'description',
      render: (_value, record) => actionPresentation(record).description
    },
    {
      title: '领域',
      dataIndex: 'domain',
      key: 'domain',
      width: 130,
      render: (value: string) => domainPresentation(value).label
    },
    {
      title: '风险',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: renderRiskLevel
    },
    {
      title: '状态',
      key: 'status',
      width: 160,
      render: (_value, record) => renderActionStatusTags(record)
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (value, record) => renderActionRunButton(value, record, openDrawer)
    }
  ]

  return (
    <>
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message="治理动作不是日常操作入口"
        description="请先从运行总览定位问题并核对证据。所有动作都要求明确输入，并由服务端执行确认、并发保护和审计记录。"
      />
      <Table
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={actions}
        pagination={false}
        size="small"
        scroll={{ x: 1100 }}
      />
      <ActionRunDrawer
        action={selectedAction}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </>
  )
}
