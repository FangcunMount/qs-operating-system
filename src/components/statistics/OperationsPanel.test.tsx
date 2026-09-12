import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OperationsPanel from './OperationsPanel'
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
  await screen.findByText('A门店')
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
  await screen.findByText('A门店')
  ;(rootStore.userStore.hasPermission as jest.Mock).mockReturnValue(false)
  view.rerender(<OperationsPanel />)
  expect(screen.queryByText('A门店')).not.toBeInTheDocument()
  expect(getOperationsOverview).toHaveBeenCalledTimes(1)
})

test('compact home summary avoids store list query and full table', async () => {
  render(<MemoryRouter><OperationsPanel compact /></MemoryRouter>)
  await screen.findByText('当前服务人数')
  expect(screen.getByText('本月运营概况')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /查看完整统计/ })).toHaveAttribute('href', '/statistics/center')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('选择门店')).not.toBeInTheDocument()
  expect(getOperationsStores).not.toHaveBeenCalled()
  expect(getOperationsOverview).toHaveBeenCalledTimes(1)
})
