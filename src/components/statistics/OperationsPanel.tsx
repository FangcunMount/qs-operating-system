import React, { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, DatePicker, Row, Select, Space, Statistic, Table, Typography, Skeleton } from 'antd'
import { observer } from 'mobx-react-lite'
import moment from 'moment'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { rootStore } from '@/store'
import { getOperationsOverview, getOperationsStores } from '@/api/path/statistics'
import type { IOperationsOverview, IOperationsStore } from '@/api/path/statistics'
import { extractErrorMessage } from '@/utils/apiError'

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
      setAllCompany(response.data.scope === 'all_stores')
    }).catch(err => { if (!cancelled) setError(extractErrorMessage(err, '运营统计暂不可用，请稍后重试')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [allowed, authorization, profile, range, selected, revision, compact])
  if (!allowed) return null
  return <Card
    title={compact ? '本月运营概况' : '门店运营统计'}
    extra={compact ? <Link to="/statistics/center">查看完整统计</Link> : undefined} style={{ marginBottom: 24, borderRadius: 8 }}>
    <Space wrap style={{ marginBottom: 16 }}>
      {!compact && <DatePicker.RangePicker onChange={values => setRange(values?.[0] && values?.[1]
        ? [values[0].format('YYYY-MM-DD'), values[1].clone().add(1, 'day').format('YYYY-MM-DD')] : null)} />}
      {!compact && <Select mode="multiple" aria-label="选择门店" style={{ minWidth: 260 }} value={selected} allowClear
        placeholder={allCompany ? '公司全部门店（含未知归属）' : '全部授权门店'} onChange={setSelected}
        options={options.map(s => ({ value: s.id, label: `${s.name} · ${s.code}${s.is_active ? '' : '（已停用）'}` }))} />}
      <Button loading={loading} onClick={() => setRevision(v => v + 1)}>刷新</Button>
    </Space>
    <Typography.Paragraph type="secondary">默认本月，按上海自然日统计。服务人数按当前归属；提交数和完成数按开始作答时的开展门店，转店不改写历史开展量。</Typography.Paragraph>
    {loading && <Skeleton active paragraph={{ rows: compact ? 2 : 4 }} />}
    {error && <Alert type="warning" showIcon message="运营统计暂不可用" description={error} />}
    {data && <>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}><Statistic title="当前服务人数" value={data.current_service_count} /></Col>
        <Col xs={24} md={8}><Statistic title="答卷提交数" value={data.submissions} /></Col>
        <Col xs={24} md={8}><Statistic title="完成测评数" value={data.completions} /></Col>
      </Row>
      <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
        开展数据截止 {data.workload_through}；发布时间 {moment(data.published_at).utcOffset(8).format('YYYY-MM-DD HH:mm')}。
        服务人数读取于 {moment(data.current_population_read_at).utcOffset(8).format('YYYY-MM-DD HH:mm')}。
        独立问卷只计提交；测评重试和报告重建不重复计完成。
      </Typography.Paragraph>
      {data.unknown && <Alert type="info" showIcon message={`未知开展门店：提交 ${data.unknown.submissions}，完成 ${data.unknown.completions}`}
        
        description="历史记录和旧客户端未采集开始门店；开始时未配店也保留未知。不会根据当前归属回填。" />}
      {!compact && <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data.daily}>
          <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
          <Line dataKey="submissions" name="答卷提交数" stroke="#1677ff" dot={false} />
          <Line dataKey="completions" name="完成测评数" stroke="#389e0d" strokeDasharray="5 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>}
      {!compact && <Table<IOperationsStore> rowKey="id" dataSource={data.stores}
        scroll={{ x: 720 }} pagination={{ pageSize: 10, hideOnSinglePage: true }} columns={[
          { title: '门店', dataIndex: 'name' }, { title: '编号', dataIndex: 'code' },
          { title: '状态', dataIndex: 'is_active', render: value => value ? '启用' : '停用' },
          { title: '当前服务人数', dataIndex: 'current_service_count', sorter: (a, b) => a.current_service_count - b.current_service_count },
          { title: '答卷提交数', dataIndex: 'submissions', sorter: (a, b) => a.submissions - b.submissions },
          { title: '完成测评数', dataIndex: 'completions', sorter: (a, b) => a.completions - b.completions }
        ]} />}
    </>}
  </Card>
})
export default OperationsPanel
