import React from 'react'
import { Card, Tabs, Descriptions, Table, Progress, Button } from 'antd'
import { useParams } from 'react-router-dom'

const { TabPane } = Tabs

const ScreeningDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  const resultColumns = [
    {
      title: '受试者姓名',
      dataIndex: 'subjectName',
      key: 'subjectName'
    },
    {
      title: '学校',
      dataIndex: 'school',
      key: 'school'
    },
    {
      title: '班级',
      dataIndex: 'class',
      key: 'class'
    },
    {
      title: '总体得分',
      dataIndex: 'totalScore',
      key: 'totalScore'
    },
    {
      title: '风险等级',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: function renderRiskLevel(level: string) {
        const colorMap: Record<string, string> = {
          'low': 'green',
          'medium': 'orange',
          'high': 'red'
        }
        return <span style={{ color: colorMap[level] }}>{level}</span>
      }
    },
    {
      title: '操作',
      key: 'action',
      render: function renderAction() {
        return <Button type="link">查看详情</Button>
      }
    }
  ]

  return (
    <Card title={`筛查项目详情 - ID: ${id}`}>
      <Tabs defaultActiveKey="config">
        <TabPane tab="项目配置" key="config">
          <Descriptions bordered column={2}>
            <Descriptions.Item label="项目名称">示例筛查项目</Descriptions.Item>
            <Descriptions.Item label="使用量表">心理健康量表</Descriptions.Item>
            <Descriptions.Item label="目标学校">学校A, 学校B</Descriptions.Item>
            <Descriptions.Item label="目标年级">初一, 初二</Descriptions.Item>
            <Descriptions.Item label="执行时间">2024-01-01 至 2024-01-31</Descriptions.Item>
            <Descriptions.Item label="状态">进行中</Descriptions.Item>
          </Descriptions>
        </TabPane>

        <TabPane tab="完成情况统计" key="stats">
          <Card>
            <Descriptions bordered column={1}>
              <Descriptions.Item label="总人数">1000</Descriptions.Item>
              <Descriptions.Item label="已完成">800</Descriptions.Item>
              <Descriptions.Item label="完成率">
                <Progress percent={80} />
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </TabPane>

        <TabPane tab="筛查结果与预警" key="results">
          <Table
            columns={resultColumns}
            dataSource={[]}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>
    </Card>
  )
}

export default ScreeningDetail
