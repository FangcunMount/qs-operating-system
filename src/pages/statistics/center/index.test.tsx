import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import StatisticsCenter from './index'
import { getOverviewStatistics, listClinicianStatistics, listAssessmentEntryStatistics } from '@/api/path/statistics'
import { rootStore } from '@/store'

jest.mock('mobx-react-lite', () => ({ observer: (component: unknown) => component }))
jest.mock('@/store', () => ({ rootStore: { userStore: { accessContext: { isPlatformAdmin: true, capabilities: new Set() } } } }))
jest.mock('@/components/statistics/OperationsPanel', () => function OperationsStub() { return <div>门店统计已加载</div> })
jest.mock('@/api/path/statistics', () => ({
  getOverviewStatistics: jest.fn(), listClinicianStatistics: jest.fn(), listAssessmentEntryStatistics: jest.fn()
}))

beforeEach(() => {
  jest.clearAllMocks()
  rootStore.userStore.accessContext.isPlatformAdmin = true
  ;(getOverviewStatistics as jest.Mock).mockResolvedValue([new Error('查询超时'), undefined])
  ;(listClinicianStatistics as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
  ;(listAssessmentEntryStatistics as jest.Mock).mockResolvedValue([null, { data: { items: [] } }])
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
})
afterEach(() => jest.restoreAllMocks())

test('opens one operations view and loads headquarters analysis only on selection', async () => {
  render(<StatisticsCenter />)
  expect(screen.getByText('门店统计已加载')).toBeInTheDocument()
  expect(getOverviewStatistics).not.toHaveBeenCalled()
  expect(listClinicianStatistics).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: /总部专题/ }))
  await screen.findByText('总部分析暂不可用')
  expect(listClinicianStatistics).not.toHaveBeenCalled()
  expect(listAssessmentEntryStatistics).not.toHaveBeenCalled()
  expect(screen.queryByText('门店统计已加载')).not.toBeInTheDocument()
  expect(screen.queryByText('核心指标模块')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }))
  await waitFor(() => expect(getOverviewStatistics).toHaveBeenCalledTimes(2))
  await screen.findByText('总部分析暂不可用')
})

test('ordinary operators do not mount or request headquarters analysis', () => {
  rootStore.userStore.accessContext.isPlatformAdmin = false
  render(<StatisticsCenter />)
  expect(screen.getByText('门店统计已加载')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /总部专题/ })).not.toBeInTheDocument()
  expect(getOverviewStatistics).not.toHaveBeenCalled()
})


test('headquarters dimension errors remain explicit and do not depend on overview success', async () => {
  (listClinicianStatistics as jest.Mock).mockResolvedValue([new Error('医生接口失败'), undefined])
  ;(listAssessmentEntryStatistics as jest.Mock).mockResolvedValue([new Error('入口接口失败'), undefined])
  render(<StatisticsCenter />)
  fireEvent.click(screen.getByRole('button', { name: /总部专题/ }))
  await screen.findByText('总部分析暂不可用')
  fireEvent.click(screen.getByRole('tab', { name: '临床人员维度' }))
  await screen.findByText('医生统计暂不可用')
  await screen.findByText('入口统计暂不可用')
  expect(screen.queryByText('暂无完成接入数据')).not.toBeInTheDocument()
  expect(screen.queryByText('暂无入口状态数据')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /返回运营分析/ }))
  expect(screen.getByText('门店统计已加载')).toBeInTheDocument()
})
