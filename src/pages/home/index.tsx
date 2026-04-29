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
  Bar,
  BarChart,
  CartesianGrid,
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
import type { IDailyCount, IStatisticsOverviewResponse } from '@/api/path/statistics'
import ClinicianWorkbenchPage from '@/pages/clinician/workbench'
import './index.scss'

const { Title, Text } = Typography
const CHART_COLORS = ['#1677ff', '#00b578', '#faad14', '#ff7a45', '#722ed1', '#13c2c2', '#eb2f96']

type DailySeries = {
  key: string
  source: IDailyCount[]
}

type BarDatum = {
  name: string
  value: number
  fill: string
}

function mergeDailySeries(series: DailySeries[]) {
  const maps = series.map((item) => ({
    key: item.key,
    values: new Map(item.source.map((point) => [point.date, point.count]))
  }))
  const dates = Array.from(new Set(series.flatMap((item) => item.source.map((point) => point.date)))).sort()

  return dates.map((date) => {
    const row: Record<string, string | number> = {
      date,
      label: date.slice(5, 10)
    }
    maps.forEach((item) => {
      row[item.key] = item.values.get(date) || 0
    })
    return row
  })
}

function formatNumber(value: number) {
  return value.toLocaleString()
}

function hasBarData(data: BarDatum[]) {
  return data.some((item) => item.value > 0)
}

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

  const organizationBarData = useMemo<BarDatum[]>(() => {
    return [
      { name: '测评', value: overviewStats?.organization_overview.assessment_count || 0, fill: CHART_COLORS[4] },
      { name: '报告', value: overviewStats?.organization_overview.report_count || 0, fill: CHART_COLORS[5] }
    ]
  }, [overviewStats])

  const accessFunnelData = useMemo<BarDatum[]>(() => {
    return [
      { name: '入口打开', value: overviewStats?.access_funnel.window.entry_opened_count || 0, fill: CHART_COLORS[0] },
      { name: '完成接入', value: overviewStats?.access_funnel.window.intake_confirmed_count || 0, fill: CHART_COLORS[1] },
      { name: '新建档案', value: overviewStats?.access_funnel.window.testee_created_count || 0, fill: CHART_COLORS[2] },
      { name: '建立照护', value: overviewStats?.access_funnel.window.care_relationship_established_count || 0, fill: CHART_COLORS[3] }
    ]
  }, [overviewStats])

  const assessmentTrendData = useMemo(() => {
    if (!overviewStats) return []
    return mergeDailySeries([
      { key: 'submitted', source: overviewStats.assessment_service.trend.answersheet_submitted },
      { key: 'assessments', source: overviewStats.assessment_service.trend.assessment_created },
      { key: 'reports', source: overviewStats.assessment_service.trend.report_generated }
    ])
  }, [overviewStats])

  const assessmentMetricData = useMemo<BarDatum[]>(() => {
    return [
      { name: '提交答卷', value: overviewStats?.assessment_service.window.answersheet_submitted_count || 0, fill: CHART_COLORS[4] },
      { name: '产生测评', value: overviewStats?.assessment_service.window.assessment_created_count || 0, fill: CHART_COLORS[5] },
      { name: '产出报告', value: overviewStats?.assessment_service.window.report_generated_count || 0, fill: CHART_COLORS[6] },
      { name: '失败测评', value: overviewStats?.assessment_service.window.assessment_failed_count || 0, fill: '#f5222d' }
    ]
  }, [overviewStats])

  const planTaskData = useMemo<BarDatum[]>(() => {
    return [
      { name: '任务发放', value: overviewStats?.plan.window.task_created_count || 0, fill: '#faad14' },
      { name: '任务打开', value: overviewStats?.plan.window.task_opened_count || 0, fill: '#4096ff' },
      { name: '计划完成', value: overviewStats?.plan.window.task_completed_count || 0, fill: '#ff7a45' },
      { name: '任务逾期', value: overviewStats?.plan.window.task_expired_count || 0, fill: '#f5222d' }
    ]
  }, [overviewStats])

  const quickLinkMeta: Record<string, { description: string; color: string }> = {
    operations: {
      description: userStore.accessContext.isClinician ? '查看我的受试者、测评记录与相关统计' : '查看受试者、测评记录、计划与统计',
      color: '#722ed1'
    },
    'system-governance': {
      description: '查看缓存治理与平台运行状态',
      color: '#fa8c16'
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
              <Row gutter={[16, 16]} className="home-stat-modules">
                <Col xs={24} lg={12} xl={6}>
                  <Card className="home-stat-module" hoverable onClick={() => history.push('/statistics/center')}>
                    <div className="module-header">
                      <div>
                        <Text className="module-title">机构规模</Text>
                        <Text type="secondary" className="module-subtitle">当前资源基线</Text>
                      </div>
                      <TeamOutlined className="module-icon" />
                    </div>
                    <div className="module-primary">
                      <span className="module-primary-value">
                        {formatNumber(overviewStats?.organization_overview.testee_count || 0)}
                      </span>
                      <span className="module-primary-label">受试者总数</span>
                    </div>
                    <div className="module-meta-grid">
                      <span>临床人员 <b>{formatNumber(overviewStats?.organization_overview.clinician_count || 0)}</b></span>
                      <span>活跃入口 <b>{formatNumber(overviewStats?.organization_overview.active_entry_count || 0)}</b></span>
                    </div>
                    <div className="module-chart module-chart-compact">
                      {hasBarData(organizationBarData) ? (
                        <ResponsiveContainer>
                          <BarChart data={organizationBarData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis type="category" dataKey="name" width={40} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value: number) => [value, '累计']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {organizationBarData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无累计数据" />
                      )}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12} xl={6}>
                  <Card className="home-stat-module" hoverable onClick={() => history.push('/statistics/center')}>
                    <div className="module-header">
                      <div>
                        <Text className="module-title">接入漏斗</Text>
                        <Text type="secondary" className="module-subtitle">近 30 天</Text>
                      </div>
                      <BarChartOutlined className="module-icon" />
                    </div>
                    <div className="module-primary">
                      <span className="module-primary-value">
                        {formatNumber(overviewStats?.access_funnel.window.testee_created_count || 0)}
                      </span>
                      <span className="module-primary-label">新建档案</span>
                    </div>
                    <div className="module-note">首页只看漏斗是否有有效转化，细节进入统计中心拆维度。</div>
                    <div className="module-chart">
                      {hasBarData(accessFunnelData) ? (
                        <ResponsiveContainer>
                          <BarChart data={accessFunnelData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis type="category" dataKey="name" width={68} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {accessFunnelData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无接入数据" />
                      )}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12} xl={6}>
                  <Card className="home-stat-module" hoverable onClick={() => history.push('/statistics/center')}>
                    <div className="module-header">
                      <div>
                        <Text className="module-title">测评服务</Text>
                        <Text type="secondary" className="module-subtitle">近 30 天</Text>
                      </div>
                      <FormOutlined className="module-icon" />
                    </div>
                    <div className="module-primary">
                      <span className="module-primary-value">
                        {formatNumber(overviewStats?.assessment_service.window.report_generated_count || 0)}
                      </span>
                      <span className="module-primary-label">产出报告</span>
                    </div>
                    <div className="module-meta-grid">
                      <span>提交答卷 <b>{formatNumber(overviewStats?.assessment_service.window.answersheet_submitted_count || 0)}</b></span>
                      <span>产生测评 <b>{formatNumber(overviewStats?.assessment_service.window.assessment_created_count || 0)}</b></span>
                    </div>
                    <div className="module-chart">
                      {assessmentTrendData.length ? (
                        <ResponsiveContainer>
                          <LineChart data={assessmentTrendData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" interval="preserveStartEnd" tickLine={false} />
                            <YAxis allowDecimals={false} hide />
                            <Tooltip />
                            <Line type="monotone" dataKey="submitted" name="提交答卷" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="assessments" name="产生测评" stroke={CHART_COLORS[5]} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="reports" name="产出报告" stroke={CHART_COLORS[6]} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : hasBarData(assessmentMetricData) ? (
                        <ResponsiveContainer>
                          <BarChart data={assessmentMetricData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis type="category" dataKey="name" width={68} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {assessmentMetricData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无服务数据" />
                      )}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12} xl={6}>
                  <Card className="home-stat-module" hoverable onClick={() => history.push('/statistics/center')}>
                    <div className="module-header">
                      <div>
                        <Text className="module-title">Plan 任务</Text>
                        <Text type="secondary" className="module-subtitle">近 30 天</Text>
                      </div>
                      <CalendarOutlined className="module-icon" />
                    </div>
                    <div className="module-primary">
                      <span className="module-primary-value">
                        {formatNumber(overviewStats?.plan.window.task_completed_count || 0)}
                      </span>
                      <span className="module-primary-label">任务完成</span>
                    </div>
                    <div className="module-meta-grid">
                      <span>参与受试者 <b>{formatNumber(overviewStats?.plan.window.enrolled_testees || 0)}</b></span>
                      <span>活跃受试者 <b>{formatNumber(overviewStats?.plan.window.active_testees || 0)}</b></span>
                    </div>
                    <div className="module-chart">
                      {hasBarData(planTaskData) ? (
                        <ResponsiveContainer>
                          <BarChart data={planTaskData} layout="vertical" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} hide />
                            <YAxis type="category" dataKey="name" width={68} tickLine={false} axisLine={false} />
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {planTaskData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无计划数据" />
                      )}
                    </div>
                  </Card>
                </Col>
              </Row>

              <div className="stats-section-footer">
                <Button type="link" onClick={() => history.push('/statistics/center')}>
                  查看完整统计中心
                </Button>
              </div>
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
