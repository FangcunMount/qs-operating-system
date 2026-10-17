import { taskApi } from './plan'
import { get, post } from '../qsServer'

jest.mock('../qsServer', () => ({ get: jest.fn(), post: jest.fn() }))

it('keeps task reads and commands on QS endpoints using the exact string ID', async () => {
  const id = '9007199254740993'
  await taskApi.get(id)
  await taskApi.open(id)
  await taskApi.cancel(id)
  expect(get).toHaveBeenCalledWith(`/plans/tasks/${id}`)
  expect(post).toHaveBeenNthCalledWith(1, `/plans/tasks/${id}/open`, {})
  expect(post).toHaveBeenNthCalledWith(2, `/plans/tasks/${id}/cancel`, {})
})
