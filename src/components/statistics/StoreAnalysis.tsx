import React, { useState } from 'react'
import { Alert, Button, Card, Col, Empty, Input, Row, Select, Space, Statistic, Table, Tabs, Typography } from 'antd'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts'
import type { AnalysisMetadata, AnalysisOverview, AnalysisClinician, AnalysisEntry, AnalysisQuery } from '@/api/path/statisticsAnalysis'
import { getAnalysisOverview, getAnalysisClinicians, getAnalysisEntries, mergeAnalysisTrend } from '@/api/path/statisticsAnalysis'
import { useAnalysisQuery } from './useAnalysisQuery'
import PlanActivityMetricsPanel from './PlanActivityMetricsPanel'
import PlanFulfillmentMetricsPanel from './PlanFulfillmentMetricsPanel'

type Topic = 'overview' | 'clinicians' | 'plans' | 'history'
const colors = ['#1677ff', '#00b578', '#faad14', '#722ed1']
function Metrics({ values }: { values: Array<[string, number]> }) {
  return <Row gutter={[16, 16]}>{values.map(([title, value]) => <Col xs={24} sm={12} lg={6} key={title}>
    <Card className="operations-surface">
      <Statistic title={title} value={value} />
    </Card>
  </Col>)}</Row>
}
function Freshness({ value }: { value: AnalysisMetadata }) {
  return <Typography.Paragraph type="secondary">
    当前归属读取于 {value.current_ownership_read_at}；历史事件数据截至 {value.data_through}；发布版本 {value.published_version}。
    所选期间按上海自然日统计，结束日期不包含在内。
  </Typography.Paragraph>
}
function Trend({ title, series }: { title: string; series: Array<{ key: string; name: string; points: Array<{ date: string; count: number }> }> }) {
  const data = mergeAnalysisTrend(series)
  return <Card className="operations-surface" title={title}>{data.length ? <div style={{ height: 270 }}>
    <ResponsiveContainer>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />{series.map((s, i) => <Line key={s.key} dataKey={s.key} name={s.name} stroke={colors[i % colors.length]} dot={false} />)}
      </LineChart>
    </ResponsiveContainer>
  </div> : <Empty description="当前期间暂无事件" />}</Card>
}
function ServiceOverview({ value }: { value: AnalysisOverview }) {
  const org = value.organization_overview, access = value.access_funnel, service = value.assessment_service
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Metrics values={[['当前服务人数', org.testee_count],
      ['当前门店医生', org.clinician_count],
      ['当前活跃入口', org.active_entry_count],
      ['已使用内容', org.content_count]]} />
    <Metrics values={[['累计答卷提交', org.answer_sheet_submission_count],
      ['累计形成测评', org.assessment_count],
      ['累计产出报告', org.report_count],
      ['期间提交答卷', service.window.answersheet_submitted_count]]} />
    <Card className="operations-surface" title="接入事件概况">
      <Metrics values={[['入口打开', access.window.entry_opened_count],
        ['完成接入', access.window.intake_confirmed_count],
        ['新建档案', access.window.testee_created_count],
        ['建立照护', access.window.care_relationship_established_count]]} />
      <Typography.Paragraph type="secondary">入口打开可能尚未识别受试者，按入口关联医生的当前门店过滤；各阶段不是严格同一批人员，不计算转化率。</Typography.Paragraph>
    </Card>
    <Trend title="接入事件趋势" series={[
      { key: 'opened', name: '入口打开', points: access.trend.entry_opened },
      { key: 'intake', name: '完成接入', points: access.trend.intake_confirmed },
      { key: 'created', name: '新建档案', points: access.trend.testee_created },
      { key: 'care', name: '建立照护', points: access.trend.care_relationship_established }
    ]} />
    <Metrics values={[['期间提交', service.window.answersheet_submitted_count],
      ['期间形成测评', service.window.assessment_created_count],
      ['期间产出报告', service.window.report_generated_count],
      ['期间测评失败事件', service.window.assessment_failed_count]]} />
    <Trend title="测评服务趋势" series={[
      { key: 'submitted', name: '提交答卷', points: service.trend.answersheet_submitted },
      { key: 'assessed', name: '形成测评', points: service.trend.assessment_created },
      { key: 'reported', name: '产出报告', points: service.trend.report_generated },
      { key: 'failed', name: '测评失败事件', points: service.trend.assessment_failed }
    ]} />
    <Freshness value={value} />
  </Space>
}
function Plans({ value }: { value: AnalysisOverview }) {
  const { activity, fulfillment } = value.plan
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Metrics values={[['任务发放', activity.window.task_created_count],
      ['事件完成', activity.window.task_completed_count],
      ['履约应完成', fulfillment.window.due_task_count],
      ['履约已完成', fulfillment.window.completed_task_count]]} />
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="计划执行动作">
          <PlanActivityMetricsPanel activity={activity} showNote />
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="计划履约">
          <PlanFulfillmentMetricsPanel fulfillment={fulfillment} showNote />
        </Card>
      </Col>
    </Row>
    <Trend title="计划执行动作趋势" series={[
      { key: 'created', name: '任务发放', points: activity.trend.task_created },
      { key: 'opened', name: '任务打开', points: activity.trend.task_opened },
      { key: 'completed', name: '任务完成', points: activity.trend.task_completed },
      { key: 'expired', name: '任务过期', points: activity.trend.task_expired }
    ]} />
    <Trend title="计划履约趋势" series={[
      { key: 'planned', name: '计划任务', points: fulfillment.trend.planned },
      { key: 'due', name: '应完成', points: fulfillment.trend.due },
      { key: 'completed', name: '已完成', points: fulfillment.trend.completed },
      { key: 'overdue', name: '逾期', points: fulfillment.trend.overdue }
    ]} />
    <Typography.Paragraph type="secondary">任务事件与履约按各自口径统计。查看计划统计不授予计划管理、重试或专业结果读取权限。</Typography.Paragraph>
    <Freshness value={value} />
  </Space>
}
function Status({ loading, error, retry }: { loading: boolean; error?: string; retry: () => void }) {
  if (loading) return <Card loading aria-label="正在加载专题统计" />
  return error ? <Alert type="warning" showIcon message="专题统计暂不可用" description={error}
    action={<Button onClick={retry}>重试</Button>} /> : null
}
const clinicianColumns = [
  { title: '临床人员', dataIndex: 'name', key: 'name' },
  { title: '科室', dataIndex: 'department', key: 'department' },
  { title: '活跃入口', dataIndex: 'active_entry_count', key: 'entry' },
  { title: '期间接入', dataIndex: 'intake_confirmed_count', key: 'intake' },
  { title: '期间形成测评', dataIndex: 'assessment_created_count', key: 'assessment' },
  { title: '期间产出报告', dataIndex: 'report_generated_count', key: 'report' },
  { title: '主责受试者', dataIndex: 'primary_testee_count', key: 'primary' },
  { title: '跟进受试者', dataIndex: 'attending_testee_count', key: 'attending' },
  { title: '协作受试者', dataIndex: 'collaborator_testee_count', key: 'collaborator' }
]
const entryColumns = [
  { title: '入口 ID', dataIndex: 'id', key: 'id' },
  { title: '临床人员', dataIndex: 'clinician_name', key: 'clinician' },
  { title: '内容标识', dataIndex: 'target_code', key: 'code' },
  { title: '状态', dataIndex: 'is_active', key: 'active', render: (v: boolean) => v ? '启用' : '停用' },
  { title: '期间打开', dataIndex: 'entry_opened_count', key: 'opened' },
  { title: '期间接入', dataIndex: 'intake_confirmed_count', key: 'intake' },
  { title: '期间形成测评', dataIndex: 'assessment_created_count', key: 'assessment' },
  { title: '期间产出报告', dataIndex: 'report_generated_count', key: 'report' }
]
export default function StoreAnalysis({ identity, query, revision, history }: {
  identity: string; query: AnalysisQuery; revision: number; history: React.ReactNode
}): React.ReactElement {
  const [topic, setTopic] = useState<Topic>('overview')
  const filterKey = JSON.stringify([identity, query])
  const [doctorPaging, setDoctorPaging] = useState({ key: filterKey, page: 1, size: 20 })
  const [entryPaging, setEntryPaging] = useState({ key: filterKey, page: 1, size: 20 })
  const [entryFilter, setEntryFilter] = useState<{ key: string; clinician?: string; active?: boolean }>({ key: filterKey })
  const [filterError, setFilterError] = useState('')
  const dp = doctorPaging.key === filterKey ? doctorPaging : { page: 1, size: 20 }
  const ep = entryPaging.key === filterKey ? entryPaging : { page: 1, size: 20 }
  const ef: { clinician?: string; active?: boolean } = entryFilter.key === filterKey ? entryFilter : {}
  const [overviewRefresh, setOverviewRefresh] = useState(0)
  const [clinicianRefresh, setClinicianRefresh] = useState(0)
  const [entryRefresh, setEntryRefresh] = useState(0)
  const overview = useAnalysisQuery(topic === 'overview' || topic === 'plans', identity, query, revision + overviewRefresh, getAnalysisOverview)
  const clinicians = useAnalysisQuery(topic === 'clinicians',
    identity,
    { ...query,
      page: dp.page,
      page_size: dp.size },
    revision + clinicianRefresh,
    getAnalysisClinicians)
  const entries = useAnalysisQuery(topic === 'clinicians', identity, { ...query, page: ep.page, page_size: ep.size,
    ...(ef.clinician ? { clinician_id: ef.clinician } : {}),
    ...(ef.active === undefined ? {} : { is_active: ef.active }) },
  revision + entryRefresh,
  getAnalysisEntries)
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    <Tabs activeKey={topic} onChange={v => setTopic(v as Topic)}>
      <Tabs.TabPane tab="服务概览" key="overview" />
      <Tabs.TabPane tab="临床人员" key="clinicians" />
      <Tabs.TabPane tab="计划执行" key="plans" />
      <Tabs.TabPane tab="历史开展" key="history" />
    </Tabs>
    {topic !== 'history' && <Alert type="info" showIcon message="按当前服务归属统计"
      description="受试者转店后，其历史服务与计划情况随当前归属展示。人工初配也会改变本视图，不代表历史测评由该店开展。" />}
    {(topic === 'overview' || topic === 'plans') && <>
      <Status {...overview} retry={() => setOverviewRefresh(v => v + 1)} />
      {overview.data && (topic === 'plans' ? <Plans value={overview.data} /> : <ServiceOverview value={overview.data} />)}
    </>}
    {topic === 'clinicians' && <>
      <Typography.Paragraph type="secondary">仅列当前关联门店的医生；医生调店后不再列入原店。服务事件同时按受试者当前归属过滤，医生行合计不一定等于门店全部服务量，关系人数也不能直接相加。</Typography.Paragraph>
      <Status {...clinicians} retry={() => setClinicianRefresh(v => v + 1)} />
      {clinicians.data && <>
        <Metrics values={[['范围内医生', clinicians.data.summary.clinician_count],
          ['启用医生', clinicians.data.summary.active_clinician_count],
          ['期间有接入医生', clinicians.data.summary.clinicians_with_intake],
          ['全范围医生接入事件', clinicians.data.summary.intake_confirmed_count]]} />
        <Card title="临床人员接入情况（当前页）">{clinicians.data.items.length ? <div style={{ height: 270 }}>
          <ResponsiveContainer>
            <BarChart data={clinicians.data.items}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="intake_confirmed_count" name="期间接入" fill={colors[0]} />
              <Bar dataKey="report_generated_count" name="期间产出报告" fill={colors[1]} />
            </BarChart>
          </ResponsiveContainer>
        </div> : <Empty description="当前门店暂无医生" />}</Card>
        <Card title="临床人员明细">
          <Table<AnalysisClinician> rowKey="id" columns={clinicianColumns} dataSource={clinicians.data.items} scroll={{ x: 1100 }}
            pagination={{ current: dp.page, pageSize: dp.size, total: clinicians.data.total, showSizeChanger: true,
              onChange: (page, size) => setDoctorPaging({ key: filterKey, page, size: size || 20 }) }} />
        </Card>
        <Freshness value={clinicians.data} />
      </>}
      <Card title="测评入口统计">
        <Space wrap style={{ marginBottom: 16 }}>
          <Input.Search key={filterKey} placeholder="按医生 ID 筛选入口" allowClear onSearch={raw => {
            const id = raw.trim()
            if (id && !/^[1-9][0-9]*$/.test(id)) { setFilterError('请输入有效的医生 ID'); return }
            setFilterError(''); setEntryFilter({ ...ef,
              key: filterKey,
              clinician: id || undefined }); setEntryPaging({ key: filterKey,
              page: 1,
              size: ep.size })
          }} />
          <Select aria-label="入口状态" value={ef.active === undefined ? undefined : String(ef.active)} allowClear
            placeholder="全部状态" style={{ width: 140 }}
            options={[{ value: 'true', label: '启用' },
              { value: 'false', label: '停用' }]} onChange={active => {
              setEntryFilter({ ...ef,
                key: filterKey,
                active: active === undefined ? undefined : active === 'true' }); setEntryPaging({ key: filterKey,
                page: 1,
                size: ep.size })
            }} />
        </Space>
        {filterError && <Alert type="warning" message={filterError} />}
        <Status {...entries} retry={() => setEntryRefresh(v => v + 1)} />
        {entries.data && <>
          <Table<AnalysisEntry> rowKey="id" columns={entryColumns} dataSource={entries.data.items} scroll={{ x: 1000 }}
            pagination={{ current: ep.page, pageSize: ep.size, total: entries.data.total, showSizeChanger: true,
              onChange: (page, size) => setEntryPaging({ key: filterKey, page, size: size || 20 }) }} />
          <Freshness value={entries.data} />
        </>}
      </Card>
    </>}
    {topic === 'history' && <>
      <Alert type="info" showIcon message="按开始作答时门店统计" description="历史开展量不会因后续转店或人工初配变化；未采集开始门店的历史保持未知。" />{history}</>}
  </Space>
}
