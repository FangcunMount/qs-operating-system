import { useState } from 'react'
import { Alert, Button, Card, Col, Empty, Input, Row, Space, Statistic, Table, Tag, Typography } from 'antd'
import { CheckCircleOutlined, FileTextOutlined, LineChartOutlined, SearchOutlined, ShopOutlined, TeamOutlined } from '@ant-design/icons'
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import moment from 'moment'
import type { IOperationsOverview, IOperationsStore } from '@/api/path/statistics'

export function OperationsMetrics({ data }: { data: IOperationsOverview }): JSX.Element {
  const metrics = [
    { title: '当前服务人数', value: data.current_service_count, note: '当前归属 · 不随所选日期变化', icon: <TeamOutlined />, tone: 'blue' },
    { title: '答卷提交数', value: data.submissions, note: '所选期间 · 包含独立问卷', icon: <FileTextOutlined />, tone: 'violet' },
    { title: '完成测评数', value: data.completions, note: '所选期间 · 每次测评首次成功', icon: <CheckCircleOutlined />, tone: 'green' }
  ]
  return <Row gutter={[16, 16]} className="operations-metrics">
    {metrics.map(metric => <Col xs={24} sm={8} key={metric.title}>
      <Card className={`operations-metric operations-metric--${metric.tone}`}>
        <span className="operations-metric__icon">{metric.icon}</span>
        <Statistic title={metric.title} value={metric.value} />
        <span className="operations-metric__note">{metric.note}</span>
      </Card>
    </Col>)}
  </Row>
}

export function OperationsTrend({ data, compact = false }: { data: IOperationsOverview; compact?: boolean }): JSX.Element {
  return <Card className="operations-surface operations-trend" title={<Space><LineChartOutlined />开展量趋势</Space>}
    extra={<Tag color="blue">{data.from} — {data.workload_through}</Tag>}>
    <Typography.Paragraph type="secondary">提交按提交日、完成按首次成功日计数；开展门店在开始作答时确定。</Typography.Paragraph>
    {data.daily.length ? <ResponsiveContainer width="100%" height={compact ? 240 : 300}>
      <ComposedChart data={data.daily} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <defs><linearGradient id={compact ? 'home-activity-fill' : 'center-activity-fill'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.22} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#edf2f8" />
        <XAxis dataKey="date" tickFormatter={date => moment(date).format('MM/DD')} axisLine={false} tickLine={false} minTickGap={30} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip /><Legend iconType="circle" />
        <Area type="linear" dataKey="submissions" name="答卷提交数" stroke="#3b82f6" strokeWidth={2}
          fill={`url(#${compact ? 'home-activity-fill' : 'center-activity-fill'})`} activeDot={{ r: 5 }} />
        <Line type="linear" dataKey="completions" name="完成测评数" stroke="#20b99a" strokeWidth={2} strokeDasharray="5 4" dot={false} />
      </ComposedChart>
    </ResponsiveContainer> : <Empty className="operations-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前已发布区间暂无趋势数据" />}
  </Card>
}

export function OperationsUnknown({ data }: { data: IOperationsOverview }): JSX.Element | null {
  if (data.scope !== 'all_stores' || !data.unknown) return null
  return <Alert className="operations-unknown" type="info" showIcon
    message={`未知开展门店：提交 ${data.unknown.submissions.toLocaleString()}，完成 ${data.unknown.completions.toLocaleString()}`}
    description="这些记录计入公司汇总，无法分配到具体门店；门店合计加未知开展量等于公司开展量。历史归属不会按当前门店回填。" />
}

