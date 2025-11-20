import React from 'react'
import { Card, Table, Button, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useHistory } from 'react-router-dom'

const ScreeningList: React.FC = () => {
  const history = useHistory()

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '使用量表',
      dataIndex: 'scaleName',
      key: 'scaleName'
    },
    {
      title: '目标学校',
      dataIndex: 'schools',
      key: 'schools'
    },
    {
      title: '参与人数',
      dataIndex: 'participantCount',
      key: 'participantCount'
    },
    {
      title: '完成率',
      dataIndex: 'completionRate',
      key: 'completionRate',
      render: function renderRate(rate: number) {
        return `${rate}%`
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: function renderStatus(status: string) {
        const colorMap: Record<string, string> = {
          'ongoing': 'processing',
          'completed': 'success',
          'pending': 'default'
        }
        return <Tag color={colorMap[status]}>{status}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction(_: any, record: any) {
        return (
          <Space>
            <Button type="link" onClick={() => history.push(`/screening/detail/${record.id}`)}>
              查看详情
            </Button>
          </Space>
        )
      }
    }
  ]

  return (
    <Card
      title="筛查项目管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />}>
          创建筛查项目
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

export default ScreeningList
