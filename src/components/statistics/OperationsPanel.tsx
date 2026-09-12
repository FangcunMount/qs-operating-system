import React, { useState } from 'react'
import { Alert, Button, Card, DatePicker, Radio, Select, Skeleton, Space, Tabs, Tag, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { observer } from 'mobx-react-lite'
import moment from 'moment'
import { Link } from 'react-router-dom'
import { rootStore } from '@/store'
import { useOperationsStatistics } from './useOperationsStatistics'
import { OperationsFreshness, OperationsGuide, OperationsMetrics, OperationsStores, OperationsTrend, OperationsUnknown } from './OperationsReport'
import './OperationsPanel.scss'

export const OPERATIONS_RESOURCE = 'qs:statistics:collection:operations'
type View = 'overview' | 'stores' | 'guide'
type Preset = 'month' | 'last_month' | '7d' | 'custom'

export function operationsDateRange(preset: Exclude<Preset, 'custom'>, now = moment()): [string, string] {
  const today = now.clone().utcOffset(8).startOf('day')
  if (preset === 'last_month') return [today.clone().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
    today.clone().startOf('month').format('YYYY-MM-DD')]
  return [preset === '7d' ? today.clone().subtract(7, 'days').format('YYYY-MM-DD') : today.clone().startOf('month').format('YYYY-MM-DD'),
    today.format('YYYY-MM-DD')]
}

const OperationsPanel: React.FC<{ compact?: boolean }> = observer(({ compact = false }) => {
  const { userStore } = rootStore
  const allowed = userStore.hasPermission(OPERATIONS_RESOURCE, 'read')
  const identity = JSON.stringify(userStore.currentUser || null)
  const [view, setView] = useState<View>('overview')
  const [preset, setPreset] = useState<Preset>('month')
  const [range, setRange] = useState<[string, string] | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [revision, setRevision] = useState(0)
  const { data, error, loading, catalog, catalogError, catalogLoading } =
    useOperationsStatistics(allowed, identity, range, selected, revision, compact)
  if (!allowed) return compact ? null : <Alert type="info" showIcon message="暂无运营统计权限" description="请联系管理员核对运营统计权限与门店范围。" />
  const scopeLabel = data?.scope === 'all_stores' ? '公司全部门店' : data?.stores.length === 1 ? data.stores[0].name : '授权门店汇总'
  const options = catalog?.stores || []
  const rangeValue = range || operationsDateRange('month')
  const pickerValue: [moment.Moment, moment.Moment] | null = rangeValue[0] < rangeValue[1]
    ? [moment(rangeValue[0]), moment(rangeValue[1]).subtract(1, 'day')] : null
  const refresh = () => setRevision(value => value + 1)
  const selectStore = (id: string) => { setSelected([id]); setView('stores') }
  const report = <>
    {loading && view !== 'guide' && <Card className="operations-surface" aria-label="正在加载运营统计"><Skeleton active paragraph={{ rows: 4 }} /></Card>}
    {error && <Alert className="operations-unknown" type="warning" showIcon message="运营统计暂不可用" description={error}
      action={<Button onClick={refresh}>重试</Button>} />}
    {!compact && view === 'guide' ? <OperationsGuide data={data} /> : data && <>
      <div className="operations-context">
        <Tag color="blue">{scopeLabel}</Tag><span>开展统计：{data.from} 至 {data.workload_through}</span>
        {!compact && <span>服务人数为当前值</span>}
      </div>
      <OperationsMetrics data={data} />
      <div className={`operations-chart-grid ${view === 'stores' ? 'operations-chart-grid--wide' : ''}`}>
        <OperationsTrend data={data} compact={compact} />
        {!compact && view === 'overview' && <Card className="operations-surface operations-reading" title="这份报表怎么看">
          <div className="operations-reading__item"><span className="operations-reading__dot" />
            <div><strong>先看服务规模</strong><p>当前服务人数随转店更新，反映现在服务的受试者。</p></div>
          </div>
          <div className="operations-reading__item"><span className="operations-reading__dot operations-reading__dot--green" />
            <div><strong>再看期间开展量</strong><p>提交和首次成功分别计数，归入开始作答时的门店。</p></div>
          </div>
          <div className="operations-reading__item"><span className="operations-reading__dot operations-reading__dot--violet" />
            <div><strong>按同一范围比较</strong><p>切换门店分析时保留当前日期和门店选择，不增加明细访问权限。</p></div>
          </div>
          <Button type="link" onClick={() => setView('guide')}>查看完整数据说明 →</Button>
        </Card>}
      </div>
      <OperationsUnknown data={data} />
      {!compact && <OperationsStores data={data} preview={view === 'overview'} onSelect={selectStore} onExpand={() => setView('stores')} />}
      <OperationsFreshness data={data} />
    </>}
  </>
  return <section className={`operations-panel ${compact ? 'operations-panel--compact' : ''}`} aria-label="运营统计">
    <div className="operations-toolbar">
      <div>
        <Typography.Title level={4}>{compact ? '本月运营概况' : '服务与开展'}</Typography.Title>
        <Typography.Text type="secondary">{data ? scopeLabel : '按授权范围加载'} · 上海自然日</Typography.Text>
      </div>
      <Space wrap>
        {compact && <Link to="/statistics/center">查看完整统计 →</Link>}
        <Button icon={<ReloadOutlined />} loading={loading || catalogLoading} onClick={refresh}>刷新</Button>
      </Space>
    </div>
    {!compact && <>
      <div className="operations-filters">
        <div className="operations-filter-group"><span className="operations-filter-label">统计期间</span>
          <Radio.Group value={preset} onChange={event => {
            const next = event.target.value as Exclude<Preset, 'custom'>
            setPreset(next); setRange(operationsDateRange(next))
          }} buttonStyle="solid">
            <Radio.Button value="month">本月</Radio.Button><Radio.Button value="last_month">上月</Radio.Button>
            <Radio.Button value="7d">近 7 天</Radio.Button>
          </Radio.Group>
          <DatePicker.RangePicker aria-label="统计日期范围" value={pickerValue} allowClear
            disabledDate={day => day.isAfter(moment().utcOffset(8).startOf('day').subtract(1, 'day'), 'day')}
            onChange={values => {
              if (values?.[0] && values?.[1]) {
                setPreset('custom'); setRange([values[0].format('YYYY-MM-DD'), values[1].clone().add(1, 'day').format('YYYY-MM-DD')])
              } else { setPreset('month'); setRange(null) }
            }} />
        </div>
        <div className="operations-filter-group"><span className="operations-filter-label">服务门店</span>
          <Select mode="multiple" aria-label="选择门店" className="operations-store-select" value={selected} allowClear
            loading={catalogLoading} disabled={!catalog} optionFilterProp="label"
            placeholder={catalog?.scope === 'all_stores' ? '公司全部门店（含未知归属）' : '全部授权门店'} onChange={setSelected}
            options={options.map(store => ({ value: store.id, label: `${store.name} · ${store.code}${store.is_active ? '' : '（已停用）'}` }))} />
          {selected.length > 0 && <Button type="link" onClick={() => setSelected([])}>恢复全部授权门店</Button>}
        </div>
      </div>
      {catalogError && <Alert className="operations-unknown" type="warning" showIcon message="门店筛选暂不可用"
        description={catalogError} action={<Button onClick={refresh}>重试</Button>} />}
      <Tabs className="operations-navigation" destroyInactiveTabPane activeKey={view} onChange={key => setView(key as View)}>
        <Tabs.TabPane tab="运营总览" key="overview">{view === 'overview' && report}</Tabs.TabPane>
        <Tabs.TabPane tab="门店分析" key="stores">{view === 'stores' && report}</Tabs.TabPane>
        <Tabs.TabPane tab="数据说明" key="guide">{view === 'guide' && report}</Tabs.TabPane>
      </Tabs>
    </>}
    {compact && report}
  </section>
})
export default OperationsPanel
