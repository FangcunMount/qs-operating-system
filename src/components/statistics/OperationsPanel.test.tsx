import { act, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperationsPanel, { operationsDateRange } from './OperationsPanel'
import moment from 'moment'
import { getOperationsOverview, getOperationsStores } from '@/api/path/statistics'
import { rootStore } from '@/store'
jest.mock('mobx-react-lite', () => ({ observer: (component: unknown) => component }))
jest.mock('@/store', () => ({ rootStore: { userStore: { hasPermission: jest.fn(), currentUser: { permissions: [] } } } }))
jest.mock('@/api/path/statistics', () => ({ getOperationsOverview: jest.fn(), getOperationsStores: jest.fn() }))
jest.mock('recharts', () => {
  const Stub = ({ children }: any) => <div>{children}</div>
  const ChartStub = ({ children }: any) => <svg>{children}</svg>
  return {
    ResponsiveContainer: Stub, ComposedChart: ChartStub, Area: () => null, Line: () => null, CartesianGrid: () => null,
    Legend: () => null, Tooltip: () => null, XAxis: () => null, YAxis: () => null
  }
})
const payload = { scope: 'stores', current_service_count: 2, submissions: 3, completions: 1,
  workload_through: '2026-09-11', published_at: '2026-09-12T00:00:00Z', current_population_read_at: '2026-09-12T02:00:00Z',
  stores: [{ id: '10', code: 'A', name: 'A门店', is_active: false, current_service_count: 2, submissions: 3, completions: 1 }], daily: [] }
beforeEach(() => {
  jest.clearAllMocks()
  ;(rootStore.userStore.hasPermission as jest.Mock).mockReturnValue(true)
  ;(getOperationsOverview as jest.Mock).mockResolvedValue([null, { data: payload }])
  ;(getOperationsStores as jest.Mock).mockResolvedValue([null, { data: payload }])
})
test('store counts show freshness and inactive history without company unknown bucket', async () => {
  render(<OperationsPanel />)
  await screen.findAllByText('当前服务人数')
  expect(screen.getByText('停用')).toBeInTheDocument()
  expect(screen.getByText(/开展数据截止 2026-09-11/)).toBeInTheDocument()
  expect(screen.queryByText(/未知开展门店：/)).not.toBeInTheDocument()
})
test('failed statistics shows retry without fabricating zero counts', async () => {
  (getOperationsOverview as jest.Mock).mockResolvedValue([new Error('尚未发布'), undefined])
  render(<OperationsPanel />)
  await screen.findByText('运营统计暂不可用')
  expect(screen.queryByText('当前服务人数')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }))
  await waitFor(() => expect(getOperationsOverview).toHaveBeenCalledTimes(2))
})
test('revoked permission hides loaded counts and prevents further queries', async () => {
  const view = render(<OperationsPanel />)
  await screen.findAllByText('当前服务人数')
  ;(rootStore.userStore.hasPermission as jest.Mock).mockReturnValue(false)
  view.rerender(<OperationsPanel />)
  expect(screen.queryAllByText('A门店')).toHaveLength(0)
  expect(getOperationsOverview).toHaveBeenCalledTimes(1)
})

test('compact home summary avoids store list query and full table', async () => {
  render(<MemoryRouter><OperationsPanel compact /></MemoryRouter>)
  await screen.findAllByText('当前服务人数')
  expect(screen.getByText('本月运营概况')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /查看完整统计/ })).toHaveAttribute('href', '/statistics/center')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('选择门店')).not.toBeInTheDocument()
  expect(getOperationsStores).not.toHaveBeenCalled()
  expect(getOperationsOverview).toHaveBeenCalledTimes(1)
})


test('overview, store analysis and definitions share filters and avoid redundant requests on tab changes', async () => {
  render(<OperationsPanel />)
  await screen.findAllByText('当前服务人数')
  fireEvent.click(screen.getByRole('radio', { name: '上月' }))
  await waitFor(() => expect(getOperationsOverview).toHaveBeenCalledTimes(2))
  await screen.findAllByText('当前服务人数')
  fireEvent.click(screen.getByRole('button', { name: '查看A门店趋势' }))
  await waitFor(() => expect(getOperationsOverview).toHaveBeenCalledTimes(3))
  expect(getOperationsOverview).toHaveBeenLastCalledWith({
    from: operationsDateRange('last_month')[0], to: operationsDateRange('last_month')[1], store_ids: '10'
  })
  await screen.findAllByText('当前服务人数')
  expect(screen.getByRole('tab', { name: '门店分析' })).toHaveAttribute('aria-selected', 'true')
  expect(getOperationsStores).toHaveBeenCalledTimes(2)
  fireEvent.click(screen.getByRole('tab', { name: '数据说明' }))
  expect(screen.getByText('提交与完成不能相除作为完成率')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('tab', { name: '运营总览' }))
  expect(screen.getAllByText('当前服务人数')[0]).toBeInTheDocument()
  expect(getOperationsOverview).toHaveBeenCalledTimes(3)
})

