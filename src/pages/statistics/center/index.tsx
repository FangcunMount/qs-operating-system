import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Col, DatePicker, Empty, Row, Select, Space, Statistic, Table, Tabs, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
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
      { title: '入口数', dataIndex: ['snapshot', 'active_entry_count'], key: 'entries', width: 100 },
      { title: '窗口 Intake', dataIndex: ['window', 'intake_count'], key: 'intake', width: 120 },
      { title: '窗口 分配', dataIndex: ['window', 'assigned_count'], key: 'assigned', width: 120 },
      { title: '窗口 完成测评', dataIndex: ['window', 'completed_assessment_count'], key: 'completed_assessment_count', width: 140 }
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
      { title: '累计 Resolve', dataIndex: ['snapshot', 'resolve_count'], key: 'resolve_count', width: 120 },
      { title: '累计 Intake', dataIndex: ['snapshot', 'intake_count'], key: 'intake_count', width: 120 },
      { title: '累计 Assigned', dataIndex: ['snapshot', 'assigned_count'], key: 'assigned_count', width: 120 },
      { title: '累计 Assessment', dataIndex: ['snapshot', 'assessment_count'], key: 'assessment_count', width: 130 }
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
      { name: '新增受试者', value: overview.window.new_testees, fill: CHART_COLORS[0] },
      { name: '入口创建', value: overview.window.entry_created_count, fill: CHART_COLORS[1] },
      { name: '入口解析', value: overview.window.entry_resolved_count, fill: CHART_COLORS[2] },
      { name: '入口 Intake', value: overview.window.entry_intake_count, fill: CHART_COLORS[3] },
      { name: '建立分配', value: overview.window.relation_assigned_count, fill: CHART_COLORS[4] },
      { name: '创建测评', value: overview.window.assessment_created_count, fill: CHART_COLORS[5] },
      { name: '完成测评', value: overview.window.assessment_completed_count, fill: CHART_COLORS[6] }
    ]
  }, [overview])

  const overviewFunnelData = useMemo(() => {
    const filtered = overviewWindowData.filter((item) => item.value > 0)
    const baseline = filtered[0]?.value || 0

    return filtered.map((item, index) => ({
      ...item,
      rateLabel: baseline > 0
        ? `${((item.value / baseline) * 100).toFixed(index === 0 ? 0 : 1)}%`
        : '0%'
    }))
  }, [overviewWindowData])

  const clinicianLoadData = useMemo(() => {
    return [...clinicians]
      .sort((a, b) => b.snapshot.total_accessible_testees - a.snapshot.total_accessible_testees)
      .slice(0, 8)
      .map((item) => ({
        name: item.clinician.name,
        total: item.snapshot.total_accessible_testees,
        primary: item.snapshot.primary_testee_count,
        activeEntries: item.snapshot.active_entry_count,
        completed: item.window.completed_assessment_count
      }))
  }, [clinicians])

  const clinicianFunnelData = useMemo(() => {
    return [...clinicians]
      .sort((a, b) => b.funnel.assessment_count - a.funnel.assessment_count)
      .slice(0, 8)
      .map((item) => ({
        name: item.clinician.name,
        created: item.funnel.created_count,
        resolved: item.funnel.resolved_count,
        intake: item.funnel.intake_count,
        assigned: item.funnel.assigned_count,
        assessment: item.funnel.assessment_count
      }))
  }, [clinicians])

  const entryConversionData = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.snapshot.assessment_count - a.snapshot.assessment_count)
      .slice(0, 8)
      .map((item) => ({
        name: formatShortEntry(item),
        resolve: item.snapshot.resolve_count,
        intake: item.snapshot.intake_count,
        assigned: item.snapshot.assigned_count,
        assessment: item.snapshot.assessment_count
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
            <Text type="secondary">统一查看机构概览、临床人员负载和入口转化。</Text>
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
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="受试者总数" value={overview?.snapshot.testee_count || 0} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="临床人员总数" value={overview?.snapshot.clinician_count || 0} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="Active 入口" value={overview?.snapshot.active_entry_count || 0} /></Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card loading={loading}><Statistic title="累计测评数" value={overview?.snapshot.assessment_count || 0} /></Card>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} lg={15}>
                  <Card loading={loading} title="趋势总览">
                    {overviewTrendData.length ? (
                      <div style={{ width: '100%', height: 340 }}>
                        <ResponsiveContainer>
                          <LineChart data={overviewTrendData} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="assessments" name="测评" stroke={CHART_COLORS[0]} strokeWidth={2} />
                            <Line type="monotone" dataKey="intakes" name="Intake" stroke={CHART_COLORS[2]} strokeWidth={2} />
                            <Line type="monotone" dataKey="assignments" name="Assigned" stroke={CHART_COLORS[4]} strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无趋势数据')}
                  </Card>
                </Col>
                <Col xs={24} lg={9}>
                  <Card loading={loading} title="窗口转化">
                    {overviewFunnelData.length ? (
                      <div style={{ width: '100%', height: 340 }}>
                        <ResponsiveContainer>
                          <FunnelChart>
                            <Tooltip formatter={(value: number) => [value, '数量']} />
                            <Funnel
                              data={overviewFunnelData}
                              dataKey="value"
                              nameKey="name"
                              isAnimationActive={false}
                            >
                              <LabelList
                                dataKey="name"
                                position="right"
                                stroke="none"
                                fill="#595959"
                              />
                              <LabelList
                                dataKey="rateLabel"
                                position="left"
                                stroke="none"
                                fill="#8c8c8c"
                              />
                              {overviewFunnelData.map((item) => (
                                <Cell key={item.name} fill={item.fill} />
                              ))}
                            </Funnel>
                          </FunnelChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('当前窗口暂无转化数据')}
                  </Card>
                </Col>
              </Row>
            </Space>
          </TabPane>
          <TabPane tab="临床人员统计" key="clinicians">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Card loading={loading} title="临床人员负载">
                    {clinicianLoadData.length ? (
                      <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                          <BarChart data={clinicianLoadData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="total" name="可访问受试者" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                            <Bar dataKey="primary" name="主责受试者" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                            <Bar dataKey="completed" name="窗口完成测评" fill={CHART_COLORS[4]} radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无临床人员统计')}
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card loading={loading} title="临床人员漏斗对比">
                    {clinicianFunnelData.length ? (
                      <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                          <BarChart data={clinicianFunnelData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={70} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="created" name="创建入口" fill={CHART_COLORS[0]} />
                            <Bar dataKey="resolved" name="Resolve" fill={CHART_COLORS[1]} />
                            <Bar dataKey="intake" name="Intake" fill={CHART_COLORS[2]} />
                            <Bar dataKey="assigned" name="Assigned" fill={CHART_COLORS[3]} />
                            <Bar dataKey="assessment" name="Assessment" fill={CHART_COLORS[4]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无漏斗数据')}
                  </Card>
                </Col>
              </Row>

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
          <TabPane tab="入口转化" key="entries">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={15}>
                  <Card loading={loading} title="入口转化对比">
                    {entryConversionData.length ? (
                      <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                          <BarChart data={entryConversionData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" interval={0} angle={-18} textAnchor="end" height={80} />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="resolve" name="Resolve" fill={CHART_COLORS[0]} />
                            <Bar dataKey="intake" name="Intake" fill={CHART_COLORS[2]} />
                            <Bar dataKey="assigned" name="Assigned" fill={CHART_COLORS[3]} />
                            <Bar dataKey="assessment" name="Assessment" fill={CHART_COLORS[4]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : renderEmptyChart('暂无入口转化数据')}
                  </Card>
                </Col>
                <Col xs={24} lg={9}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Card loading={loading} title="入口状态分布">
                      {entryStatusData.length ? (
                        <div style={{ width: '100%', height: 170 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={entryStatusData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
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
                    </Card>

                    <Card loading={loading} title="目标类型分布">
                      {entryTargetTypeData.length ? (
                        <div style={{ width: '100%', height: 170 }}>
                          <ResponsiveContainer>
                            <PieChart>
                              <Pie data={entryTargetTypeData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={62} paddingAngle={3}>
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
                    </Card>
                  </Space>
                </Col>
              </Row>

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