export function OperationsStores({ data, preview = false, onSelect, onExpand }: {
  data: IOperationsOverview; preview?: boolean; onSelect: (id: string) => void; onExpand: () => void
}): JSX.Element {
  const [search, setSearch] = useState('')
  const matching = data.stores.filter(store => `${store.name} ${store.code}`.toLowerCase().includes(search.trim().toLowerCase()))
  const rows = preview ? data.stores.slice(0, 5) : matching
  return <Card className="operations-surface operations-stores" title={<Space><ShopOutlined />{preview ? '门店概览' : '门店对比'}</Space>}
    extra={preview ? <Button type="link" onClick={onExpand}>查看门店分析 →</Button> : <Typography.Text type="secondary">
      所选范围 {data.stores.length} 家门店
    </Typography.Text>}>
    {!preview && <div className="operations-table-toolbar">
      <Input prefix={<SearchOutlined />} placeholder="搜索门店名称或编号" aria-label="搜索门店" allowClear value={search}
        onChange={event => setSearch(event.target.value)} />
      <Typography.Text type="secondary">搜索仅筛选下表；启用与停用门店均保留历史开展量。</Typography.Text>
    </div>}
    <Table<IOperationsStore> rowKey="id" dataSource={rows} size="middle" scroll={{ x: 760 }}
      locale={{ emptyText: search ? '没有匹配的门店' : '当前范围暂无门店' }}
      pagination={preview ? false : { pageSize: 10, hideOnSinglePage: true }} columns={[
        { title: '门店', dataIndex: 'name', render: function StoreName(name, store) {
          return <div className="operations-store-name"><strong>{name}</strong><span>{store.code}</span></div>
        } },
        { title: '状态', dataIndex: 'is_active', render: function StoreState(value) {
          return <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>
        } },
        { title: '当前服务人数', dataIndex: 'current_service_count', align: 'right', render: value => value.toLocaleString(),
          sorter: preview ? undefined : (a, b) => a.current_service_count - b.current_service_count },
        { title: '答卷提交数', dataIndex: 'submissions', align: 'right', render: value => value.toLocaleString(),
          sorter: preview ? undefined : (a, b) => a.submissions - b.submissions },
        { title: '完成测评数', dataIndex: 'completions', align: 'right', render: value => value.toLocaleString(),
          sorter: preview ? undefined : (a, b) => a.completions - b.completions },
        { title: '分析', key: 'analysis', render: function StoreAction(_, store) {
          return <Button type="link" aria-label={`查看${store.name}趋势`} onClick={() => onSelect(store.id)}>查看趋势</Button>
        } }
      ]} />
    {preview && data.stores.length > 5 && <Typography.Text type="secondary">按门店编号展示前 5 家，不代表排名。</Typography.Text>}
  </Card>
}

export function OperationsFreshness({ data }: { data: IOperationsOverview }): JSX.Element {
  return <div className="operations-freshness">
    <span>开展数据截止 {data.workload_through} · 发布于 {moment(data.published_at).utcOffset(8).format('YYYY-MM-DD HH:mm')}</span>
    <span>服务人数读取于 {moment(data.current_population_read_at).utcOffset(8).format('YYYY-MM-DD HH:mm')}</span>
  </div>
}

const reasons: Record<string, string> = {
  legacy_start_not_captured: '历史记录或旧客户端未记录开始门店', unassigned_at_start: '开始作答时未配置服务门店'
}
export function OperationsGuide({ data }: { data?: IOperationsOverview }): JSX.Element {
  return <Space direction="vertical" size={20} style={{ width: '100%' }}>
    <Card className="operations-surface" title="三个指标，分别回答三个问题">
      <div className="operations-definitions">
        <div><Tag color="blue">当前服务人数</Tag><h4>现在为多少人提供服务？</h4>
          <p>统计所选门店当前归属的受试者。转店后人数交接；选择历史日期不会还原当时人数。</p></div>
        <div><Tag color="purple">答卷提交数</Tag><h4>这段时间提交了多少份答卷？</h4>
          <p>按正式受理的提交时间计量，包含独立问卷。同一份答卷重复提交不会增加计数。</p></div>
        <div><Tag color="green">完成测评数</Tag><h4>这段时间有多少次测评首次成功？</h4>
          <p>按首次评估成功时间计量。失败重试、重复消费和报告重建不重复计数；独立问卷不计入。</p></div>
      </div>
    </Card>
    <Card className="operations-surface" title="如何理解日期、转店与未知归属">
      <div className="operations-definitions operations-definitions--two">
        <div><h4>开展量与明细访问分别判断</h4><p>A 店开始作答，转至 B 店后提交，开展量仍属于 A 店。
          B 店的历史明细访问按现有角色与当前归属检查，统计计数不授予明细访问权。</p></div>
        <div><h4>完整日统计，不是实时待办</h4><p>统计统一使用上海自然日，展示范围截至已发布日期。
          今天的业务操作可在业务页面查看；尚未发布与真实零值会分别显示。</p></div>
        <div><h4>提交与完成不能相除作为完成率</h4><p>提交和首次成功可能跨月，独立问卷只贡献提交量，两者不代表同一批对象。</p></div>
        <div><h4>未知归属不等于门店没有开展</h4><p>历史记录缺少开始门店时保留未知，不根据当前医生或门店推断。
          只有公司全部门店范围可以看到未知桶。</p></div>
      </div>
    </Card>
    {data && <Card className="operations-surface" title="本次查询的数据状态">
      <Typography.Paragraph>已发布开展区间：{data.from} 至 {data.workload_through}</Typography.Paragraph>
      <OperationsFreshness data={data} />
      {data.scope === 'all_stores' && data.unknown_reasons && <Table rowKey="reason" size="small" pagination={false}
        dataSource={Object.entries(data.unknown_reasons).map(([reason, counts]) => ({ reason, ...counts }))}
        columns={[
          { title: '未知归属原因', dataIndex: 'reason', render: value => reasons[value] || '其他未知原因' },
          { title: '提交数', dataIndex: 'submissions', align: 'right', render: value => value.toLocaleString() },
          { title: '完成数', dataIndex: 'completions', align: 'right', render: value => value.toLocaleString() }
        ]} />}
    </Card>}
  </Space>
}
