import { get, post, put } from '../qsServer'
import { testeeStoreApi } from './testeeStore'
jest.mock('../qsServer', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }))
beforeEach(() => jest.clearAllMocks())
it('separates first ownership from explicit transfer while preserving versions and request IDs', () => {
  const change = { store_id: '9007199254740999', expected_version: 3, reason: '调整服务', request_id: 'same-request' }
  testeeStoreApi.assign('9007199254740998', change)
  expect(put).toHaveBeenCalledWith('/testees/9007199254740998/store', change)
  expect(post).not.toHaveBeenCalled()
  testeeStoreApi.transfer('9007199254740998', change)
  expect(post).toHaveBeenCalledWith('/testees/9007199254740998/store-transfers', change)
})
it('uses stable history cursor without client company override', () => {
  testeeStoreApi.history('10', '50')
  expect(get).toHaveBeenCalledWith('/testees/10/store-history', { before: '50', limit: 20 })
})
