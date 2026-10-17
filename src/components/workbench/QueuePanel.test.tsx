import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Switch } from 'react-router-dom'
import QueuePanel from './QueuePanel'
import { workbenchApi } from '@/api/path/workbench'

jest.mock('@/api/path/workbench', () => ({ workbenchApi: {
  getOrgWorkbenchQueueSummary: jest.fn(), listOrgWorkbenchQueue: jest.fn()
} }))

it('retains the queue task entry URL and the existing profile navigation', async () => {
  const taskID = '9007199254740993'
  const entryURL = `https://collect.example.test/entry?task_id=${taskID}#task`
  ;(workbenchApi.getOrgWorkbenchQueueSummary as jest.Mock).mockResolvedValue([null, {
    data: { counts: { high_risk: 1, follow_up: 0, key_focus: 0 } }
  }])
  ;(workbenchApi.listOrgWorkbenchQueue as jest.Mock).mockResolvedValue([null, { data: {
    queue_type: 'high_risk', total: 1, page: 1, page_size: 20, total_pages: 1,
    items: [{
      testee: { id: 42, name: '测试档案', gender: 'male', org_id: 1, is_key_focus: false, created_at: '', updated_at: '' },
      reason_code: 'task_opened', reason: '已开放任务', task: {
        task_id: taskID, plan_id: '9007199254740995', status: 'opened', planned_at: '2026-10-14 08:00:00',
        scale_code: 'SCALE', entry_url: entryURL
      }
    }]
  } }])
  render(
    <MemoryRouter initialEntries={['/workbench']}>
      <Switch>
        <Route path="/subject/detail/:id" render={({ match }) => <div>档案路径：{match.params.id}</div>} />
        <Route><QueuePanel mode="admin" /></Route>
      </Switch>
    </MemoryRouter>
  )
  const link = await screen.findByRole('link', { name: /打开入口/ })
  expect(link).toHaveAttribute('href', entryURL)
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  fireEvent.click(screen.getByRole('button', { name: '查看档案' }))
  expect(screen.getByText('档案路径：42')).toBeInTheDocument()
})
