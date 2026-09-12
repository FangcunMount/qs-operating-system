import React, { useState } from 'react'
import { Card, Row, Col, Button, Typography, Space } from 'antd'
import { 
  ExperimentOutlined, 
  RightOutlined,
  DownOutlined,
  UpOutlined,
  PlusOutlined,
  BarChartOutlined,
  CalendarOutlined,
  FolderOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import { routes } from '@/router/map'
import { filterRoutesForMenu } from '@/utils/menuAccess'
import { getRouteDisplayTitle } from '@/utils/routeDisplay'
import OperationsPanel from '@/components/statistics/OperationsPanel'
import './index.scss'

const { Title, Text } = Typography
const Home: React.FC = observer(() => {
  const history = useHistory()
  const { userStore } = rootStore
  const [expandedTips, setExpandedTips] = useState<Set<number>>(new Set())
  const visibleRoutes = filterRoutesForMenu(routes, userStore.accessContext, userStore.profileFetchDone)

  const toggleTip = (index: number) => {
    const newExpanded = new Set(expandedTips)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTips(newExpanded)
  }

  const quickLinkMeta: Record<string, { description: string; color: string }> = {
    operations: {
      description: '查看受试者、测评记录、计划与统计',
      color: '#722ed1'
    },
    'system-governance': {
      description: '统一查看事件、缓存、承压与治理动作',
      color: '#fa8c16'
    },
    content: { description: '管理问卷和量表内容', color: '#1890ff' },
    'organization-management': { description: '管理运营人员、医生、门店与权限', color: '#f5222d' }
  }

  const quickLinks = visibleRoutes
    .filter((route) => !['home', 'user'].includes(route.name))
    .map((route) => {
      const targetPath = route.children?.find((child) => !child.hideInMenu)?.path || route.path
      const meta = quickLinkMeta[route.name] || { description: '进入对应功能区', color: '#1890ff' }
      return {
        title: getRouteDisplayTitle(route.name, route.title, userStore.accessContext),
        icon: route.icon,
        path: targetPath,
        color: meta.color,
        description: meta.description,
        primary: false
      }
    })
  const dedupedQuickLinks = quickLinks.filter(
    (link, index, arr) => arr.findIndex((item) => item.path === link.path) === index
  )

  const orderedQuickLinks = [
    ...dedupedQuickLinks
  ]
    .filter((link, index, arr) => arr.findIndex((item) => item.path === link.path) === index)
    .sort((a, b) => {
      if (a.primary === b.primary) return 0
      return a.primary ? -1 : 1
    })

  const headerAction = (() => {
    if (userStore.accessContext.capabilities.has('manage_content')) {
      return { text: '创建新量表', path: '/scale/info/new', icon: <PlusOutlined /> }
    }
    if (userStore.accessContext.capabilities.has('manage_evaluation_plans')) {
      return { text: '创建计划', path: '/plan/create', icon: <CalendarOutlined /> }
    }
    if (userStore.accessContext.capabilities.has('read_assessment_records')) {
      return { text: '查看测评记录', path: '/assessment/list', icon: <BarChartOutlined /> }
    }
    if (userStore.accessContext.capabilities.has('read_assessment_progress')) {
      return { text: '查看测评进度', path: '/assessment/progress', icon: <BarChartOutlined /> }
    }
    return { text: '个人资料', path: '/user/profile', icon: <SettingOutlined /> }
  })()

  return (
    <div className="home-page">
      {/* 欢迎横幅 */}
      <div className="home-header">
        <div className="header-content">
          <div>
            <Title level={2} className="header-title">
              测评运营后台
            </Title>
            <Text className="header-subtitle">
              按当前身份展示机构管理、内容配置与测评运营能力
            </Text>
          </div>
          <Button 
            type="primary" 
            size="large" 
            icon={headerAction.icon}
            onClick={() => history.push(headerAction.path)}
            className="header-action"
          >
            {headerAction.text}
          </Button>
        </div>
      </div>

      <div className="home-container">
        <OperationsPanel compact />

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
            {orderedQuickLinks.map((link, index) => (
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
