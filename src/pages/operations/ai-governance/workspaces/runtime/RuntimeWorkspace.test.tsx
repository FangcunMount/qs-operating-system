import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route } from 'react-router-dom'
import {
  getRuntimeRequest,
  getRuntimeTimeline,
  listRuntimeRequests
} from '@/api/path/aiWorkflow/runtime'
import { RuntimeList, RuntimeRequestDetail } from './RuntimeWorkspace'
import { active } from './state'
jest.mock('@/api/path/aiWorkflow/runtime', () => ({
  getRuntimeRequest: jest.fn(),
  getRuntimeTimeline: jest.fn().mockResolvedValue([null, undefined]),
  listRuntimeRequests: jest.fn()
}))
jest.mock('./RuntimeHealth', () => ({
  RuntimeHealth: function Health() {
    return null
  }
}))
jest.mock('./RuntimeTimeline', () => ({
  RuntimeTimeline: function Timeline() {
    return null
  }
}))
jest.mock('@/store', () => ({ rootStore: {} }))
jest.mock('../native/NativeParticipantRetryWorkspace', () => ({
  NativeParticipantRetryWorkspace: function RetryWorkspace() {
    return <div>原命令保护处置</div>
  }
}))
const list = listRuntimeRequests as jest.Mock,
  get = getRuntimeRequest as jest.Mock
const id = '00000000-0000-4000-8000-000000000001'
const request = {
  request_id: id,
  session_id: '',
  assessment_ids: ['636429483674448430'],
  testee_id: '7',
  status: 'pending',
  version: 0,
  created_at: null,
  updated_at: null,
  commands_pending: 1,
  command_attempts: 2
}
const page = {
  items: [request],
  next_cursor: '',
  observed_at: '2026-09-20T00:00:00Z',
  partial: false,
  ai_availability: 'not_requested'
}
beforeEach(() => {
  jest.resetAllMocks()
  ;(getRuntimeTimeline as jest.Mock).mockResolvedValue([null, undefined])
  list.mockResolvedValue([null, { data: page }])
  get.mockResolvedValue([
    null,
    {
      data: { request, observed_at: page.observed_at, partial: false, ai_availability: 'not_requested' }
    }
  ])
})
it('finds a QS-only request by assessment and does not require a session', async () => {
  render(
    <MemoryRouter>
      <RuntimeList />
    </MemoryRouter>
  )
  await screen.findByText('QS 已接单，等待 AI 接收')
  fireEvent.change(screen.getByLabelText('查找测评编号'), { target: { value: '636429483674448430' } })
  fireEvent.click(screen.getByText('查找请求'))
  await waitFor(() =>
    expect(list).toHaveBeenLastCalledWith({ limit: 20, assessment_id: '636429483674448430' })
  )
  expect(screen.getByRole('link', { name: id })).toHaveAttribute(
    'href',
    `/operations/ai-governance/runtime/requests/${id}`
  )
})
it('clears previously visible rows when access is revoked', async () => {
  render(
    <MemoryRouter>
      <RuntimeList />
    </MemoryRouter>
  )
  await screen.findByText('QS 已接单，等待 AI 接收')
  list.mockResolvedValue([{ status: 403 }])
  fireEvent.click(screen.getByRole('button', { name: /刷\s*新/ }))
  await screen.findByText(/当前权限或登录状态已失效/)
  expect(screen.queryByText(id)).not.toBeInTheDocument()
})
it('shows partial detail without inventing model outcomes', async () => {
  get.mockResolvedValue([
    null,
    {
      data: {
        request: { ...request, session_id: id },
        observed_at: page.observed_at,
        partial: true,
        ai_availability: 'unavailable'
      }
    }
  ])
  render(
    <MemoryRouter initialEntries={[`/requests/${id}`]}>
      <Route path="/requests/:requestID">
        <RuntimeRequestDetail owner="one" />
      </Route>
    </MemoryRouter>
  )
  await screen.findByText('AI 状态暂未确认')
  expect(screen.getByText(/仅展示 QS 已知事实/)).toBeInTheDocument()
  expect(screen.queryByText('原命令保护处置')).not.toBeInTheDocument()
})
it('discards the previous account response after remount', async () => {
  let resolve: (value: unknown) => void = () => undefined
  list.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done
    })
  )
  const view = render(
    <MemoryRouter>
      <RuntimeList key="one" />
    </MemoryRouter>
  )
  list.mockResolvedValue([null, { data: { ...page, items: [] } }])
  view.rerender(
    <MemoryRouter>
      <RuntimeList key="two" />
    </MemoryRouter>
  )
  await screen.findByText(/没有符合条件/)
  await act(async () => resolve([null, { data: page }]))
  expect(screen.queryByText(id)).not.toBeInTheDocument()
})
it('stops polling terminal receipts but keeps waiting for result delivery', () => {
  const ai = {
    session_id: id,
    request_id: id,
    run_id: id,
    status: 'completed',
    version: 3,
    workflow_version: 'v1',
    failure_code: '',
    model_call_status: 'completed',
    invocation_id: id,
    publication_id: id,
    publication_sha256: 'hash',
    created_at: '',
    updated_at: ''
  }
  expect(
    active({ ...request, session_id: id, status: 'completed', commands_pending: 0, version: 3, ai })
  ).toBe(false)
  expect(active({ ...request, session_id: id, commands_pending: 0, version: 2, ai })).toBe(true)
})
