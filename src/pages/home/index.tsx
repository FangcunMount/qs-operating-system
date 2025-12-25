import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Button, Typography, Space, Spin } from 'antd'
import { 
  ExperimentOutlined, 
  FormOutlined, 
  TeamOutlined,
  RightOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  BarChartOutlined,
  CalendarOutlined,
  FolderOutlined,
  SettingOutlined,
  AuditOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import './index.scss'

const { Title, Text } = Typography

const Home: React.FC = observer(() => {
  const history = useHistory()
  const { statisticsStore } = rootStore
  const [expandedTips, setExpandedTips] = useState<Set<number>>(new Set())

  useEffect(() => {
    statisticsStore.fetchSystemStatistics()
  }, [])

  const stats = statisticsStore.systemStatistics
  const isLoading = statisticsStore.loading

  const toggleTip = (index: number) => {
    const newExpanded = new Set(expandedTips)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTips(newExpanded)
  }

  // 主要统计卡片 - 突出医学量表相关数据
  const mainStats = [
    {
      title: '医学量表',
      value: stats?.questionnaire_count || 0,
      icon: <ExperimentOutlined />,
      color: '#1890ff',
      action: () => history.push('/scale/list')
    },
    {
      title: '测评总数',
      value: stats?.assessment_count || 0,
      icon: <BarChartOutlined />,
      color: '#722ed1',
      action: () => history.push('/plan/list')
    },
    {
      title: '受试者总数',
      value: stats?.testee_count || 0,
      icon: <TeamOutlined />,
      color: '#faad14',
      action: () => history.push('/subject/list')
    },
    {
      title: '答卷总数',
      value: stats?.answer_sheet_count || 0,
      icon: <FormOutlined />,
      color: '#1890ff',
      action: () => history.push('/scale/list')
    },
    {
      title: '今日新增量表',
      value: stats?.today_new_questionnaires || 0,
      icon: <ExperimentOutlined />,
      color: '#52c41a',
      action: () => history.push('/scale/list')
    },
    {
      title: '今日新增测评',
      value: stats?.today_new_assessments || 0,
      icon: <BarChartOutlined />,
      color: '#722ed1',
      action: () => history.push('/plan/list')
    },
    {
      title: '今日新增受试者',
      value: stats?.today_new_testees || 0,
      icon: <TeamOutlined />,
      color: '#faad14',
      action: () => history.push('/subject/list')
    },
    {
      title: '今日新增答卷',
      value: stats?.today_new_answer_sheets || 0,
      icon: <FormOutlined />,
      color: '#13c2c2',
      action: () => history.push('/scale/list')
    }
  ]

  // 快捷入口 - 医学量表优先
  const quickLinks = [
    {
      title: '医学量表',
      icon: <ExperimentOutlined />,
      path: '/scale/list',
      color: '#1890ff',
      description: '创建和管理医学量表',
      primary: true
    },
    {
      title: '受试者管理',
      icon: <TeamOutlined />,
      path: '/subject/list',
      color: '#faad14',
      description: '查看和管理受试者信息'
    },
    {
      title: '测评计划',
      icon: <CalendarOutlined />,
      path: '/plan/list',
      color: '#722ed1',
      description: '创建和管理测评计划'
    },
    {
      title: '入校筛查',
      icon: <AuditOutlined />,
      path: '/screening/list',
      color: '#eb2f96',
      description: '管理入校筛查项目'
    },
    {
      title: '调查问卷',
      icon: <FileTextOutlined />,
      path: '/survey/list',
      color: '#1890ff',
      description: '管理调查问卷模板'
    },
    {
      title: '系统管理',
      icon: <SettingOutlined />,
      path: '/admin/list',
      color: '#13c2c2',
      description: '管理员和权限配置'
    }
  ]

  return (
    <div className="home-page">
      {/* 欢迎横幅 */}
      <div className="home-header">
        <div className="header-content">
          <div>
            <Title level={2} className="header-title">
              医学量表管理系统
            </Title>
            <Text className="header-subtitle">
              专业的医学量表创建、管理和测评平台
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={<PlusOutlined />}
            onClick={() => history.push('/scale/info/new')}
            className="header-action"
          >
            创建新量表
          </Button>
        </div>
      </div>

      <div className="home-container">
        {/* 统计 Dashboard */}
        <Spin spinning={isLoading}>
          <Row gutter={[16, 16]} className="stats-row">
            {mainStats.map((stat, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card 
                  className="stat-card"
                  hoverable
                  onClick={stat.action}
                >
                  <div className="stat-content">
                    <div className="stat-icon" style={{ color: stat.color }}>
                      {stat.icon}
                    </div>
                    <div className="stat-info">
                      <div className="stat-title">{stat.title}</div>
                      <div className="stat-value-wrapper">
                        <div className="stat-value" style={{ color: stat.color }}>
                          {stat.value.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>

        {/* 快捷入口 */}
        <Card 
          title={
            <Space>
              <FolderOutlined />
              <span>功能入口</span>
            </Space>
          }
          className="quick-links-card"
        >
          <Row gutter={[16, 16]}>
            {quickLinks.map((link, index) => (
              <Col xs={24} sm={12} lg={8} key={index}>
                <Card 
                  hoverable 
                  className={`quick-link-card ${link.primary ? 'primary-link' : ''}`}
                  onClick={() => history.push(link.path)}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div className="link-icon" style={{ color: link.color }}>
                      {link.icon}
                    </div>
                    <div>
                      <Title level={5} className="link-title">{link.title}</Title>
                      <Text type="secondary" className="link-desc">
                        {link.description}
                      </Text>
                    </div>
                    <Button 
                      type={link.primary ? 'primary' : 'link'} 
                      icon={<RightOutlined />}
                      className="link-button"
                    >
                      {link.primary ? '立即使用' : '立即前往'}
                    </Button>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 使用指南 */}
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Card 
              title={
                <Space>
                  <ExperimentOutlined />
                  <span>使用指南</span>
                </Space>
              }
              className="tips-card"
            >
              <div className="tips-content">
                <div 
                  className={`tip-item ${expandedTips.has(0) ? 'expanded' : ''}`}
                  onClick={() => toggleTip(0)}
                >
                  <div className="tip-header">
                    <Text className="tip-title">创建量表时，请先填写基本信息，包括分类、适用年龄、填报人等</Text>
                    {expandedTips.has(0) ? <UpOutlined className="tip-expand-icon" /> : <DownOutlined className="tip-expand-icon" />}
                  </div>
                  {expandedTips.has(0) && (
                    <div className="tip-detail">
                      <Text type="secondary">
                        在创建医学量表时，基本信息是量表的基础配置。您需要：
                        <br />• 选择量表的分类（如：ADHD、抽动障碍、感统等）
                        <br />• 设置适用年龄范围（婴幼儿、学龄前、学龄儿童、青少年、成人）
                        <br />• 选择填报人类型（家长评、教师评、自评、临床评定）
                        <br />• 填写量表的描述和标签，便于后续管理和查找
                      </Text>
                    </div>
                  )}
                </div>
                <div 
                  className={`tip-item ${expandedTips.has(1) ? 'expanded' : ''}`}
                  onClick={() => toggleTip(1)}
                >
                  <div className="tip-header">
                    <Text className="tip-title">编辑问题后，记得配置题目路由规则，控制题目的显示逻辑</Text>
                    {expandedTips.has(1) ? <UpOutlined className="tip-expand-icon" /> : <DownOutlined className="tip-expand-icon" />}
                  </div>
                  {expandedTips.has(1) && (
                    <div className="tip-detail">
                      <Text type="secondary">
                        题目路由规则用于控制题目在测评过程中的显示逻辑：
                        <br />• 可以根据前面题目的答案来决定后续题目的显示或隐藏
                        <br />• 支持复杂的条件判断，如：当某题选择&ldquo;是&rdquo;时，显示相关题目
                        <br />• 可以设置多个条件组合，实现更精细的题目流程控制
                        <br />• 合理配置路由规则可以提高测评效率，减少不必要的题目
                      </Text>
                    </div>
                  )}
                </div>
                <div 
                  className={`tip-item ${expandedTips.has(2) ? 'expanded' : ''}`}
                  onClick={() => toggleTip(2)}
                >
                  <div className="tip-header">
                    <Text className="tip-title">因子设置是量表的核心，需要正确配置因子和评分规则</Text>
                    {expandedTips.has(2) ? <UpOutlined className="tip-expand-icon" /> : <DownOutlined className="tip-expand-icon" />}
                  </div>
                  {expandedTips.has(2) && (
                    <div className="tip-detail">
                      <Text type="secondary">
                        因子设置决定了量表的评分逻辑和结果分析：
                        <br />• 每个因子可以包含多个题目，系统会自动计算因子得分
                        <br />• 需要为每个因子设置正确的题目权重和计分方式
                        <br />• 支持正向计分和反向计分，确保评分准确性
                        <br />• 因子得分将用于后续的风险评估和结果解读
                        <br />• 建议参考量表的标准化手册，确保因子配置的准确性
                      </Text>
                    </div>
                  )}
                </div>
                <div 
                  className={`tip-item ${expandedTips.has(3) ? 'expanded' : ''}`}
                  onClick={() => toggleTip(3)}
                >
                  <div className="tip-header">
                    <Text className="tip-title">解读规则决定了测评结果的展示，请根据临床需求配置</Text>
                    {expandedTips.has(3) ? <UpOutlined className="tip-expand-icon" /> : <DownOutlined className="tip-expand-icon" />}
                  </div>
                  {expandedTips.has(3) && (
                    <div className="tip-detail">
                      <Text type="secondary">
                        解读规则配置了测评结果的展示方式和风险等级：
                        <br />• 可以为每个因子设置不同的风险等级阈值（如：正常、轻度、中度、重度）
                        <br />• 支持设置解读文本，为不同风险等级提供相应的临床建议
                        <br />• 可以配置综合评估规则，结合多个因子得分进行整体评估
                        <br />• 解读结果将直接展示给受试者或临床医生，影响后续的干预决策
                        <br />• 建议与临床专家共同制定解读规则，确保结果的科学性和实用性
                      </Text>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
})

export default Home
