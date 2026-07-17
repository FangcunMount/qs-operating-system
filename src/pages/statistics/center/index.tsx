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
  IStatisticsOverviewResponse,
  IStatisticsQueryParams
} from '@/api/path/statistics'
import { extractErrorMessage } from '@/utils/apiError'
import AccessFunnelChart from '@/components/statistics/AccessFunnelChart'
import AssessmentReportTrendChart from '@/components/statistics/AssessmentReportTrendChart'
import {
  CLINICIAN_DIMENSION_SAMPLE_NOTE,
  buildClinicianIntakeRankRows,
  buildClinicianJourneyRows,
  countCliniciansWithWindowIntake,
  sortCliniciansByIntake
} from '@/components/statistics/accessServiceDimension'
import { buildAccessFunnelSteps, hasFunnelData } from '@/components/statistics/accessFunnel'
import { formatAssessmentFailureRate, hasReportTrendData } from '@/components/statistics/assessmentService'
import PlanActivityMetricsPanel from '@/components/statistics/PlanActivityMetricsPanel'
import PlanFulfillmentMetricsPanel from '@/components/statistics/PlanFulfillmentMetricsPanel'
import {
  buildPlanActivityBars,
  buildPlanFulfillmentBars,
  formatPlanRate,
  hasPlanBarData,
  hasPlanTrendData,
  mergePlanActivityTrend,
  mergePlanFulfillmentTrend,
  resolvePlanActivity,
  resolvePlanFulfillment
} from '@/components/statistics/planStatistics'
import './index.scss'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { TabPane } = Tabs

type PresetValue = 'today' | '7d' | '30d'

const CHART_COLORS = ['#1677ff', '#00b578', '#faad14', '#ff7a45', '#722ed1', '#13c2c2', '#eb2f96']

