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

const StatisticsCenterPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [preset, setPreset] = useState<PresetValue>('30d')
  const [customRange, setCustomRange] = useState<any[] | null>(null)
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

  const overviewTrendData = useMemo(() => {
    if (!overview) return []
    const assessmentMap = new Map(overview.trend.assessments.map((item) => [item.date, item.count]))
    const intakeMap = new Map(overview.trend.intakes.map((item) => [item.date, item.count]))
    const assignmentMap = new Map(overview.trend.assignments.map((item) => [item.date, item.count]))
    const allDates = Array.from(new Set([
      ...overview.trend.assessments.map((item) => item.date),
      ...overview.trend.intakes.map((item) => item.date),
      ...overview.trend.assignments.map((item) => item.date)
    ])).sort()

    return allDates.map((date) => ({
      date,
      label: formatChartDate(date),
      assessments: assessmentMap.get(date) || 0,
      intakes: intakeMap.get(date) || 0,
      assignments: assignmentMap.get(date) || 0
    }))
  }, [overview])

  const overviewWindowData = useMemo(() => {
    if (!overview) return []
    return [
      { name: '入口打开', value: overview.window.entry_resolved_count, fill: CHART_COLORS[0] },
      { name: '完成接入', value: overview.window.entry_intake_count, fill: CHART_COLORS[1] },
      { name: '新建档案', value: overview.window.new_testees, fill: CHART_COLORS[2] },
      { name: '建立照护关系', value: overview.window.relation_assigned_count, fill: CHART_COLORS[3] },
      { name: '形成测评', value: overview.window.assessment_created_count, fill: CHART_COLORS[4] },
      { name: '产出报告', value: overview.window.assessment_completed_count, fill: CHART_COLORS[5] }
    ]
  }, [overview])

  const overviewMetricData = useMemo(() => {
    return overviewWindowData.filter((item) => item.value > 0)
  }, [overviewWindowData])

  const overviewSectionCards = useMemo(() => {
    return [
      {
        title: '接入行为',
        items: [
          { label: '近 30 天入口打开', value: overview?.window.entry_resolved_count || 0 },
          { label: '近 30 天完成接入', value: overview?.window.entry_intake_count || 0 },
          { label: '近 30 天新建档案', value: overview?.window.new_testees || 0 },
          { label: '近 30 天建立照护关系', value: overview?.window.relation_assigned_count || 0 }
        ]
      },
      {
        title: '测评服务过程',
        items: [
          { label: '近 30 天形成测评', value: overview?.window.assessment_created_count || 0 },
          { label: '近 30 天产出报告', value: overview?.window.assessment_completed_count || 0 },
          { label: '累计测评数', value: overview?.snapshot.assessment_count || 0 }
        ]
      },
      {
        title: '资源现状',
        items: [
          { label: '当前活跃入口', value: overview?.snapshot.active_entry_count || 0 },
          { label: '临床人员总数', value: overview?.snapshot.clinician_count || 0 }
        ]
      }
    ]
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
            <Text type="secondary">统一查看资源供给、接入行为和测评服务过程。</Text>
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

        <Tabs>
          <TabPane tab="运营概览" key="overview">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Space direction="vertical" size={4}>
                  <Text strong>阅读顺序</Text>
                  <Text type="secondary">1. 先看资源基线，确认当前组织手上有多少受试者、临床人员和活跃入口。</Text>
                  <Text type="secondary">2. 再看窗口内的接入行为，判断最近这段时间是否真的有用户在打开入口、完成接入和建立照护关系。</Text>
                  <Text type="secondary">3. 最后看服务过程，确认这些接入是否进一步转成了测评和报告产出。</Text>
                </Space>
              </Card>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="受试者总数" value={overview?.snapshot.testee_count || 0} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="临床人员总数" value={overview?.snapshot.clinician_count || 0} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="活跃入口" value={overview?.snapshot.active_entry_count || 0} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="累计测评数" value={overview?.snapshot.assessment_count || 0} /></Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                {overviewSectionCards.map((section) => (
                  <Col xs={24} lg={8} key={section.title}>
                    <Card loading={loading} title={section.title}>
                      <Row gutter={[12, 12]}>
                        {section.items.map((item) => (
                          <Col span={section.items.length >= 4 ? 12 : 24} key={item.label}>
                            <Statistic title={item.label} value={item.value} />
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>

              <Card
                loading={loading}
                title={renderCardTitle('第一步：接入与服务趋势', '最近一段时间，接入动作和服务动作是在升温还是收缩？')}
              >
                {overviewTrendData.length ? (
                  <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer>
                      <LineChart data={overviewTrendData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="intakes" name="完成接入" stroke={CHART_COLORS[2]} strokeWidth={2} />
                        <Line type="monotone" dataKey="assignments" name="建立照护关系" stroke={CHART_COLORS[4]} strokeWidth={2} />
                        <Line type="monotone" dataKey="assessments" name="形成测评" stroke={CHART_COLORS[5]} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('暂无趋势数据')}
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('第二步：当前窗口关键指标', '把当前统计窗口拆开看，业务量主要集中在哪些环节？')}
              >
                {overviewMetricData.length ? (
                  <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer>
                      <BarChart data={overviewMetricData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={96} />
                        <Tooltip formatter={(value: number) => [value, '数量']} />
                        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                          {overviewMetricData.map((item) => (
                            <Cell key={item.name} fill={item.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : renderEmptyChart('当前窗口暂无统计数据')}
              </Card>
            </Space>
          </TabPane>
          <TabPane tab="临床人员统计" key="clinicians">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Space direction="vertical" size={4}>
                  <Text strong>阅读顺序</Text>
                  <Text type="secondary">1. 先看资源分布，知道服务资源目前主要握在哪些临床人员手里。</Text>
                  <Text type="secondary">2. 再看接入承接，判断最近谁真正接住了入口打开和完成接入。</Text>
                  <Text type="secondary">3. 最后看服务结果，确认谁把接入进一步转成了测评和报告。</Text>
                </Space>
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('第一步：临床人员资源分布', '当前服务资源主要分布在哪些临床人员手里？')}
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
                title={renderCardTitle('第二步：临床人员接入承接', '最近谁在承接更多入口打开、完成接入和建立照护关系？')}
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
                title={renderCardTitle('第三步：临床人员服务结果', '最近谁把接入进一步转成了测评和报告？')}
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
          <TabPane tab="入口接入与服务" key="entries">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Card size="small" style={{ background: '#fafafa' }}>
                <Space direction="vertical" size={4}>
                  <Text strong>阅读顺序</Text>
                  <Text type="secondary">1. 先看入口资源现状，确认当前有多少入口处于启用状态，以及它们主要指向什么目标类型。</Text>
                  <Text type="secondary">2. 再看窗口内接入效果，判断哪些入口最近真正被打开、完成接入并建立了照护关系。</Text>
                  <Text type="secondary">3. 最后看服务承接，确认这些入口有没有继续带来测评服务。</Text>
                </Space>
              </Card>

              <Card
                loading={loading}
                title={renderCardTitle('第一步：入口资源现状', '当前有哪些入口在运行，它们主要指向什么目标类型？')}
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
                title={renderCardTitle('第二步：入口接入效果', '最近哪些入口真正被打开，并继续转成了完成接入和建立照护关系？')}
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
                  '第三步：入口服务承接',
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
        </Tabs>
      </Space>
    </div>
  )
}

export default StatisticsCenterPage
