import React from 'react'
import { Card, Tabs, Descriptions, Table, Button, Tag } from 'antd'
import { useParams } from 'react-router-dom'

const { TabPane } = Tabs

const SubjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const surveyColumns = [
    {
      title: '问卷名称',
      dataIndex: 'questionnaireName',
      key: 'questionnaireName'
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt'
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction() {
        return <Button type="link">查看详情</Button>
      }
    }
  ]

  const scaleColumns = [
    {
      title: '量表名称',
      dataIndex: 'scaleName',
      key: 'scaleName'
    },
    {
      title: '测评时间',
      dataIndex: 'completedAt',
      key: 'completedAt'
    },
    {
      title: '总体结果',
      dataIndex: 'result',
      key: 'result',
      render: function renderResult(result: string) {
        return <Tag color="blue">{result}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: function renderScaleAction() {
        return <Button type="link">查看报告</Button>
      }
    }
  ]

  return (
    <Card title={`受试者详情 - ID: ${id}`}>
      <Tabs defaultActiveKey="info">
        <TabPane tab="基本信息" key="info">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="姓名">张三</Descriptions.Item>
            <Descriptions.Item label="手机号">138****8888</Descriptions.Item>
            <Descriptions.Item label="身份证">待完善</Descriptions.Item>
            <Descriptions.Item label="学校">示例学校</Descriptions.Item>
            <Descriptions.Item label="年级">初一</Descriptions.Item>
            <Descriptions.Item label="班级">1班</Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="调查问卷记录" key="surveys">
          <Table
            columns={surveyColumns}
            dataSource={[]}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>

        <TabPane tab="医学量表报告" key="scales">
          <Table
            columns={scaleColumns}
            dataSource={[]}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>
    </Card>
  )
}

export default SubjectDetail