function formatChartDate(raw: string): string {
  if (!raw) return '-'
  const parsed = moment(raw)
  return parsed.isValid() ? parsed.format('MM-DD') : raw.slice(5, 10)
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

function formatNumber(value: number): string {
  return value.toLocaleString()
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
        from: customRange[0].clone().startOf('day').format('YYYY-MM-DD HH:mm:ss'),
        to: customRange[1].clone().endOf('day').format('YYYY-MM-DD HH:mm:ss')
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
      { title: '临床人员', dataIndex: ['clinician', 'name'], key: 'name', width: 160, fixed: 'left' },
      { title: '科室', dataIndex: ['clinician', 'department'], key: 'department', width: 140, render: (value) => value || '-' },
      { title: '活跃入口', dataIndex: ['snapshot', 'active_entry_count'], key: 'entries', width: 96 },
      { title: '窗口入口打开', dataIndex: ['funnel', 'resolved_count'], key: 'resolved', width: 120 },
      {
        title: '窗口完成接入',
        dataIndex: ['window', 'intake_count'],
        key: 'intake',
        width: 120,
        sorter: (a, b) => a.window.intake_count - b.window.intake_count,
        defaultSortOrder: 'descend'
      },
      { title: '窗口建立照护', dataIndex: ['window', 'assigned_count'], key: 'assigned', width: 120 },
      { title: '窗口形成测评', dataIndex: ['funnel', 'assessment_count'], key: 'assessment_count', width: 120 },
      { title: '窗口产出报告', dataIndex: ['window', 'completed_assessment_count'], key: 'reports', width: 120 },
      { title: '主责受试者', dataIndex: ['snapshot', 'primary_testee_count'], key: 'primary', width: 100 },
      { title: '跟进受试者', dataIndex: ['snapshot', 'attending_testee_count'], key: 'attending', width: 100 },
      { title: '协作受试者', dataIndex: ['snapshot', 'collaborator_testee_count'], key: 'collaborator', width: 100 }
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

  const accessFunnelChart = useMemo(() => {
    if (!overview) return { steps: [], conversions: [], outcomes: [] }
    return buildAccessFunnelSteps(overview.access_funnel.window, CHART_COLORS)
  }, [overview])

  const assessmentFailureMeta = useMemo(() => {
    const failed = overview?.assessment_service.window.assessment_failed_count || 0
    const created = overview?.assessment_service.window.assessment_created_count || 0
    return {
      failed,
      rate: formatAssessmentFailureRate(failed, created)
    }
  }, [overview])

  const planActivity = useMemo(() => resolvePlanActivity(overview?.plan), [overview])
  const planFulfillment = useMemo(() => resolvePlanFulfillment(overview?.plan), [overview])

  const planActivityBars = useMemo(() => buildPlanActivityBars(planActivity.window), [planActivity])
  const planFulfillmentBars = useMemo(
    () => (planFulfillment ? buildPlanFulfillmentBars(planFulfillment.window) : []),
    [planFulfillment]
  )

  const planActivityTrendData = useMemo(() => mergePlanActivityTrend(planActivity.trend), [planActivity])
  const planFulfillmentTrendData = useMemo(
    () => (planFulfillment ? mergePlanFulfillmentTrend(planFulfillment.trend) : []),
    [planFulfillment]
  )

  const sortedClinicians = useMemo(() => sortCliniciansByIntake(clinicians), [clinicians])

  const clinicianIntakeRankData = useMemo(() => buildClinicianIntakeRankRows(clinicians), [clinicians])

  const clinicianJourneyData = useMemo(() => buildClinicianJourneyRows(clinicians), [clinicians])

  const cliniciansWithIntakeCount = useMemo(
    () => countCliniciansWithWindowIntake(clinicians),
    [clinicians]
  )

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
        activeEntries: acc.activeEntries + item.snapshot.active_entry_count,
        opened: acc.opened + item.funnel.resolved_count,
        intake: acc.intake + item.window.intake_count,
        connected: acc.connected + item.window.assigned_count
      }),
      { activeEntries: 0, opened: 0, intake: 0, connected: 0 }
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
              format="YYYY-MM-DD"
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

              <Card className="overview-org-scale" loading={loading}>
                <div className="overview-module-card__header">
                  <div>
                    <Text strong>机构规模</Text>
                    <Text type="secondary">资源底盘</Text>
                  </div>
                </div>
                <div className="overview-org-scale__metrics">
                  <div className="overview-org-scale__metric">
                    <span>受试者总数</span>
                    <b>{formatNumber(overview?.organization_overview.testee_count || 0)}</b>
                  </div>
                  <div className="overview-org-scale__metric">
                    <span>临床人员</span>
                    <b>{formatNumber(overview?.organization_overview.clinician_count || 0)}</b>
                  </div>
                  <div className="overview-org-scale__metric">
                    <span>活跃入口</span>
                    <b>{formatNumber(overview?.organization_overview.active_entry_count || 0)}</b>
                  </div>
                  <div className="overview-org-scale__metric">
                    <span>使用内容</span>
                    <b>{formatNumber(overview?.organization_overview.content_count || 0)}</b>
                  </div>
                  <div className="overview-org-scale__metric">
                    <span>累计答卷提交</span>
                    <b>{formatNumber(overview?.organization_overview.answer_sheet_submission_count || 0)}</b>
                  </div>
                  <div className="overview-org-scale__metric">
                    <span>今日答卷提交</span>
                    <b>{formatNumber(overview?.organization_overview.today_answer_sheet_submission_count || 0)}</b>
                  </div>
                </div>
              </Card>

              <Row gutter={[16, 16]} className="overview-module-grid">
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
                      {formatNumber(overview?.access_funnel.window.intake_confirmed_count || 0)} · 建立照护{' '}
                      {formatNumber(overview?.access_funnel.window.care_relationship_established_count || 0)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      {hasFunnelData(accessFunnelChart.steps) ? (
                        <AccessFunnelChart
                          steps={accessFunnelChart.steps}
                          conversions={accessFunnelChart.conversions}
                          outcomes={accessFunnelChart.outcomes}
                          showNote
                        />
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
                      测评失败 {formatNumber(assessmentFailureMeta.failed)} · 失败率 <b>{assessmentFailureMeta.rate}</b>
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      {hasReportTrendData(overview?.assessment_service.trend.report_generated || []) ? (
                        <AssessmentReportTrendChart
                          reportGenerated={overview?.assessment_service.trend.report_generated || []}
                          strokeColor={CHART_COLORS[6]}
                        />
                      ) : renderEmptyChart('暂无产出报告趋势')}
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card className="overview-module-card" loading={loading}>
                    <div className="overview-module-card__header">
                      <div>
                        <Text strong>Plan 事件</Text>
                        <Text type="secondary">事件日活动</Text>
                      </div>
                      <Statistic title="事件完成" value={planActivity.window.task_completed_count} />
                    </div>
                    <div className="overview-module-card__meta">
                      任务发放 {formatNumber(planActivity.window.task_created_count)} · 任务打开{' '}
                      {formatNumber(planActivity.window.task_opened_count)} · 参与受试者{' '}
                      {formatNumber(planActivity.window.enrolled_testees)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      <PlanActivityMetricsPanel activity={planActivity} />
                    </div>
                  </Card>
                </Col>

                <Col xs={24} lg={12}>
                  <Card className="overview-module-card" loading={loading}>
                    <div className="overview-module-card__header">
                      <div>
                        <Text strong>Plan 履约</Text>
                        <Text type="secondary">计划 cohort</Text>
                      </div>
                      <Statistic
                        title="cohort 完成率"
                        value={formatPlanRate(planFulfillment?.window.completion_rate)}
                      />
                    </div>
                    <div className="overview-module-card__meta">
                      应完成 {formatNumber(planFulfillment?.window.due_task_count || 0)} · 已完成{' '}
                      {formatNumber(planFulfillment?.window.completed_task_count || 0)} · 逾期{' '}
                      {formatNumber(planFulfillment?.window.overdue_task_count || 0)}
                    </div>
                    <div className="dashboard-chart dashboard-chart--small">
                      <PlanFulfillmentMetricsPanel fulfillment={planFulfillment} />
                    </div>
                  </Card>
                </Col>
              </Row>

              <Card className="dashboard-section" loading={loading} title={<span className="dashboard-section__title">维度 dashboard</span>}>
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8}>
                    <div className="dimension-tile">
                      <Statistic title="临床人员维度" value={overview?.dimension_analysis.clinician_count || 0} />
                      <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
                        机构入口 {formatNumber(overview?.dimension_analysis.entry_count || 0)}（渠道见页底）
                      </Text>
                      <Button type="link" onClick={() => setActiveTab('clinicians')}>查看临床人员维度</Button>
                    </div>
                  </Col>
                  <Col xs={24} md={8}>
                    <div className="dimension-tile">
                      <Statistic title="Plan 维度" value={planActivity.window.task_created_count || 0} />
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
                    <Text type="secondary" className="dashboard-summary__range">
                      看每位临床人员在窗口期内通过入口入了多少人，以及旅程各阶段发生次数。
                    </Text>
                  </div>
                </div>
                <Text type="secondary" className="access-service-toolbar__note">
                  {CLINICIAN_DIMENSION_SAMPLE_NOTE}
                </Text>
                <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">机构临床人员</div>
                    <div className="dashboard-kpi__value">{formatNumber(overview?.dimension_analysis.clinician_count || 0)}</div>
                    <div className="dashboard-kpi__hint">可分析人数</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">样本窗口完成接入</div>
                    <div className="dashboard-kpi__value">{formatNumber(clinicianDimensionTotals.intake)}</div>
                    <div className="dashboard-kpi__hint">核心入组指标 · Top 10 合计</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">样本有接入行为</div>
                    <div className="dashboard-kpi__value">{formatNumber(cliniciansWithIntakeCount)}</div>
                    <div className="dashboard-kpi__hint">窗口完成接入 &gt; 0</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">样本活跃入口</div>
                    <div className="dashboard-kpi__value">{formatNumber(clinicianDimensionTotals.activeEntries)}</div>
                    <div className="dashboard-kpi__hint">Top 10 合计</div>
                  </div>
                </div>
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('1. 入组排名', '窗口期内完成接入最多的是哪些临床人员？')}
              >
                {clinicianIntakeRankData.length ? (
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={clinicianIntakeRankData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={120} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="intake" name="窗口完成接入" fill={CHART_COLORS[1]} radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无完成接入数据')}
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle(
                  '2. 旅程分解 Top 8',
                  '按临床人员看入口打开、完成接入、建立照护与形成测评各有多少。'
                )}
              >
                {clinicianJourneyData.length ? (
                  <div style={{ width: '100%', height: 360 }}>
                    <ResponsiveContainer>
                      <BarChart data={clinicianJourneyData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="opened" name="入口打开" fill={CHART_COLORS[0]} />
                        <Bar dataKey="intake" name="完成接入" fill={CHART_COLORS[1]} />
                        <Bar dataKey="connected" name="建立照护" fill={CHART_COLORS[2]} />
                        <Bar dataKey="assessments" name="形成测评" fill={CHART_COLORS[3]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无旅程数据')}
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle(
                  '3. 临床人员入组明细',
                  '每位临床人员在窗口期内的入组与各阶段旅程次数；产出报告见末列。'
                )}
              >
                <Table
                  rowKey={(record) => record.clinician.id}
                  dataSource={sortedClinicians}
                  columns={clinicianColumns}
                  pagination={false}
                  scroll={{ x: 1320 }}
                />
              </Card>

              <Card className="entry-supplement" loading={loading}>
                <div className="entry-supplement__header">
                  <div>
                    <Text strong className="entry-supplement__title">入口渠道（辅助）</Text>
                    <Text type="secondary" className="entry-supplement__desc">
                      入口是临床人员名下的投放渠道，旅程主分析请以上方临床人员视角为准。
                    </Text>
                  </div>
                  <Space size={16} wrap>
                    <Statistic title="机构入口" value={overview?.dimension_analysis.entry_count || 0} />
                    <Statistic title="样本启用" value={entryDimensionTotals.active} />
                  </Space>
                </div>
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    {entryStatusData.length ? (
                      <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={entryStatusData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={3}>
                              {entryStatusData.map((item, index) => (
                                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无入口状态数据')}
                  </Col>
                  <Col xs={24} lg={12}>
                    {entryTargetTypeData.length ? (
                      <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={entryTargetTypeData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={3}>
                              {entryTargetTypeData.map((item, index) => (
                                <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无入口类型数据')}
                  </Col>
                </Row>
                <Table
                  className="entry-supplement__table"
                  rowKey={(record) => record.entry.id}
                  dataSource={entries}
                  columns={entryColumns}
                  pagination={false}
                  scroll={{ x: 1400 }}
                  size="small"
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
                    <Text type="secondary" className="dashboard-summary__range">先看执行动作，再看计划 cohort 履约结果。</Text>
                  </div>
                </div>
                <div className="dashboard-kpi-grid dashboard-kpi-grid--four">
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">任务发放</div>
                    <div className="dashboard-kpi__value">{formatNumber(planActivity.window.task_created_count)}</div>
                    <div className="dashboard-kpi__hint">事件活动口径</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">事件完成</div>
                    <div className="dashboard-kpi__value">{formatNumber(planActivity.window.task_completed_count)}</div>
                    <div className="dashboard-kpi__hint">事件活动口径</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">cohort 应完成</div>
                    <div className="dashboard-kpi__value">{formatNumber(planFulfillment?.window.due_task_count || 0)}</div>
                    <div className="dashboard-kpi__hint">履约 cohort 口径</div>
                  </div>
                  <div className="dashboard-kpi">
                    <div className="dashboard-kpi__label">cohort 完成率</div>
                    <div className="dashboard-kpi__value">{formatPlanRate(planFulfillment?.window.completion_rate)}</div>
                    <div className="dashboard-kpi__hint">履约 cohort 口径</div>
                  </div>
                </div>
              </Card>

              <Card
                className="dashboard-section"
                loading={loading}
                title={renderCardTitle('1. 执行动作拆解', '按事件发生日期看任务发放、打开、完成分别发生在何时？')}
              >
                <div className="dashboard-chart dashboard-chart--small">
                  {hasPlanBarData(planActivityBars) ? (
                    <ResponsiveContainer>
                      <BarChart data={planActivityBars} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={82} />
                        <Tooltip formatter={(value: number) => [value, '数量']} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {planActivityBars.map((item) => (
                            <Cell key={item.name} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : renderEmptyChart('暂无执行动作数据')}
                </div>
              </Card>

              <Card
                className="dashboard-section"
                loading={loading}
                title={renderCardTitle('2. 执行动作趋势', '任务发放、打开、完成是否集中在某些日期发生？')}
              >
                <div className="dashboard-chart">
                  {hasPlanTrendData(planActivityTrendData, ['created', 'opened', 'completed']) ? (
                    <ResponsiveContainer>
                      <LineChart data={planActivityTrendData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="created" name="任务发放" stroke="#faad14" strokeWidth={2} />
                        <Line type="monotone" dataKey="opened" name="任务打开" stroke="#4096ff" strokeWidth={2} />
                        <Line type="monotone" dataKey="completed" name="任务完成" stroke="#ff7a45" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : renderEmptyChart('暂无执行动作趋势')}
                </div>
              </Card>

              <Card
                className="dashboard-section"
                loading={loading}
                title={renderCardTitle('3. 履约 cohort 拆解', '按计划截止 cohort 看应完成、已完成、逾期各有多少？')}
              >
                <div className="dashboard-chart dashboard-chart--small">
                  {hasPlanBarData(planFulfillmentBars) ? (
                    <ResponsiveContainer>
                      <BarChart data={planFulfillmentBars} layout="vertical" margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={82} />
                        <Tooltip formatter={(value: number) => [value, '数量']} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {planFulfillmentBars.map((item) => (
                            <Cell key={item.name} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : renderEmptyChart('暂无履约 cohort 数据')}
                </div>
              </Card>

              <Card
                className="dashboard-section"
                loading={loading}
                title={renderCardTitle('4. 履约 cohort 趋势', '按 planned/expire cohort 看应完成、已完成与逾期如何变化？')}
              >
                <div className="dashboard-chart">
                  {hasPlanTrendData(planFulfillmentTrendData, ['planned', 'due', 'completed', 'overdue']) ? (
                    <ResponsiveContainer>
                      <LineChart data={planFulfillmentTrendData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="planned" name="计划任务" stroke="#b37feb" strokeWidth={2} />
                        <Line type="monotone" dataKey="due" name="应完成" stroke="#722ed1" strokeWidth={2} />
                        <Line type="monotone" dataKey="completed" name="已完成" stroke="#52c41a" strokeWidth={2} />
                        <Line type="monotone" dataKey="overdue" name="逾期" stroke="#cf1322" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : renderEmptyChart('暂无履约 cohort 趋势')}
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
