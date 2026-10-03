import { checkMessagingOperation, getMessagingOperation, isSubmittedOperation } from '@/api/path/aiWorkflow/operations'
import type { MessagingOperation } from '@/api/path/aiWorkflow/operations'
import { qsInternalV2Axios } from '@/api/qsServer'
import { waitForMessagingOperation } from './operationWaiting'

jest.mock('@/api/qsServer', () => ({ qsInternalV2Axios: { get: jest.fn() } }))
const id = '00000000-0000-4000-8000-000000000001'
const resource = '00000000-0000-4000-8000-000000000002'
const submitted: MessagingOperation = { operation_id: id, command_id: id, resource_id: resource, status: 'submitted', transport_status: 'awaiting_receipt' }
const decided = (decision: 'accepted' | 'rejected' | 'held'): MessagingOperation => ({
  ...submitted, status: decision, decision, transport_status: decision === 'held' ? 'held' : 'confirmed',
  receipt: { command_id: id, command_body_sha256: 'a'.repeat(64), decision: decision === 'held' ? 'HELD' : decision === 'rejected' ? 'REJECTED' : 'ACCEPTED' }
})
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }
beforeEach(() => { jest.resetAllMocks(); jest.useFakeTimers() })
afterEach(() => jest.useRealTimers())

it('published submission cannot be displayed as durable acceptance', () => {
  expect(isSubmittedOperation(submitted, id)).toBe(true)
  expect(checkMessagingOperation(submitted, id).status).toBe('submitted')
  expect(() => checkMessagingOperation({ ...submitted, transport_status: 'confirmed' }, id)).toThrow()
  expect(() => checkMessagingOperation({ ...submitted, status: 'accepted' }, id)).toThrow()
})

it.each(['accepted', 'rejected', 'held'] as const)('returns the original %s decision without writes', async (decision) => {
  const query = jest.fn().mockResolvedValue(decided(decision))
  expect(await waitForMessagingOperation(id, { query })).toEqual({ status: 'decided', operation: decided(decision) })
  expect(query).toHaveBeenCalledTimes(1)
  expect(query.mock.calls[0][0]).toBe(id)
})

it('stops at 60 seconds, bounds backoff and retains an undecided identity', async () => {
  const query = jest.fn().mockResolvedValue(submitted)
  const observed = jest.fn()
  const pending = waitForMessagingOperation(id, { query, observed })
  await flush()
  expect(query).toHaveBeenCalledTimes(1)
  jest.advanceTimersByTime(999); await flush(); expect(query).toHaveBeenCalledTimes(1)
  jest.advanceTimersByTime(1); await flush(); expect(query).toHaveBeenCalledTimes(2)
  jest.advanceTimersByTime(2000); await flush(); expect(query).toHaveBeenCalledTimes(3)
  jest.advanceTimersByTime(4000); await flush(); expect(query).toHaveBeenCalledTimes(4)
  for (let i = 0; i < 10; i++) { jest.advanceTimersByTime(5000); await flush() }
  jest.advanceTimersByTime(3000); await flush()
  expect(await pending).toEqual({ status: 'pending', operation: submitted })
  expect(query.mock.calls.every(([command]) => command === id)).toBe(true)
  const count = query.mock.calls.length
  jest.advanceTimersByTime(60000); await flush(); expect(query).toHaveBeenCalledTimes(count)
})

it('timeout also ends a stuck read and late results do not notify the page', async () => {
  let release: (value: MessagingOperation) => void = () => undefined
  const query = jest.fn(() => new Promise<MessagingOperation>((resolve) => { release = resolve }))
  const observed = jest.fn()
  const pending = waitForMessagingOperation(id, { query, observed })
  jest.advanceTimersByTime(60000)
  expect(await pending).toEqual({ status: 'pending', operation: undefined })
  release(decided('accepted')); await flush()
  expect(observed).not.toHaveBeenCalled()
  expect(query).toHaveBeenCalledTimes(1)
})

it('unmount cancels read-only waiting and never changes command identity', async () => {
  const controller = new AbortController()
  const query = jest.fn().mockRejectedValue(new Error('network unavailable'))
  const pending = waitForMessagingOperation(id, { query, signal: controller.signal })
  await flush(); controller.abort()
  expect(await pending).toEqual({ status: 'pending', operation: undefined })
  expect(query).toHaveBeenCalledTimes(1)
  expect(query.mock.calls[0][1].aborted).toBe(true)
})

it('identity drift stays pending instead of accepting another operation', async () => {
  const controller = new AbortController()
  const query = jest.fn().mockResolvedValue({ ...decided('accepted'), command_id: resource })
  const observed = jest.fn()
  const pending = waitForMessagingOperation(id, { query, signal: controller.signal, observed })
  await flush(); controller.abort()
  expect(await pending).toEqual({ status: 'pending', operation: undefined })
  expect(observed).not.toHaveBeenCalled()
})

it('queries only the configured QS path with bounded timeout and cancellation', async () => {
  const read = qsInternalV2Axios.get as jest.Mock
  read.mockResolvedValue({ data: { code: 0, data: { ...submitted, status_url: 'https://untrusted.example/' } } })
  const controller = new AbortController()
  expect((await getMessagingOperation(id, controller.signal)).command_id).toBe(id)
  expect(read.mock.calls[0][0]).toBe(`/interpretation/ai-workflow/operations/${id}`)
  expect(read.mock.calls[0][1].timeout).toBe(5000)
  expect(read.mock.calls[0][1].cancelToken).toBeDefined()
  await expect(getMessagingOperation('../other')).rejects.toThrow()
  expect(read).toHaveBeenCalledTimes(1)
})
