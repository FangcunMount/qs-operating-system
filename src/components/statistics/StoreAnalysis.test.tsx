import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import StoreAnalysis from './StoreAnalysis'
import { getAnalysisOverview, getAnalysisClinicians, getAnalysisEntries } from '@/api/path/statisticsAnalysis'
jest.mock('@/api/path/statisticsAnalysis', () => ({ ...jest.requireActual('@/api/path/statisticsAnalysis'),
  getAnalysisOverview: jest.fn(), getAnalysisClinicians: jest.fn(), getAnalysisEntries: jest.fn() }))
jest.mock('recharts', () => {
  const Stub = ({ children }: any) => <div>{children}</div>
  return { ResponsiveContainer: Stub, BarChart: Stub, LineChart: Stub, CartesianGrid: () => null,
    XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null, Line: () => null, Bar: () => null }
})
jest.mock('./PlanActivityMetricsPanel', () => function Plan() { return <div>活动图表</div> })
jest.mock('./PlanFulfillmentMetricsPanel', () => function Plan() { return <div>履约图表</div> })
const metadata = { scope: 'stores', stores: [{ id: '10', name: 'A', code: 'A', is_active: true }],
  from: '2026-09-01',
  to_exclusive: '2026-09-12',
  data_through: '2026-09-11',
  published_at: '2026-09-12',
  published_version: '7',
  current_ownership_read_at: '2026-09-13' }
const overview = { ...metadata,
  organization_overview: { testee_count: 1234,
    clinician_count: 22,
    active_entry_count: 10,
    content_count: 3,
    answer_sheet_submission_count: 4,
    assessment_count: 4,
    report_count: 3 },
  access_funnel: { window: {}, trend: { entry_opened: [], intake_confirmed: [], testee_created: [], care_relationship_established: [] } },
  assessment_service: { window: {}, trend: { answersheet_submitted: [], assessment_created: [], report_generated: [], assessment_failed: [] } },
  plan: { activity: { window: {}, trend: { task_created: [], task_opened: [], task_completed: [], task_expired: [] } },
    fulfillment: { window: {}, trend: { planned: [], due: [], completed: [], overdue: [] } } } }
const query = { from: '2026-09-01', to: '2026-09-12', store_ids: '10' }
function mount(identity = 'operator-A', q = query) { return <StoreAnalysis identity={identity} query={q} revision={0} history={<div>历史开展视图</div>} /> }
beforeEach(() => {
  jest.clearAllMocks()
  ;(getAnalysisOverview as jest.Mock).mockResolvedValue([null, { data: overview }])
  ;(getAnalysisClinicians as jest.Mock).mockResolvedValue([null, { data: { ...metadata, items: [], total: 41, page: 1, page_size: 20,
    summary: { clinician_count: 41,
      active_clinician_count: 40,
      clinicians_with_intake: 21,
      intake_confirmed_count: 3210,
      report_generated_count: 5 } } }])
  ;(getAnalysisEntries as jest.Mock).mockResolvedValue([null, { data: { ...metadata, items: [], total: 0, page: 1, page_size: 20 } }])
})
test('service and plan tabs reuse the exact overview and history remains independent', async () => {
  render(mount())
  await screen.findByText('1,234')
  expect(getAnalysisClinicians).not.toHaveBeenCalled()
  expect(getAnalysisOverview).toHaveBeenCalledWith(query)
  fireEvent.click(screen.getByRole('tab', { name: '计划执行' }))
  await screen.findByText('活动图表')
  expect(getAnalysisOverview).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('tab', { name: '历史开展' }))
  expect(screen.getByText('历史开展视图')).toBeInTheDocument()
  expect(screen.queryByText('1,234')).not.toBeInTheDocument()
})
test('clinician summary covers all pages and pagination sends the same scope', async () => {
  render(mount())
  fireEvent.click(screen.getByRole('tab', { name: '临床人员' }))
  await screen.findByText('3,210')
  expect(getAnalysisClinicians).toHaveBeenLastCalledWith({ ...query, page: 1, page_size: 20 })
  fireEvent.click(screen.getByTitle('2'))
  await waitFor(() => expect(getAnalysisClinicians).toHaveBeenLastCalledWith({ ...query, page: 2, page_size: 20 }))
  expect(getAnalysisEntries).toHaveBeenCalledTimes(1)
})
test('clinician and entry errors are independent with targeted retry', async () => {
  (getAnalysisClinicians as jest.Mock).mockResolvedValue([new Error('医生统计失败'), undefined])
  render(mount()); fireEvent.click(screen.getByRole('tab', { name: '临床人员' }))
  await screen.findByText('医生统计失败')
  expect(screen.getByText('测评入口统计')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }))
  await waitFor(() => expect(getAnalysisClinicians).toHaveBeenCalledTimes(2))
  expect(getAnalysisEntries).toHaveBeenCalledTimes(1)
})
test('old identity responses cannot replace a new scope or remain visible', async () => {
  let finish: (value: any) => void = () => undefined
 ;(getAnalysisOverview as jest.Mock).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const view = render(mount())
  view.rerender(mount('operator-B', { ...query, store_ids: '20' }))
  await screen.findByText('1,234')
  await act(async () => finish([null, { data: { ...overview, organization_overview: { ...overview.organization_overview, testee_count: 9999 } } }]))
  expect(screen.queryByText('9,999')).not.toBeInTheDocument()
  ;(getAnalysisOverview as jest.Mock).mockResolvedValue([new Error('无权访问'), undefined])
  view.rerender(mount('operator-C', { ...query, store_ids: '30' }))
  expect(screen.queryByText('1,234')).not.toBeInTheDocument()
  await screen.findByText('无权访问')
})

test('entry filtering selects a doctor by name and sends only the identifier', async () => {
  (getAnalysisClinicians as jest.Mock).mockResolvedValue([null, { data: { ...metadata,
    items: [{ id: '42', name: '验收医生甲' }], total: 1, page: 1, page_size: 20,
    summary: { clinician_count: 1, active_clinician_count: 1, clinicians_with_intake: 0,
      intake_confirmed_count: 0, report_generated_count: 0 } } }])
  render(mount()); fireEvent.click(screen.getByRole('tab', { name: '临床人员' }))
  await screen.findByText('验收医生甲')
  fireEvent.mouseDown(screen.getByRole('combobox', { name: '筛选入口医生' }))
  fireEvent.click(screen.getByText('验收医生甲', { selector: '.ant-select-item-option-content' }))
  await waitFor(() => expect(getAnalysisEntries).toHaveBeenLastCalledWith({ ...query, page: 1, page_size: 20, clinician_id: '42' }))
})