test('catalog failure does not hide successful counts or pretend that no stores exist', async () => {
  (getOperationsStores as jest.Mock).mockResolvedValue([new Error('选项超时'), undefined])
  render(<OperationsPanel />)
  await screen.findByText('门店筛选暂不可用')
  expect(screen.getAllByText('当前服务人数')[0]).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: '选择门店' })).toBeDisabled()
})

test('data definitions remain available when the selected period is unpublished', async () => {
  (getOperationsOverview as jest.Mock).mockResolvedValue([new Error('尚未发布'), undefined])
  render(<OperationsPanel />)
  await screen.findByText('运营统计暂不可用')
  fireEvent.click(screen.getByRole('tab', { name: '数据说明' }))
  expect(screen.getByText('完整日统计，不是实时待办')).toBeInTheDocument()
  expect(screen.queryByText('本次查询的数据状态')).not.toBeInTheDocument()
})

test('a delayed previous range never overwrites the new range or shows stale counts while loading', async () => {
  let finishOld: (value: any) => void = () => undefined
  ;(getOperationsOverview as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve }))
  ;(getOperationsOverview as jest.Mock).mockResolvedValue([null, { data: { ...payload, submissions: 9876 } }])
  render(<OperationsPanel />)
  fireEvent.click(screen.getByRole('radio', { name: '近 7 天' }))
  await screen.findByText('9,876')
  await act(async () => finishOld([null, { data: payload }]))
  expect(screen.getByText('9,876')).toBeInTheDocument()
})

test('company unknown counts are separate from named stores and hidden from store scopes', async () => {
  const unknown = { submissions: 100, completions: 90 }
  ;(getOperationsOverview as jest.Mock).mockResolvedValue([null, { data: { ...payload, scope: 'all_stores', unknown } }])
  const view = render(<OperationsPanel />)
  await screen.findByText('未知开展门店：提交 100，完成 90')
  view.unmount()
  ;(getOperationsOverview as jest.Mock).mockResolvedValue([null, { data: { ...payload, unknown } }])
  render(<OperationsPanel />)
  await screen.findAllByText('当前服务人数')
  expect(screen.queryByText(/未知开展门店：/)).not.toBeInTheDocument()
})

test('date presets use complete Shanghai days with an exclusive end across months and leap years', () => {
  expect(operationsDateRange('month', moment.utc('2026-09-30T18:00:00Z'))).toEqual(['2026-10-01', '2026-10-01'])
  expect(operationsDateRange('last_month', moment.utc('2024-03-15T00:00:00Z'))).toEqual(['2024-02-01', '2024-03-01'])
  expect(operationsDateRange('7d', moment.utc('2026-09-12T18:00:00Z'))).toEqual(['2026-09-06', '2026-09-13'])
})


test('changing a loaded range removes old counts until the new request finishes', async () => {
  render(<OperationsPanel />)
  await screen.findAllByText('当前服务人数')
  ;(getOperationsOverview as jest.Mock).mockImplementationOnce(() => new Promise(() => undefined))
  await act(async () => { fireEvent.click(screen.getByRole('radio', { name: '上月' })) })
  expect(screen.queryAllByText('当前服务人数')).toHaveLength(0)
  expect(screen.getByLabelText('正在加载运营统计')).toBeInTheDocument()
})

test('table search filters store rows without changing the range or requesting new aggregates', async () => {
  render(<OperationsPanel />)
  await screen.findAllByText('当前服务人数')
  fireEvent.click(screen.getByRole('tab', { name: '门店分析' }))
  fireEvent.change(screen.getByLabelText('搜索门店'), { target: { value: '不存在的门店' } })
  expect(screen.getByText('没有匹配的门店')).toBeInTheDocument()
  expect(screen.getAllByText('当前服务人数')[0]).toBeInTheDocument()
  expect(getOperationsOverview).toHaveBeenCalledTimes(1)
})
