import React, { useState } from 'react'
import { Button, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { ActionDescriptor } from '@/api/path/systemGovernance'
import { renderActionStatusTags } from '../../shared/utils/formatters'
import { ActionRunDrawer } from '../components/ActionRunDrawer'

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

export const ActionsTab: React.FC<ActionsTabProps> = ({ actions }) => {
  const [selectedAction, setSelectedAction] = useState<ActionDescriptor | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  const openDrawer = (action: ActionDescriptor) => {
    setSelectedAction(action)
    setDrawerVisible(true)
  }

  const columns: ColumnsType<ActionDescriptor> = [
    { title: '动作', dataIndex: 'label', key: 'label', width: 180 },
    { title: 'ID', dataIndex: 'id', key: 'id', width: 220 },
    { title: '域', dataIndex: 'domain', key: 'domain', width: 120 },
    { title: '风险', dataIndex: 'risk_level', key: 'risk_level', width: 100 },
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
      <Table
        rowKey={(record) => record.id}
        columns={columns}
        dataSource={actions}
        pagination={false}
        size="small"
      />
      <ActionRunDrawer
        action={selectedAction}
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      />
    </>
  )
}
