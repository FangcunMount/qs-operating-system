/* eslint-disable react/prop-types */
import React, { useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Timeline, Tag, Collapse } from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CalendarOutlined, 
  ExclamationCircleOutlined,
  DownOutlined
} from '@ant-design/icons'

const { Panel } = Collapse

interface TaskStatus {
  week: number
  status: 'completed' | 'pending' | 'overdue'
  completedAt?: string
  dueDate?: string
}

interface PeriodicProject {
  id: string
  name: string
  totalWeeks: number
  completedWeeks: number
  completionRate: number
  tasks: TaskStatus[]
}

interface PeriodicStatsProps {
  data: PeriodicProject[]
}

const PeriodicStats: React.FC<PeriodicStatsProps> = ({ data }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  // 渲染项目简要信息
  const renderProjectSummary = (project: PeriodicProject) => {
    // 统计各状态数量
    const statusCount = project.tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return (
      <div style={{ 
        padding: '16px',
        background: '#fafafa',
        borderRadius: 4,
        marginBottom: 16
      }}>
        <Row gutter={24} align="middle">
          <Col>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={project.completionRate}
                width={70}
                strokeWidth={6}
                status={project.completionRate >= 80 ? 'success' : 'normal'}
              />
              <div style={{ 
                marginTop: 8, 
                fontSize: 12, 
                color: '#8c8c8c'
              }}>
                完成率
              </div>
            </div>
          </Col>
          
          <Col flex={1}>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={8}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>总周次</div>
                  <div style={{ fontSize: 20, fontWeight: 500 }}>
                    {project.totalWeeks} <span style={{ fontSize: 14 }}>周</span>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} sm={8}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>已完成</div>
                  <div style={{ fontSize: 20, fontWeight: 500, color: '#52c41a' }}>
                    <CheckCircleOutlined style={{ marginRight: 4 }} />
                    {statusCount.completed || 0} <span style={{ fontSize: 14 }}>周</span>
                  </div>
                </div>
              </Col>
              
              <Col xs={24} sm={8}>
                <div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>状态分布</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {statusCount.completed > 0 && (
                      <Tag color="success" style={{ margin: 0 }}>完成 {statusCount.completed}</Tag>
                    )}
                    {statusCount.pending > 0 && (
                      <Tag color="processing" style={{ margin: 0 }}>待完成 {statusCount.pending}</Tag>
                    )}
                    {statusCount.overdue > 0 && (
                      <Tag color="error" style={{ margin: 0 }}>逾期 {statusCount.overdue}</Tag>
                    )}
                  </div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
    )
  }

  // 渲染单个项目的时间轴
  const renderProjectTimeline = (project: PeriodicProject) => {
    return (
      <div style={{ marginTop: 16 }}>
        <div style={{ 
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #f0f0f0',
          fontSize: 13,
          fontWeight: 500,
          color: '#595959'
        }}>
          测评时间轴
        </div>
        <Timeline mode="left">
          {project.tasks.map((task) => {
            let color = 'gray'
            let icon = <ClockCircleOutlined />
            let statusTag = null

            if (task.status === 'completed') {
              color = 'green'
              icon = <CheckCircleOutlined />
              statusTag = <Tag color="success">已完成</Tag>
            } else if (task.status === 'overdue') {
              color = 'red'
              icon = <ExclamationCircleOutlined />
              statusTag = <Tag color="error">已逾期</Tag>
            } else {
              color = 'blue'
              icon = <ClockCircleOutlined />
              statusTag = <Tag color="processing">待完成</Tag>
            }

            return (
              <Timeline.Item key={task.week} color={color} dot={icon}>
                <div style={{ paddingBottom: 12 }}>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 500 }}>第 {task.week} 周</span>
                    <span style={{ marginLeft: 8 }}>{statusTag}</span>
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 13 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {task.status === 'completed' && task.completedAt && (
                      <span>完成时间：{task.completedAt}</span>
                    )}
                    {task.status !== 'completed' && task.dueDate && (
                      <span>截止日期：{task.dueDate}</span>
                    )}
                  </div>
                </div>
              </Timeline.Item>
            )
          })}
        </Timeline>
      </div>
    )
  }

  // 计算总体统计
  const totalStats = data.reduce(
    (acc, project) => ({
      totalWeeks: acc.totalWeeks + project.totalWeeks,
      completedWeeks: acc.completedWeeks + project.completedWeeks
    }),
    { totalWeeks: 0, completedWeeks: 0 }
  )

  const overallRate = totalStats.totalWeeks > 0 
    ? Math.round((totalStats.completedWeeks / totalStats.totalWeeks) * 100)
    : 0

  return (
    <Card 
      title={
        <span>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          周期性测评填写情况
        </span>
      }
      style={{ marginTop: 16 }}
    >
      {/* 总体统计 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small" bordered={true}>
            <Statistic
              title="参与项目"
              value={data.length}
              suffix="个"
              valueStyle={{ fontSize: 24 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" bordered={true}>
            <Statistic
              title="已完成周次"
              value={totalStats.completedWeeks}
              suffix={`/ ${totalStats.totalWeeks}`}
              valueStyle={{ fontSize: 24, color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" bordered={true}>
            <Statistic
              title="总完成率"
              value={overallRate}
              suffix="%"
              valueStyle={{ fontSize: 24, color: overallRate >= 80 ? '#52c41a' : '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 各项目卡片 */}
      <Collapse
        bordered={false}
        activeKey={expandedKeys}
        onChange={(keys) => setExpandedKeys(keys as string[])}
        expandIcon={({ isActive }) => 
          <div style={{ 
            transition: 'all 0.3s',
            transform: isActive ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            <DownOutlined style={{ fontSize: 12 }} />
          </div>
        }
        style={{ background: 'transparent' }}
      >
        {data.map((project) => (
          <Panel
            key={project.id}
            header={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarOutlined style={{ color: '#1890ff', fontSize: 16 }} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{project.name}</span>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                  ({project.completedWeeks}/{project.totalWeeks})
                </span>
              </div>
            }
            style={{ 
              marginBottom: 16,
              background: '#fff',
              borderRadius: 4,
              border: '1px solid #d9d9d9'
            }}
            className="periodic-project-panel"
          >
            {/* 项目简要信息 */}
            {renderProjectSummary(project)}
            
            {/* 时间轴详情 */}
            {renderProjectTimeline(project)}
          </Panel>
        ))}
      </Collapse>
    </Card>
  )
}

export default PeriodicStats
