import React, { useEffect, useMemo, useState } from 'react'
import { Card, Row, Col, Button, Typography, Space, Spin, Empty } from 'antd'
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
  SettingOutlined
} from '@ant-design/icons'
import {
  CartesianGrid,
  Funnel,
  FunnelChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell
} from 'recharts'
import { useHistory } from 'react-router-dom'
import { observer } from 'mobx-react-lite'
import { rootStore } from '@/store'
import { routes } from '@/router/map'
import { filterRoutesForMenu } from '@/utils/menuAccess'
import { getRouteDisplayTitle } from '@/utils/routeDisplay'
import { getOverviewStatistics } from '@/api/path/statistics'
import type { IStatisticsOverviewResponse } from '@/api/path/statistics'
import ClinicianWorkbenchPage from '@/pages/clinician/workbench'
import './index.scss'

const { Title, Text } = Typography
const CHART_COLORS = ['#1677ff', '#00b578', '#faad14', '#ff7a45', '#722ed1', '#13c2c2', '#eb2f96']

const Home: React.FC = observer(() => {
  const history = useHistory()
  const { userStore } = rootStore
  const [expandedTips, setExpandedTips] = useState<Set<number>>(new Set())
  const [overviewStats, setOverviewStats] = useState<IStatisticsOverviewResponse | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(false)

  useEffect(() => {
    const shouldFetchOverview = userStore.accessContext.capabilities.has('org_admin') || userStore.accessContext.isPlatformAdmin
    if (!shouldFetchOverview) {
      setOverviewStats(null)
      return
    }

    let cancelled = false
    setOverviewLoading(true)
    getOverviewStatistics({ preset: '30d' })
      .then(([error, response]) => {
        if (cancelled) return
        if (error || !response?.data) {
          throw error || new Error('获取统计概览失败')
        }
        setOverviewStats(response.data)
      })
      .catch((error) => {
        if (cancelled) return
        console.error(error)
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userStore.accessContext.capabilities, userStore.accessContext.isPlatformAdmin])

  const showAdminStats = userStore.accessContext.capabilities.has('org_admin') || userStore.accessContext.isPlatformAdmin
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

  const summaryStats = [
    {
      title: '测评总数',
      value: overviewStats?.snapshot.assessment_count || 0,
      icon: <BarChartOutlined />,
      color: '#722ed1',
      action: () => history.push('/assessment/list')
    },
    {
      title: '受试者总数',
      value: overviewStats?.snapshot.testee_count || 0,
      icon: <TeamOutlined />,
      color: '#faad14',
      action: () => history.push('/subject/list')
    },
    {
      title: '临床人员总数',
      value: overviewStats?.snapshot.clinician_count || 0,
      icon: <TeamOutlined />,
      color: '#13c2c2',
      action: () => history.push('/admin/clinicians')
    },
    {
      title: 'Active 入口',
      value: overviewStats?.snapshot.active_entry_count || 0,
      icon: <FormOutlined />,
      color: '#52c41a',
      action: () => history.push('/statistics/center')
    }
  ]

  const windowStats = [
    {
      title: '近 30 天新增受试者',
      value: overviewStats?.window.new_testees || 0,
      icon: <TeamOutlined />,
      color: '#fa8c16',
      action: () => history.push('/statistics/center')
    },
    {
      title: '近 30 天入口解析',
      value: overviewStats?.window.entry_resolved_count || 0,
      icon: <BarChartOutlined />,
      color: '#1677ff',
      action: () => history.push('/statistics/center')
    },
    {
      title: '近 30 天 Intake',
      value: overviewStats?.window.entry_intake_count || 0,
      icon: <BarChartOutlined />,
      color: '#722ed1',
      action: () => history.push('/statistics/center')
    },
    {
      title: '近 30 天 Assigned',
      value: overviewStats?.window.relation_assigned_count || 0,
      icon: <CalendarOutlined />,
      color: '#eb2f96',
      action: () => history.push('/statistics/center')
    },
    {
      title: '近 30 天完成测评',
      value: overviewStats?.window.assessment_completed_count || 0,
      icon: <FormOutlined />,
      color: '#13c2c2',
      action: () => history.push('/statistics/center')
    }
  ]

  const trendData = useMemo(() => {
    if (!overviewStats) return []
    const assessmentMap = new Map(overviewStats.trend.assessments.map((item) => [item.date, item.count]))
    const intakeMap = new Map(overviewStats.trend.intakes.map((item) => [item.date, item.count]))
    const assignmentMap = new Map(overviewStats.trend.assignments.map((item) => [item.date, item.count]))
    const allDates = Array.from(new Set([
      ...overviewStats.trend.assessments.map((item) => item.date),
      ...overviewStats.trend.intakes.map((item) => item.date),
      ...overviewStats.trend.assignments.map((item) => item.date)
    ])).sort()

    return allDates.map((date) => ({
      date,
      label: date.slice(5, 10),
      assessments: assessmentMap.get(date) || 0,
      intakes: intakeMap.get(date) || 0,
      assignments: assignmentMap.get(date) || 0
    }))
  }, [overviewStats])

  const funnelData = useMemo(() => {
    const raw = [
      { name: '新增受试者', value: overviewStats?.window.new_testees || 0, fill: CHART_COLORS[0] },
      { name: '入口创建', value: overviewStats?.window.entry_created_count || 0, fill: CHART_COLORS[1] },
      { name: '入口解析', value: overviewStats?.window.entry_resolved_count || 0, fill: CHART_COLORS[2] },
      { name: 'Intake', value: overviewStats?.window.entry_intake_count || 0, fill: CHART_COLORS[3] },
      { name: 'Assigned', value: overviewStats?.window.relation_assigned_count || 0, fill: CHART_COLORS[4] },
      { name: '完成测评', value: overviewStats?.window.assessment_completed_count || 0, fill: CHART_COLORS[5] }
    ].filter((item) => item.value > 0)

    const baseline = raw[0]?.value || 0
    return raw.map((item, index) => ({
      ...item,
      rateLabel: baseline > 0
        ? `${((item.value / baseline) * 100).toFixed(index === 0 ? 0 : 1)}%`
        : '0%'
    }))
  }, [overviewStats])

  const quickLinkMeta: Record<string, { description: string; color: string }> = {
    operations: {
      description: userStore.accessContext.isClinician ? '查看我的受试者、测评记录与相关统计' : '查看受试者、测评记录、计划与统计',
      color: '#722ed1'
    },
    content: { description: '管理问卷和量表内容', color: '#1890ff' },
    'clinician-workbench': { description: '进入我的受试者、关系和入口工作区', color: '#52c41a' },
    'organization-management': { description: '管理员工、临床人员、权限和资源', color: '#f5222d' }
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
        primary: route.name === 'clinician-workbench'
      }
    })
  const dedupedQuickLinks = quickLinks.filter(
    (link, index, arr) => arr.findIndex((item) => item.path === link.path) === index
  )

  const clinicianWorkbenchLink = userStore.accessContext.isClinician
    ? {
      title: '临床工作台',
      icon: <TeamOutlined />,
      path: '/clinician/me',
      color: '#52c41a',
      description: '进入我的受试者、关系和入口工作区',
      primary: true
    }
    : null

  const orderedQuickLinks = [
    ...(clinicianWorkbenchLink ? [clinicianWorkbenchLink] : []),
    ...dedupedQuickLinks.filter((link) => !userStore.accessContext.isClinician || link.path !== '/clinician/me')
  ]
    .filter((link, index, arr) => arr.findIndex((item) => item.path === link.path) === index)
    .sort((a, b) => {
      if (a.primary === b.primary) return 0
      return a.primary ? -1 : 1
    })

  const headerAction = (() => {
    if (userStore.accessContext.isClinician) {
      return { text: '进入工作台', path: '/clinician/me', icon: <TeamOutlined /> }
    }
    if (userStore.accessContext.capabilities.has('manage_content')) {
      return { text: '创建新量表', path: '/scale/info/new', icon: <PlusOutlined /> }
    }
    if (userStore.accessContext.capabilities.has('manage_evaluation_plans')) {
      return { text: '创建计划', path: '/plan/create', icon: <CalendarOutlined /> }
    }
    if (userStore.accessContext.capabilities.has('read_assessment_records')) {
      return { text: '查看测评记录', path: '/assessment/list', icon: <BarChartOutlined /> }
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
              {userStore.accessContext.isClinician ? '临床工作台' : '测评运营后台'}
            </Title>
            <Text className="header-subtitle">
              {userStore.accessContext.isClinician
                ? '聚焦我的受试者、关系和测评入口'
                : '按当前身份展示机构管理、内容配置与测评运营能力'}
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
        {/* 统计 Dashboard */}
        {showAdminStats && (
          <Spin spinning={overviewLoading}>
            <div className="stats-section">
              <Row gutter={[16, 16]} className="stats-row">
                {summaryStats.map((stat, index) => (
                  <Col xs={24} sm={12} lg={6} key={`summary-${index}`}>
                    <Card
                      className="stat-card stat-card-summary"
                      hoverable
                      onClick={stat.action}
                    >
                      <div className="stat-card-topline" style={{ background: stat.color }} />
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

              <Row gutter={[16, 16]} className="stats-row">
                {windowStats.map((stat, index) => (
                  <Col xs={24} sm={12} lg={6} key={`window-${index}`}>
                    <Card
                      className="stat-card stat-card-window"
                      hoverable
                      onClick={stat.action}
                    >
                      <div className="stat-card-topline stat-card-topline-soft" style={{ background: stat.color }} />
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

              <Row gutter={[16, 16]} className="stats-chart-row">
                <Col xs={24} lg={15}>
                  <Card
                    className="overview-chart-card"
                    title="近 30 天趋势总览"
                    extra={(
                      <Button type="link" onClick={() => history.push('/statistics/center')}>
                        查看统计中心
                      </Button>
                    )}
                  >
                    {trendData.length ? (
                      <div className="overview-chart">
                        <ResponsiveContainer>
                          <LineChart data={trendData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="assessments" name="测评" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="intakes" name="Intake" stroke={CHART_COLORS[2]} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="assignments" name="Assigned" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="overview-chart-empty">
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无趋势数据" />
                      </div>
                    )}
                  </Card>
                </Col>
                <Col xs={24} lg={9}>
                  <Card
                    className="overview-chart-card"
                    title="窗口转化漏斗"
                    extra={(
                      <Button type="link" onClick={() => history.push('/statistics/center')}>
                        查看详情
                      </Button>
                    )}
                  >
                    {funnelData.length ? (
                      <div className="overview-chart">
                        <ResponsiveContainer>
                          <FunnelChart>
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Funnel
                              data={funnelData}
                              dataKey="value"
                              nameKey="name"
                              isAnimationActive={false}
                            >
                              <LabelList dataKey="name" position="right" stroke="none" fill="#595959" />
                              <LabelList dataKey="rateLabel" position="left" stroke="none" fill="#8c8c8c" />
                              {funnelData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="overview-chart-empty">
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无转化数据" />
                      </div>
                    )}
                  </Card>
                </Col>
              </Row>
            </div>
          </Spin>
        )}

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

        {userStore.accessContext.isClinician && <ClinicianWorkbenchPage embedded />}

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
