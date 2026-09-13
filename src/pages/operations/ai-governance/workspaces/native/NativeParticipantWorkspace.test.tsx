import { act, fireEvent, render, screen } from '@testing-library/react'
import { getNativeParticipantCapacity } from '@/api/path/aiWorkflow'
import { NativeParticipantWorkspace } from './NativeParticipantWorkspace'

jest.mock('@/api/path/aiWorkflow', () => ({ getNativeParticipantCapacity: jest.fn() }))
const read = getNativeParticipantCapacity as jest.Mock
const usage = { identity: '12', daily_reserved: 1, daily_remaining: 499, active: 1, active_remaining: 9 }
const data = {
  organization_id: 12, budget_day: '2026-09-13', organization: usage,
  policy: { daily_org: 500, daily_user: 5, daily_assessment: 3, active_org: 10, active_user: 2, active_assessment: 1 },
  daily_reservations: [], active_reservations: [], daily_truncated: false, active_truncated: false
}
beforeEach(() => jest.resetAllMocks())
it('forwards selected filters and clears prior results on revoked access', async () => {
  read.mockResolvedValueOnce([null, { data: { ...data,
    subject: { ...usage, identity: 'user:42', daily_remaining: 4 },
    assessment: { ...usage, identity: '42', daily_remaining: 2 }
  } }]).mockResolvedValueOnce([new Error('denied')])
  render(<NativeParticipantWorkspace />)
  expect(read).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('参与者主体标识'), { target: { value: ' user:42 ' } })
  fireEvent.change(screen.getByLabelText('参与者测评标识'), { target: { value: '42' } })
  fireEvent.click(screen.getByText('查询生成容量'))
  await screen.findByText('499')
  expect(read).toHaveBeenLastCalledWith('user:42', '42')
  expect(screen.getByText('指定用户')).toBeInTheDocument()
  expect(screen.getByText('指定测评')).toBeInTheDocument()
  fireEvent.click(screen.getByText('查询生成容量'))
  await screen.findByText(/无法读取参与者生成容量/)
  expect(screen.queryByText('499')).not.toBeInTheDocument()
})
it('rejects a response that omits the selected subject instead of showing org capacity as user capacity', async () => {
  read.mockResolvedValue([null, { data }])
  render(<NativeParticipantWorkspace />)
  fireEvent.change(screen.getByLabelText('参与者主体标识'), { target: { value: 'user:42' } })
  fireEvent.click(screen.getByText('查询生成容量'))
  await screen.findByText(/无法读取参与者生成容量/)
  expect(screen.queryByText('499')).not.toBeInTheDocument()
})
it('ignores a previous owner response and prevents overlapping queries', async () => {
  let finish!: (value: unknown) => void
  read.mockReturnValue(new Promise((resolve) => { finish = resolve }))
  const view = render(<NativeParticipantWorkspace key="owner1" />)
  fireEvent.click(screen.getByText('查询生成容量'))
  fireEvent.click(screen.getByText('查询生成容量'))
  expect(read).toHaveBeenCalledTimes(1)
  expect(screen.getByLabelText('参与者主体标识')).toBeDisabled()
  view.rerender(<NativeParticipantWorkspace key="owner2" />)
  await act(async () => { finish([null, { data }]) })
  expect(screen.queryByText('499')).not.toBeInTheDocument()
})
