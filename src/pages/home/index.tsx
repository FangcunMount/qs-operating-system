import React, { useEffect } from 'react'
import { Card, Row, Col, Button, Statistic, List, Typography, Space, Spin } from 'antd'
import { 
  FileTextOutlined, 
  FormOutlined, 
  PieChartOutlined, 
  TeamOutlined,
  RightOutlined,
  PlusOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import './index.scss'

const { Title, Paragraph } = Typography

const Home: React.FC = observer(() => {
  const history = useHistory()
  const { statisticsStore } = rootStore

  useEffect(() => {
    // 使用新的系统统计接口，同时保持向后兼容
    statisticsStore.fetchSystemStatistics()
  }, [])

  const quickActions = [
    {
      title: '创建问卷',
      icon: <PlusOutlined />,
      description: '快速创建一份新问卷',
      action: () => history.push('/qs/list'),
      color: '#1890ff'
    },
    {
      title: '问卷列表',
      icon: <FileTextOutlined />,
      description: '查看和管理所有问卷',
      action: () => history.push('/qs/list'),
      color: '#52c41a'
    },
    {
      title: '数据分析',
      icon: <PieChartOutlined />,
      description: '查看问卷数据统计',
      action: () => history.push('/qs/list'),
      color: '#faad14'
    }
  ]

  const features = [
    {
      icon: <FormOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      title: '问卷管理',
      description: '创建、编辑、删除问卷，支持多种题型'
    },
    {
      icon: <TeamOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      title: '答卷管理',
      description: '查看答卷列表，导出答卷数据'
    },
    {
      icon: <BarChartOutlined style={{ fontSize: 24, color: '#faad14' }} />,
      title: '数据分析',
      description: '统计分析问卷数据，生成图表报告'
    },
    {
      icon: <PieChartOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      title: '因子设置',
      description: '配置问卷因子，实现智能评分'
    }
  ]

  return (
    <div className="home-page">
      {/* 欢迎横幅 */}
      <div className="home-header">
        <Title level={2} style={{ margin: 0, color: '#fff' }}>
          问卷系统管理后台
        </Title>
        <Paragraph style={{ margin: '8px 0 0 0', color: 'rgba(255,255,255,0.85)' }}>
          欢迎使用问卷管理系统，在这里您可以创建问卷、管理答卷、分析数据
        </Paragraph>
      </div>

      <div className="home-container">
        {/* 统计卡片 */}
        <Spin spinning={statisticsStore.loading}>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="问卷总数"
                  value={statisticsStore.statistics.totalQuestionSheets}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="答卷总数"
                  value={statisticsStore.statistics.totalAnswerSheets}
                  prefix={<FormOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="今日答卷"
                  value={statisticsStore.statistics.todayAnswers}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="stat-card">
                <Statistic
                  title="用户总数"
                  value={statisticsStore.statistics.totalUsers}
                  prefix={<PieChartOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
        </Spin>

        {/* 快捷操作 */}
        <Card 
          title="快捷操作" 
          style={{ marginBottom: 24 }}
          className="quick-actions-card"
        >
          <Row gutter={[16, 16]}>
            {quickActions.map((action, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card 
                  hoverable 
                  className="action-card"
                  onClick={action.action}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div style={{ fontSize: 32, color: action.color }}>
                      {action.icon}
                    </div>
                    <div>
                      <Title level={4} style={{ margin: 0 }}>{action.title}</Title>
                      <Paragraph type="secondary" style={{ margin: '8px 0 0 0' }}>
                        {action.description}
                      </Paragraph>
                    </div>
                    <Button type="primary" icon={<RightOutlined />} style={{ marginTop: 8 }}>
                      立即使用
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 功能介绍 */}
        <Card title="系统功能" className="features-card">
          <List
            grid={{ 
              gutter: 16, 
              xs: 1, 
              sm: 2, 
              md: 2, 
              lg: 4, 
              xl: 4, 
              xxl: 4 
            }}
            dataSource={features}
            renderItem={item => (
              <List.Item>
                <Card className="feature-item">
                  <Space direction="vertical" align="center" style={{ width: '100%' }}>
                    {item.icon}
                    <Title level={5} style={{ margin: '12px 0 8px 0' }}>
                      {item.title}
                    </Title>
                    <Paragraph 
                      type="secondary" 
                      style={{ textAlign: 'center', margin: 0 }}
                    >
                      {item.description}
                    </Paragraph>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        </Card>

        {/* 使用提示 */}
        <Card title="使用提示" style={{ marginTop: 24 }}>
          <List
            size="small"
            dataSource={[
              '点击"创建问卷"可以快速创建一份新的问卷',
              '在问卷列表中可以编辑、删除、查看问卷详情',
              '每个问卷都可以设置题目显隐、因子配置和数据分析',
              '在答卷管理中可以查看所有用户的答卷数据并导出',
              '使用数据分析功能可以查看问卷的统计图表和报告'
            ]}
            renderItem={item => (
              <List.Item>
                <Typography.Text>
                  <RightOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                  {item}
                </Typography.Text>
              </List.Item>
            )}
          />
        </Card>
      </div>
    </div>
  )
})

export default Home
