import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AssessmentProgress from './progress'
import { get, post } from '@/api/qsServer'
import { userStore } from '@/store/userStore'
import { buildAccessContext } from '@/utils/accessControl'

jest.mock('@/api/qsServer', () => ({ get: jest.fn(), post: jest.fn() }))
jest.mock('@/store/userStore', () => ({ userStore: { accessContext: {}, hasPermission: jest.fn(), permissionNeedsRefresh: jest.fn() } }))
jest.mock('mobx-react', () => ({ observer: (component: any) => component }))

const id = '635426176763965998'
const row = { id, testee_id: '21', questionnaire_code: 'Q1', origin_type: 'adhoc', status: 'failed', manual_retry_available: true }
const load = (origin = 'adhoc') => {
  (get as jest.Mock).mockResolvedValue([null, { data: { items: [{ ...row, origin_type: origin }], total: 1 } }])
}

beforeEach(() => {
  jest.clearAllMocks()
  Object.assign(userStore, { accessContext: buildAccessContext(['qs:assessment_operator'], false) })
  ;(userStore.hasPermission as jest.Mock).mockReturnValue(true)
  ;(userStore.permissionNeedsRefresh as jest.Mock).mockReturnValue(false)
  load()
  ;(post as jest.Mock).mockResolvedValue([null, { data: { success_count: 1, failed_count: 0 } }])
})

it('submits exact string IDs and reloads only progress after batch execution', async () => {
  render(<AssessmentProgress />)
  await screen.findByText(id)
  fireEvent.click(screen.getAllByRole('checkbox')[1])
  fireEvent.click(screen.getByRole('button', { name: '批量执行' }))
  fireEvent.click(await screen.findByRole('button', { name: /OK|确 定|确定/ }))
  await waitFor(() => expect(post).toHaveBeenCalledWith('/evaluations/batch-evaluate', { assessment_ids: [id] }))
  await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
  expect((get as jest.Mock).mock.calls.every(([url]) => url === '/evaluations/assessment-progress')).toBe(true)
})

it('shows a denied progress response without requesting professional results', async () => {
  (get as jest.Mock).mockResolvedValue([{ status: 403 }, null])
  render(<AssessmentProgress />)
  expect(await screen.findByText('无法加载测评进度，请确认访问权限后重试。')).toBeInTheDocument()
  expect(get).toHaveBeenCalledTimes(1)
  expect(post).not.toHaveBeenCalled()
  expect(screen.queryByText(id)).not.toBeInTheDocument()
})

it('allows an operator with retry permission to retry a plan assessment', async () => {
  load('plan')
  render(<AssessmentProgress />)
  await screen.findByText(id)
  expect(screen.getByRole('button', { name: /重\s*试/ })).toBeInTheDocument()
})

it('allows a planner to submit plan retry without loading results', async () => {
  Object.assign(userStore, { accessContext: buildAccessContext(['qs:evaluation_plan_manager'], false) })
  load('plan')
  render(<AssessmentProgress />)
  await screen.findByText(id)
  expect(screen.queryByRole('button', { name: '批量执行' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }))
  fireEvent.click(await screen.findByRole('button', { name: /OK|确 定|确定/ }))
  await waitFor(() => expect(post).toHaveBeenCalledWith(`/evaluations/assessments/${id}/retry`, undefined))
  expect((get as jest.Mock).mock.calls.every(([url]) => url === '/evaluations/assessment-progress')).toBe(true)
})

it('fails closed for retired permissions without loading results', async () => {
  (userStore.hasPermission as jest.Mock).mockReturnValue(false)
  ;(userStore.permissionNeedsRefresh as jest.Mock).mockReturnValue(true)
  render(<AssessmentProgress />)
  expect(await screen.findByText('权限数据待刷新')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /重\s*试/ })).not.toBeInTheDocument()
  expect(post).not.toHaveBeenCalled()
})

it.each([false, undefined])('hides retry when manual eligibility is %s', async (available) => {
  (get as jest.Mock).mockResolvedValue([null, { data: { items: [{ ...row, manual_retry_available: available }], total: 1 } }])
  render(<AssessmentProgress />)
  await screen.findByText(id)
  expect(screen.queryByRole('button', { name: /重\s*试/ })).not.toBeInTheDocument()
  expect(post).not.toHaveBeenCalled()
})
