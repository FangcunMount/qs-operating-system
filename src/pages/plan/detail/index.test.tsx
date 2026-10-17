import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import PlanDetail from './index'
import { planApi } from '@/api/path/plan'

jest.mock('@/api/path/plan', () => ({ planApi: { get: jest.fn(), getPlanTasks: jest.fn() } }))

it('navigates from a plan task row using the complete string TaskID', async () => {
  const planID = '9007199254740995'
  const taskID = '9007199254740993'
  ;(planApi.get as jest.Mock).mockResolvedValue([null, { data: {
    id: planID, org_id: 1, scale_code: 'SCALE', schedule_type: 'by_week', trigger_time: '08:00', status: 'active'
  } }])
  ;(planApi.getPlanTasks as jest.Mock).mockResolvedValue([null, { data: { tasks: [{
    id: taskID, plan_id: planID, testee_id: '42', org_id: 1,
    scale_code: 'SCALE', seq: 1, status: 'opened', planned_at: '2026-10-14 08:00:00'
  }] } }])
  render(
    <MemoryRouter initialEntries={[`/plan/detail/${planID}`]}>
      <Switch>
        <Route path="/plan/tasks/:id" render={({ match }) => <div>任务路径：{match.params.id}</div>} />
        <Route path="/plan/detail/:id"><PlanDetail /></Route>
      </Switch>
    </MemoryRouter>
  )
  fireEvent.click(await screen.findByRole('button', { name: '查看详情' }))
  expect(screen.getByText(`任务路径：${taskID}`)).toBeInTheDocument()
  expect(planApi.getPlanTasks).toHaveBeenCalledWith(planID)
})
