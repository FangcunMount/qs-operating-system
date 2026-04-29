import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, DatePicker, Empty, Row, Select, Space, Statistic, Table, Tabs, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import moment from 'moment'
import {
  getOverviewStatistics,
  listAssessmentEntryStatistics,
  listClinicianStatistics
} from '@/api/path/statistics'
import type {
  IAssessmentEntryStatisticsResponse,
  IClinicianStatisticsResponse,
  IDailyCount,
  IStatisticsOverviewResponse,
  IStatisticsQueryParams
} from '@/api/path/statistics'
import { extractErrorMessage } from '@/utils/apiError'
import './index.scss'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TabPane } = Tabs

type PresetValue = 'today' | '7d' | '30d'

const CHART_COLORS = ['#1677ff', '#00b578', '#faad14', '#ff7a45', '#722ed1', '#13c2c2', '#eb2f96']

type BarDatum = {
  name: string
  value: number
  fill: string
}

function formatChartDate(raw: string): string {
  if (!raw) return '-'
  const parsed = moment(raw)
  return parsed.isValid() ? parsed.format('MM-DD') : raw.slice(5, 10)
}

function formatShortEntry(entry: IAssessmentEntryStatisticsResponse): string {
  const suffix = entry.entry.id.slice(-6)
  return `${entry.entry.clinician_name || '入口'}-${suffix}`
}

function renderCardTitle(title: string, question: string, note?: string) {
  return (
    <Space direction="vertical" size={0}>
      <Text strong>{title}</Text>
      <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal' }}>
        回答的问题：{question}
      </Text>
      {note ? (
        <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'normal' }}>
          说明：{note}
        </Text>
      ) : null}
    </Space>
  )
}

type DailySeries = {
  key: string
  source: IDailyCount[]
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
      label: formatChartDate(date)
    }
    maps.forEach((item) => {
      row[item.key] = item.values.get(date) || 0
    })
    return row
  })
}

function formatNumber(value: number): string {
  return value.toLocaleString()
}

function hasBarData(data: BarDatum[]): boolean {
  return data.some((item) => item.value > 0)
}

const StatisticsCenterPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState<PresetValue>('30d')
  const [customRange, setCustomRange] = useState<any[] | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState<IStatisticsOverviewResponse | null>(null)
  const [clinicians, setClinicians] = useState<IClinicianStatisticsResponse[]>([])
  const [entries, setEntries] = useState<IAssessmentEntryStatisticsResponse[]>([])

  const buildParams = useCallback((): IStatisticsQueryParams => {
    if (customRange && customRange[0] && customRange[1]) {
      return {
        from: customRange[0].format('YYYY-MM-DD HH:mm:ss'),
        to: customRange[1].format('YYYY-MM-DD HH:mm:ss')
      }
    }

    return { preset }
  }, [customRange, preset])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = buildParams()
      const [[overviewError, overviewResponse], [clinicianError, clinicianResponse], [entryError, entryResponse]] = await Promise.all([
        getOverviewStatistics(params),
        listClinicianStatistics({ ...params, page: 1, page_size: 10 }),
        listAssessmentEntryStatistics({ ...params, page: 1, page_size: 10 })
      ])

      if (overviewError || !overviewResponse?.data) {
        throw overviewError || new Error('获取统计概览失败')
      }

      setOverview(overviewResponse.data)
      setClinicians(!clinicianError && clinicianResponse?.data ? clinicianResponse.data.items || [] : [])
      setEntries(!entryError && entryResponse?.data ? entryResponse.data.items || [] : [])
    } catch (error) {
      console.error(error)
      message.error(extractErrorMessage(error, '获取统计中心数据失败'))
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const clinicianColumns = useMemo<ColumnsType<IClinicianStatisticsResponse>>(
    () => [
      { title: '临床人员', dataIndex: ['clinician', 'name'], key: 'name', width: 180 },
      { title: '科室', dataIndex: ['clinician', 'department'], key: 'department', width: 180, render: (value) => value || '-' },
      { title: '主责', dataIndex: ['snapshot', 'primary_testee_count'], key: 'primary', width: 100 },
      { title: '跟进', dataIndex: ['snapshot', 'attending_testee_count'], key: 'attending', width: 100 },
      { title: '协作', dataIndex: ['snapshot', 'collaborator_testee_count'], key: 'collaborator', width: 100 },
      { title: '活跃入口', dataIndex: ['snapshot', 'active_entry_count'], key: 'entries', width: 100 },
      { title: '窗口入口打开', dataIndex: ['funnel', 'resolved_count'], key: 'resolved', width: 140 },
      { title: '窗口完成接入', dataIndex: ['window', 'intake_count'], key: 'intake', width: 140 },
      { title: '窗口建立照护关系', dataIndex: ['window', 'assigned_count'], key: 'assigned', width: 160 },
      { title: '窗口形成测评', dataIndex: ['funnel', 'assessment_count'], key: 'assessment_count', width: 140 },
      { title: '窗口产出报告', dataIndex: ['window', 'completed_assessment_count'], key: 'completed_assessment_count', width: 140 }
    ],
    []
  )

  const entryColumns = useMemo<ColumnsType<IAssessmentEntryStatisticsResponse>>(
    () => [
      { title: '入口 ID', dataIndex: ['entry', 'id'], key: 'id', width: 180 },
      { title: '临床人员', dataIndex: ['entry', 'clinician_name'], key: 'clinician_name', width: 160, render: (value) => value || '-' },
      { title: '目标类型', dataIndex: ['entry', 'target_type'], key: 'target_type', width: 120 },
      { title: '目标编码', dataIndex: ['entry', 'target_code'], key: 'target_code', width: 180 },
      { title: '状态', dataIndex: ['entry', 'is_active'], key: 'is_active', width: 100, render: (value: boolean) => (value ? '启用' : '停用') },
      { title: '窗口入口打开', dataIndex: ['window', 'resolve_count'], key: 'window_resolve_count', width: 120 },
      { title: '窗口完成接入', dataIndex: ['window', 'intake_count'], key: 'window_intake_count', width: 140 },
      { title: '窗口建立照护关系', dataIndex: ['window', 'assigned_count'], key: 'window_assigned_count', width: 150 },
      { title: '窗口形成测评', dataIndex: ['window', 'assessment_count'], key: 'window_assessment_count', width: 130 },
      { title: '累计入口打开', dataIndex: ['snapshot', 'resolve_count'], key: 'resolve_count', width: 120 },
      { title: '累计完成接入', dataIndex: ['snapshot', 'intake_count'], key: 'intake_count', width: 140 },
      { title: '累计建立照护关系', dataIndex: ['snapshot', 'assigned_count'], key: 'assigned_count', width: 150 },
      { title: '累计形成测评', dataIndex: ['snapshot', 'assessment_count'], key: 'assessment_count', width: 130 }
    ],
    []
  )

  const resourceCompositionData = useMemo<BarDatum[]>(() => {
    return [
      { name: '累计测评', value: overview?.organization_overview.assessment_count || 0, fill: CHART_COLORS[4] },
      { name: '累计报告', value: overview?.organization_overview.report_count || 0, fill: CHART_COLORS[5] }
    ]
  }, [overview])

  const accessFunnelData = useMemo<BarDatum[]>(() => {
    return [
      { name: '入口打开', value: overview?.access_funnel.window.entry_opened_count || 0, fill: CHART_COLORS[0] },
      { name: '完成接入', value: overview?.access_funnel.window.intake_confirmed_count || 0, fill: CHART_COLORS[1] },
      { name: '新建档案', value: overview?.access_funnel.window.testee_created_count || 0, fill: CHART_COLORS[2] },
      { name: '建立照护', value: overview?.access_funnel.window.care_relationship_established_count || 0, fill: CHART_COLORS[3] }
    ]
  }, [overview])

  const assessmentTrendData = useMemo(() => {
    if (!overview) return []
    return mergeDailySeries([
      { key: 'submitted', source: overview.assessment_service.trend.answersheet_submitted },
      { key: 'created', source: overview.assessment_service.trend.assessment_created },
      { key: 'reports', source: overview.assessment_service.trend.report_generated },
      { key: 'failed', source: overview.assessment_service.trend.assessment_failed }
    ])
  }, [overview])

  const planTaskData = useMemo<BarDatum[]>(() => {
    return [
      { name: '任务发放', value: overview?.plan.window.task_created_count || 0, fill: '#faad14' },
      { name: '任务打开', value: overview?.plan.window.task_opened_count || 0, fill: '#4096ff' },
      { name: '任务完成', value: overview?.plan.window.task_completed_count || 0, fill: '#ff7a45' },
      { name: '任务逾期', value: overview?.plan.window.task_expired_count || 0, fill: '#cf1322' }
    ]
  }, [overview])

  const planTrendData = useMemo(() => {
    if (!overview) return []
    return mergeDailySeries([
      { key: 'created', source: overview.plan.trend.task_created },
      { key: 'opened', source: overview.plan.trend.task_opened },
      { key: 'completed', source: overview.plan.trend.task_completed },
      { key: 'expired', source: overview.plan.trend.task_expired }
    ])
  }, [overview])

  const clinicianResourceData = useMemo(() => {
    return [...clinicians]
      .sort((a, b) => b.snapshot.total_accessible_testees - a.snapshot.total_accessible_testees)
      .slice(0, 8)
      .map((item) => ({
        name: item.clinician.name,
        accessible: item.snapshot.total_accessible_testees,
        primary: item.snapshot.primary_testee_count,
        activeEntries: item.snapshot.active_entry_count
      }))
  }, [clinicians])

  const clinicianAccessData = useMemo(() => {
    return [...clinicians]
      .sort(
        (a, b) =>
          b.funnel.resolved_count + b.window.intake_count + b.window.assigned_count -
          (a.funnel.resolved_count + a.window.intake_count + a.window.assigned_count)
      )
      .slice(0, 8)
      .map((item) => ({
        name: item.clinician.name,
        opened: item.funnel.resolved_count,
        intake: item.window.intake_count,
        connected: item.window.assigned_count
      }))
  }, [clinicians])

  const clinicianServiceData = useMemo(() => {
    return [...clinicians]
      .sort(
        (a, b) =>
          b.window.completed_assessment_count + b.funnel.assessment_count -
          (a.window.completed_assessment_count + a.funnel.assessment_count)
      )
      .slice(0, 8)
      .map((item) => ({
        name: item.clinician.name,
        assessments: item.funnel.assessment_count,
        reports: item.window.completed_assessment_count
      }))
  }, [clinicians])

  const entryAccessData = useMemo(() => {
    return [...entries]
      .sort(
        (a, b) =>
          b.window.resolve_count + b.window.intake_count + b.window.assigned_count -
          (a.window.resolve_count + a.window.intake_count + a.window.assigned_count)
      )
      .slice(0, 8)
      .map((item) => ({
        name: formatShortEntry(item),
        opened: item.window.resolve_count,
        intake: item.window.intake_count,
        connected: item.window.assigned_count
      }))
  }, [entries])

  const entryServiceData = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.window.assessment_count - a.window.assessment_count)
      .slice(0, 8)
      .map((item) => ({
        name: formatShortEntry(item),
        assessments: item.window.assessment_count
      }))
  }, [entries])

  const entryStatusData = useMemo(() => {
    const active = entries.filter((item) => item.entry.is_active).length
    const inactive = entries.length - active
    return [
      { name: '启用', value: active },
      { name: '停用', value: inactive }
    ].filter((item) => item.value > 0)
  }, [entries])

  const entryTargetTypeData = useMemo(() => {
    const counts = entries.reduce<Record<string, number>>((acc, item) => {
      const key = item.entry.target_type || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [entries])

  const clinicianDimensionTotals = useMemo(() => {
    return clinicians.reduce(
      (acc, item) => ({
        accessible: acc.accessible + item.snapshot.total_accessible_testees,
        activeEntries: acc.activeEntries + item.snapshot.active_entry_count,
        intake: acc.intake + item.window.intake_count,
        reports: acc.reports + item.window.completed_assessment_count
      }),
      { accessible: 0, activeEntries: 0, intake: 0, reports: 0 }
    )
  }, [clinicians])

  const entryDimensionTotals = useMemo(() => {
    return entries.reduce(
      (acc, item) => ({
        active: acc.active + (item.entry.is_active ? 1 : 0),
        opened: acc.opened + item.window.resolve_count,
        intake: acc.intake + item.window.intake_count,
        connected: acc.connected + item.window.assigned_count,
        assessments: acc.assessments + item.window.assessment_count
      }),
      { active: 0, opened: 0, intake: 0, connected: 0, assessments: 0 }
    )
  }, [entries])

  const renderEmptyChart = (description: string) => (
    <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />
    </div>
  )

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Title level={3} style={{ marginBottom: 4 }}>统计中心</Title>
            <Text type="secondary">按机构总览、接入漏斗、测评服务、维度分析和 Plan 维度查看运营数据。</Text>
          </div>
          <Space wrap>
            <Select
              value={preset}
              onChange={(value) => {
                const nextPreset = value as PresetValue
                setPreset(nextPreset)
                setCustomRange(null)
              }}
              style={{ width: 140 }}
              options={[
                { label: '今天', value: 'today' },
                { label: '近 7 天', value: '7d' },
                { label: '近 30 天', value: '30d' }
              ]}
            />
            <RangePicker
              showTime
              value={customRange as any}
              onChange={(value) => setCustomRange((value as any) || null)}
            />
            <Button type="primary" onClick={fetchData}>
              刷新
            </Button>
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="统计中心概览" key="overview">
            <Space direction="vertical" size={16} className="statistics-dashboard">
              <Card className="dashboard-summary" loading={loading}>
                <div className="dashboard-summary__header">
                  <div>
                    <Text strong className="dashboard-summary__title">核心指标模块</Text>
                    <Text type="secondary" className="dashboard-summary__range">
                      {overview?.time_range.from ? formatChartDate(overview.time_range.from) : '-'} 至{' '}
                      {overview?.time_range.to ? formatChartDate(overview.time_range.to) : '-'}
                    </Text>
                  </div>
                  <Text type="secondary">每个模块只展示一个主指标和对应报表</Text>
                </div>
              </Card>

              <Row gutter={[16, 16]} className="overview-module-grid">
                <Col xs={24} lg={12}>
                  <Card className="overview-module-card" loading={loading}>
                    <div className="overview-module-card__header">
                      <div>
                        <Text strong>机构规模</Text>
                        <Text type="secondary">资源底盘</Text>
                      </div>
                      <Statistic title="受试者总数" value={overview?.organization_overview.testee_count || 0} />
                    </div>
                    <div className="overview-module-card__meta">
                      临床人员 {formatNumber(overview?.organization_overview.clinician_count || 0)} · 活跃入口{' '}
                      {formatNumber(overview?.organization_overview.active_entry_count || 0)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      {hasBarData(resourceCompositionData) ? (
                        <ResponsiveContainer>
                          <BarChart data={resourceCompositionData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={80} />
                            <Tooltip formatter={(value: number) => [value, '累计']} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {resourceCompositionData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : renderEmptyChart('暂无累计数据')}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card className="overview-module-card" loading={loading}>
                    <div className="overview-module-card__header">
                      <div>
                        <Text strong>接入漏斗</Text>
                        <Text type="secondary">窗口转化</Text>
                      </div>
                      <Statistic title="新建档案" value={overview?.access_funnel.window.testee_created_count || 0} />
                    </div>
                    <div className="overview-module-card__meta">
                      入口打开 {formatNumber(overview?.access_funnel.window.entry_opened_count || 0)} · 完成接入{' '}
                      {formatNumber(overview?.access_funnel.window.intake_confirmed_count || 0)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      {hasBarData(accessFunnelData) ? (
                        <ResponsiveContainer>
                          <BarChart data={accessFunnelData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={82} />
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {accessFunnelData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : renderEmptyChart('暂无接入数据')}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card className="overview-module-card" loading={loading}>
                    <div className="overview-module-card__header">
                      <div>
                        <Text strong>测评服务</Text>
                        <Text type="secondary">服务交付</Text>
                      </div>
                      <Statistic title="产出报告" value={overview?.assessment_service.window.report_generated_count || 0} />
                    </div>
                    <div className="overview-module-card__meta">
                      提交答卷 {formatNumber(overview?.assessment_service.window.answersheet_submitted_count || 0)} · 产生测评{' '}
                      {formatNumber(overview?.assessment_service.window.assessment_created_count || 0)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      {assessmentTrendData.length ? (
                        <ResponsiveContainer>
                          <LineChart data={assessmentTrendData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="submitted" name="提交答卷" stroke={CHART_COLORS[4]} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="created" name="产生测评" stroke={CHART_COLORS[5]} strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="reports" name="产出报告" stroke={CHART_COLORS[6]} strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : renderEmptyChart('暂无测评服务趋势')}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card className="overview-module-card" loading={loading}>
                    <div className="overview-module-card__header">
                      <div>
                        <Text strong>Plan 执行</Text>
                        <Text type="secondary">任务履约</Text>
                      </div>
                      <Statistic title="任务完成" value={overview?.plan.window.task_completed_count || 0} />
                    </div>
                    <div className="overview-module-card__meta">
                      参与受试者 {formatNumber(overview?.plan.window.enrolled_testees || 0)} · 活跃受试者{' '}
                      {formatNumber(overview?.plan.window.active_testees || 0)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      {hasBarData(planTaskData) ? (
                        <ResponsiveContainer>
                          <BarChart data={planTaskData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} />
                            <YAxis type="category" dataKey="name" width={82} />
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                              {planTaskData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : renderEmptyChart('暂无 Plan 数据')}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card className="dashboard-section" loading={loading} title={<span className="dashboard-section__title">维度 dashboard</span>}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div className="dimension-tile">
                      <Statistic title="临床人员维度" value={overview?.dimension_analysis.clinician_count || 0} />
                      <Button type="link" onClick={() => setActiveTab('clinicians')}>查看临床人员维度</Button>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="dimension-tile">
                      <Statistic title="入口维度" value={overview?.dimension_analysis.entry_count || 0} />
                      <Button type="link" onClick={() => setActiveTab('entries')}>查看入口维度</Button>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="dimension-tile">
                      <Statistic title="Plan 维度" value={overview?.plan.window.task_created_count || 0} />
                      <Button type="link" onClick={() => setActiveTab('plans')}>查看 Plan 维度</Button>
                    </div>
                  </Col>
                </Row>
              </Card>
            </Space>
          </TabPane>
          <TabPane tab="临床人员维度" key="clinicians">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card className="dashboard-summary" loading={loading}>
                <div className="dashboard-summary__header">
                  <div>
                    <Text strong className="dashboard-summary__title">临床人员维度总览</Text>
                    <Text type="secondary" className="dashboard-summary__range">先看总体承载，再拆资源、接入和服务产出。</Text>
                  </div>
                </div>
                <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">临床人员维度</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.dimension_analysis.clinician_count || 0)}</div>
                    <div className="dashboard-kpi__hint">当前可分析人数</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">样本可访问受试者</div>
                    <div className="dashboard-kpi__value">{formatNumber(clinicianDimensionTotals.accessible)}</div>
                    <div className="dashboard-kpi__hint">当前表格样本合计</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">窗口完成接入</div>
                    <div className="dashboard-kpi__value">{formatNumber(clinicianDimensionTotals.intake)}</div>
                    <div className="dashboard-kpi__hint">样本窗口合计</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">窗口产出报告</div>
                    <div className="dashboard-kpi__value">{formatNumber(clinicianDimensionTotals.reports)}</div>
                    <div className="dashboard-kpi__hint">样本窗口合计</div>
                  </div>
                </div>
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('1. 资源分布拆解', '当前服务资源主要分布在哪些临床人员手里？')}
              >
                {clinicianResourceData.length ? (
                  <div style={{ width: '100%', height: 360 }}>
                    <ResponsiveContainer>
                      <BarChart data={clinicianResourceData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="accessible" name="可访问受试者" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="primary" name="主责受试者" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                        <Bar dataKey="activeEntries" name="活跃入口" fill={CHART_COLORS[4]} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无临床人员资源数据')}
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('2. 接入承接拆解', '最近谁在承接更多入口打开、完成接入和建立照护关系？')}
              >
                {clinicianAccessData.length ? (
                  <div style={{ width: '100%', height: 360 }}>
                    <ResponsiveContainer>
                      <BarChart data={clinicianAccessData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="opened" name="入口打开" fill={CHART_COLORS[0]} />
                        <Bar dataKey="intake" name="完成接入" fill={CHART_COLORS[1]} />
                        <Bar dataKey="connected" name="建立照护关系" fill={CHART_COLORS[2]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无临床人员接入行为数据')}
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('3. 服务产出拆解', '最近谁把接入进一步转成了测评和报告？')}
              >
                {clinicianServiceData.length ? (
                  <div style={{ width: '100%', height: 360 }}>
                    <ResponsiveContainer>
                      <BarChart data={clinicianServiceData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="assessments" name="形成测评" fill={CHART_COLORS[3]} />
                        <Bar dataKey="reports" name="产出报告" fill={CHART_COLORS[5]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无临床人员服务结果数据')}
              </Card>

              <Card loading={loading} title="临床人员明细">
                <Table
                  rowKey={(record) => record.clinician.id}
                  dataSource={clinicians}
                  columns={clinicianColumns}
                  pagination={false}
                  scroll={{ x: 1200 }}
                />
              </Card>
            </Space>
          </TabPane>
          <TabPane tab="入口维度" key="entries">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card className="dashboard-summary" loading={loading}>
                <div className="dashboard-summary__header">
                  <div>
                    <Text strong className="dashboard-summary__title">入口维度总览</Text>
                    <Text type="secondary" className="dashboard-summary__range">先看入口供给，再拆入口接入和服务承接。</Text>
                  </div>
                </div>
                <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">入口维度</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.dimension_analysis.entry_count || 0)}</div>
                    <div className="dashboard-kpi__hint">当前可分析入口数</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">样本启用入口</div>
                    <div className="dashboard-kpi__value">{formatNumber(entryDimensionTotals.active)}</div>
                    <div className="dashboard-kpi__hint">当前表格样本</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">窗口入口打开</div>
                    <div className="dashboard-kpi__value">{formatNumber(entryDimensionTotals.opened)}</div>
                    <div className="dashboard-kpi__hint">样本窗口合计</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">窗口形成测评</div>
                    <div className="dashboard-kpi__value">{formatNumber(entryDimensionTotals.assessments)}</div>
                    <div className="dashboard-kpi__hint">样本窗口合计</div>
                  </div>
                </div>
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('1. 入口供给拆解', '当前有哪些入口在运行，它们主要指向什么目标类型？')}
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    {entryStatusData.length ? (
                      <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={entryStatusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                              {entryStatusData.map((item, index) => (
                                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无状态数据')}
                  </Col>
                  <Col xs={24} lg={12}>
                    {entryTargetTypeData.length ? (
                      <div style={{ width: '100%', height: 240 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={entryTargetTypeData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                              {entryTargetTypeData.map((item, index) => (
                                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无类型数据')}
                  </Col>
                </Row>
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('2. 接入效果拆解', '最近哪些入口真正被打开，并继续转成了完成接入和建立照护关系？')}
              >
                {entryAccessData.length ? (
                  <div style={{ width: '100%', height: 360 }}>
                    <ResponsiveContainer>
                      <BarChart data={entryAccessData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="opened" name="入口打开" fill={CHART_COLORS[0]} />
                        <Bar dataKey="intake" name="完成接入" fill={CHART_COLORS[2]} />
                        <Bar dataKey="connected" name="建立照护关系" fill={CHART_COLORS[3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无入口接入行为数据')}
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle(
                  '3. 服务承接拆解',
                  '最近哪些入口已经开始把接入转成测评服务？',
                  '当前入口维度还没有报告产出统计，因此先用“形成测评”观察服务承接效果。'
                )}
              >
                {entryServiceData.length ? (
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={entryServiceData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip />
                        <Bar dataKey="assessments" name="窗口形成测评" fill={CHART_COLORS[4]} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无入口服务承接数据')}
              </Card>

              <Card loading={loading} title="入口明细">
                <Table
                  rowKey={(record) => record.entry.id}
                  dataSource={entries}
                  columns={entryColumns}
                  pagination={false}
                  scroll={{ x: 1400 }}
                />
              </Card>
            </Space>
          </TabPane>
          <TabPane tab="Plan 维度" key="plans">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card className="dashboard-summary" loading={loading}>
                <div className="dashboard-summary__header">
                  <div>
                    <Text strong className="dashboard-summary__title">Plan 维度总览</Text>
                    <Text type="secondary" className="dashboard-summary__range">先看任务履约，再拆任务节点和趋势。</Text>
                  </div>
                </div>
                <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">任务发放</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.plan.window.task_created_count || 0)}</div>
                    <div className="dashboard-kpi__hint">当前窗口</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">任务完成</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.plan.window.task_completed_count || 0)}</div>
                    <div className="dashboard-kpi__hint">当前窗口</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">参与受试者</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.plan.window.enrolled_testees || 0)}</div>
                    <div className="dashboard-kpi__hint">当前窗口</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">活跃受试者</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.plan.window.active_testees || 0)}</div>
                    <div className="dashboard-kpi__hint">当前窗口</div>
                  </div>
                </div>
              </Card>

              <Card
                className="dashboard-section"
                loading={loading}
                title={renderCardTitle('1. 任务节点拆解', 'Plan 任务发放、打开、完成和逾期分别贡献了多少？')}
              >
                <div className="dashboard-chart dashboard-chart--small">
                  {hasBarData(planTaskData) ? (
                    <ResponsiveContainer>
                      <BarChart data={planTaskData} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={82} />
                        <Tooltip formatter={(value: number) => [value, '数量']} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {planTaskData.map((item) => (
                            <Cell key={item.name} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : renderEmptyChart('暂无 Plan 数据')}
                </div>
              </Card>

              <Card
                className="dashboard-section"
                loading={loading}
                title={renderCardTitle('2. 任务趋势拆解', 'Plan 任务在当前窗口内是集中发放、持续完成，还是出现逾期堆积？')}
              >
                <div className="dashboard-chart">
                  {planTrendData.length ? (
                    <ResponsiveContainer>
                      <LineChart data={planTrendData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="created" name="任务发放" stroke="#faad14" strokeWidth={2} />
                        <Line type="monotone" dataKey="opened" name="任务打开" stroke="#4096ff" strokeWidth={2} />
                        <Line type="monotone" dataKey="completed" name="任务完成" stroke="#ff7a45" strokeWidth={2} />
                        <Line type="monotone" dataKey="expired" name="任务逾期" stroke="#cf1322" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : renderEmptyChart('暂无 Plan 趋势')}
                </div>
              </Card>
            </Space>
          </TabPane>
        </Tabs>
      </Space>
    </div>
  )
}

export default StatisticsCenterPage
