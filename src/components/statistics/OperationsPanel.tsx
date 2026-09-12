import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Typography, Skeleton, Tag } from 'antd'
import { observer } from 'mobx-react-lite'
import moment from 'moment'
import { Link } from 'react-router-dom'
import { Area, ComposedChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { rootStore } from '@/store'
import { getOperationsOverview, getOperationsStores } from '@/api/path/statistics'
import type { IOperationsOverview, IOperationsStore } from '@/api/path/statistics'
import { extractErrorMessage } from '@/utils/apiError'
import { TeamOutlined, FileTextOutlined, CheckCircleOutlined, LineChartOutlined, ShopOutlined, ReloadOutlined } from '@ant-design/icons'
import './OperationsPanel.scss'

export const OPERATIONS_RESOURCE = 'qs:statistics:collection:operations'
const OperationsPanel: React.FC<{ compact?: boolean }> = observer(({ compact = false }) => {
  const { userStore } = rootStore
  const allowed = userStore.hasPermission(OPERATIONS_RESOURCE, 'read')
  const profile = userStore.currentUser
  const authorization = JSON.stringify(profile?.permissions || [])
  const [range, setRange] = useState<[string, string] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [options, setOptions] = useState<IOperationsStore[]>([])
  const [allCompany, setAllCompany] = useState(false)
  const [data, setData] = useState<IOperationsOverview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let cancelled = false
    setData(null); setError(''); setOptions([])
    if (!allowed) return
    setLoading(true)
    const dates = range ? { from: range[0], to: range[1] } : {}
    Promise.all([
      getOperationsOverview({ ...dates, ...(selected.length ? { store_ids: selected.join(',') } : {}) }),
      compact ? Promise.resolve<[null, undefined]>([null, undefined]) : getOperationsStores(dates)
    ]).then(([[err, response], [listErr, stores]]) => {
      if (cancelled) return
      if (err || listErr || !response?.data || (!compact && !stores?.data)) throw err || listErr || new Error('运营统计暂未发布')
      setData(response.data); setOptions(stores?.data?.stores || [])
      setAllCompany((stores?.data?.scope || response.data.scope) === 'all_stores')
    }).catch(err => { if (!cancelled) setError(extractErrorMessage(err, '运营统计暂不可用，请稍后重试')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [allowed, authorization, profile, range, selected, revision, compact])
  if (!allowed) return null
  const scopeLabel = data?.scope === 'all_stores' ? '公司全部门店' : data?.stores.length === 1 ? data.stores[0].name : '授权门店汇总'
  const metrics = data ? [
    { title: '当前服务人数', value: data.current_service_count, note: '按当前服务门店归属', icon: <TeamOutlined />, tone: 'blue' },
    { title: '答卷提交数', value: data.submissions, note: '按提交时间 · 包含独立问卷', icon: <FileTextOutlined />, tone: 'violet' },
    { title: '完成测评数', value: data.completions, note: '首次评估成功 · 重试不重复计数', icon: <CheckCircleOutlined />, tone: 'green' }
  ] : []
  return <section className={`operations-panel ${compact ? 'operations-panel--compact' : ''}`} aria-label="运营统计">
    <div className="operations-toolbar">
      <div>
        <Typography.Title level={4}>{compact ? '本月运营概况' : '门店运营统计'}</Typography.Title>
        <Typography.Text type="secondary">{data ? scopeLabel : '按授权范围加载'} · 上海自然日</Typography.Text>
      </div>
      <Space wrap>
        {compact && <Link to="/statistics/center">查看完整统计 →</Link>}
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => setRevision(v => v + 1)}>刷新</Button>
      </Space>
    </div>
    {!compact && <div className="operations-filters">
      <Space wrap>
        <DatePicker.RangePicker aria-label="统计日期范围" placeholder={['本月开始', '截至昨日']}
          onChange={values => setRange(values?.[0] && values?.[1]
            ? [values[0].format('YYYY-MM-DD'), values[1].clone().add(1, 'day').format('YYYY-MM-DD')] : null)} />
        <Select mode="multiple" aria-label="选择门店" className="operations-store-select" value={selected} allowClear
          placeholder={allCompany ? '公司全部门店（含未知归属）' : '全部授权门店'} onChange={setSelected}
          options={options.map(store => ({ value: store.id, label: `${store.name} · ${store.code}${store.is_active ? '' : '（已停用）'}` }))} />
      </Space>
      <Typography.Text type="secondary">默认本月，可选择日期和门店</Typography.Text>
    </div>}
    {loading && <Card className="operations-surface"><Skeleton active paragraph={{ rows: compact ? 3 : 5 }} /></Card>}
    {error && <Alert type="warning" showIcon message="运营统计暂不可用" description={error} />}
    {data && <>
      <Row gutter={[16, 16]} className="operations-metrics">
        {metrics.map(metric => <Col xs={24} sm={8} key={metric.title}>
          <Card className={`operations-metric operations-metric--${metric.tone}`}>
            <span className="operations-metric__icon">{metric.icon}</span>
            <Statistic title={metric.title} value={metric.value} />
            <span className="operations-metric__note">{metric.note}</span>
          </Card>
        </Col>)}
      </Row>
      <div className="operations-chart-grid">
        <Card className="operations-surface operations-trend" title={<Space><LineChartOutlined />开展量趋势</Space>}
          extra={<Tag color="blue">{data.from} — {data.workload_through}</Tag>}>
          <Typography.Paragraph type="secondary">按开始作答时的门店计量，转店不改写历史开展量。</Typography.Paragraph>
          <ResponsiveContainer width="100%" height={compact ? 240 : 290}>
            <ComposedChart data={data.daily} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <defs><linearGradient id={compact ? 'home-activity-fill' : 'center-activity-fill'} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient></defs>
              <CartesianGrid vertical={false} stroke="#edf2f8" />
              <XAxis dataKey="date" tickFormatter={date => moment(date).format('MM/DD')} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Legend iconType="circle" />
              <Area type="monotone" dataKey="submissions" name="答卷提交数" stroke="#3b82f6" strokeWidth={2}
                fill={`url(#${compact ? 'home-activity-fill' : 'center-activity-fill'})`} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="completions" name="完成测评数" stroke="#20b99a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        {!compact && <Card className="operations-surface operations-reading" title="数据说明">
          <div className="operations-reading__item"><span className="operations-reading__dot" />
            <div><strong>当前服务归属</strong><p>服务人数随转店更新，与历史开展量分别统计。</p></div>
          </div>
          <div className="operations-reading__item"><span className="operations-reading__dot operations-reading__dot--green" />
            <div><strong>历史开展工作量</strong><p>答卷按提交时间、测评按首次成功时间统计。独立问卷只计提交。</p></div>
          </div>
          <div className="operations-reading__item"><span className="operations-reading__dot operations-reading__dot--violet" />
            <div><strong>完整日发布</strong><p>重试、重复消费和报告重建不重复计量；未发布数据不显示为零。</p></div>
          </div>
        </Card>}
      </div>
      {data.unknown && <Alert className="operations-unknown" type="info" showIcon
        message={`未知开展门店：提交 ${data.unknown.submissions.toLocaleString()}，完成 ${data.unknown.completions.toLocaleString()}`}
        description="历史记录和旧客户端未采集开始门店；开始时未配店也保留未知。不会根据当前归属回填。" />}
      {!compact && <Card className="operations-surface operations-stores" title={<Space><ShopOutlined />门店对比</Space>}
        extra={<Typography.Text type="secondary">{data.stores.length} 家门店 · 按授权范围</Typography.Text>}>
        <Table<IOperationsStore> rowKey="id" dataSource={data.stores} size="middle"
          scroll={{ x: 720 }} pagination={{ pageSize: 10, hideOnSinglePage: true }} columns={[
            { title: '门店', dataIndex: 'name', render: function StoreName(name, store) {
              return <div className="operations-store-name"><strong>{name}</strong><span>{store.code}</span></div>
            } },
            { title: '状态', dataIndex: 'is_active', render: function StoreState(value) {
              return <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>
            } },
            { title: '当前服务人数', dataIndex: 'current_service_count', align: 'right', render: value => value.toLocaleString(),
              sorter: (a, b) => a.current_service_count - b.current_service_count },
            { title: '答卷提交数', dataIndex: 'submissions', align: 'right', render: value => value.toLocaleString(),
              sorter: (a, b) => a.submissions - b.submissions },
            { title: '完成测评数', dataIndex: 'completions', align: 'right', render: value => value.toLocaleString(),
              sorter: (a, b) => a.completions - b.completions }
          ]} />
      </Card>}
      <div className="operations-freshness">
        <span>开展数据截止 {data.workload_through} · 发布于 {moment(data.published_at).utcOffset(8).format('YYYY-MM-DD HH:mm')}</span>
        <span>服务人数读取于 {moment(data.current_population_read_at).utcOffset(8).format('YYYY-MM-DD HH:mm')}</span>
      </div>
    </>}
  </section>
})
export default OperationsPanel
