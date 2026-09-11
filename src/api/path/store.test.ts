import { loadEnabledStores, storeApi } from './store'
import { get, post, put } from '../qsServer'

jest.mock('../qsServer', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }))
beforeEach(() => jest.clearAllMocks())
it('paginates enabled stores without truncating assignment choices', async () => {
  (get as jest.Mock).mockResolvedValueOnce([null, { data: { items: [{ id: '1' }], total: 2 } }])
    .mockResolvedValueOnce([null, { data: { items: [{ id: '2' }], total: 2 } }])
  expect(await loadEnabledStores()).toEqual([{ id: '1' }, { id: '2' }])
  expect(get).toHaveBeenNthCalledWith(2, '/stores', { page: 2, page_size: 100, is_active: true })
})
it('does not treat failed store loading as an empty selector', async () => {
  (get as jest.Mock).mockResolvedValue([new Error('forbidden'), null])
  await expect(loadEnabledStores()).rejects.toThrow('forbidden')
})
it('sends version and idempotency identifier only to the dedicated assignment endpoint', () => {
  const data = { store_id: '3', expected_version: 2, reason: '调店', request_id: 'request' }
  storeApi.assign('10', data)
  expect(put).toHaveBeenCalledWith('/clinicians/10/store', data)
  expect(post).not.toHaveBeenCalled()
})
