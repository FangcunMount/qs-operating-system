import React from 'react'
import { Card, Table, Button, Space, Tag, Switch } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'

const PushList: React.FC = () => {
  const history = useHistory()

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '推送内容',
      dataIndex: 'contentType',
      key: 'contentType',
      render: function renderContentType(type: string) {
        return type === 'survey' ? '调查问卷' : '医学量表'
      }
    },
    {
      title: '目标人群',
      dataIndex: 'targetGroup',
      key: 'targetGroup'
    },
    {
      title: '推送规则',
      dataIndex: 'schedule',
      key: 'schedule'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: function renderStatus(status: string) {
        return (
          <Tag color={status === 'active' ? 'success' : 'default'}>
            {status === 'active' ? '启用' : '停用'}
          </Tag>
        )
      }
    },
    {
      title: '启用/停用',
      key: 'toggle',
      render: function renderToggle() {
        return <Switch />
      }
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction(_: any, record: any) {
        return (
          <Space>
            <Button type="link" onClick={() => history.push(`/push/config/${record.id}`)}>
              编辑
            </Button>
            <Button type="link" danger>
              删除
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <Card
      title="定时推送管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => history.push('/push/config/new')}>
          创建推送任务
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={[]}
        rowKey="id"
        pagination={{
          total: 0,
          pageSize: 10,
          showTotal: (total) => `共 ${total} 条`
        }}
      />
    </Card>
  )
}

export default PushList
