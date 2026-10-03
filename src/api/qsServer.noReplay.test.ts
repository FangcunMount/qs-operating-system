import { message } from 'antd'
import { internalV2PostOnce, qsInternalV2Axios } from './qsServer'
import { handle401Error } from './tokenRefresh'
jest.mock('./tokenRefresh', () => ({ handle401Error: jest.fn() }))
it('does not refresh and replay a versioned write after HTTP 401', async () => {
  const adapter = jest.fn((config) =>
    Promise.reject({ config, response: { status: 401, data: {} } })
  )
  const previous = qsInternalV2Axios.defaults.adapter
  qsInternalV2Axios.defaults.adapter = adapter
  try {
    const [error, response] = await internalV2PostOnce(
      '/interpretation/ai-workflow/prompt-drafts/d/create',
      { command_id: 'original' }
    )
    expect(error.status).toBe(401)
    expect(response).toBeUndefined()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(handle401Error).not.toHaveBeenCalled()
    expect(adapter.mock.calls[0][0].qsNoReplay).toBe(true)
  } finally {
    qsInternalV2Axios.defaults.adapter = previous
  }
})


it.each([
  ['AI runtime command admission is closed for maintenance; operation was not submitted',
    '运行服务正在维护，新命令未提交。请稍后重新查询，再决定是否操作。'],
  ['Daily capacity reached', 'Daily capacity reached']
])('retains one original write and preserves the meaning of HTTP 429: %s', async (reason, expected) => {
  const warning = jest.spyOn(message, 'warning').mockImplementation(() => (() => undefined) as any)
  const adapter = jest.fn((config) => Promise.reject({ config, response: { status: 429, data: { message: reason } } }))
  const previous = qsInternalV2Axios.defaults.adapter
  qsInternalV2Axios.defaults.adapter = adapter
  try {
    const [error, response] = await internalV2PostOnce('/interpretation/ai-workflow/evaluation-runs/r/start', { command_id: 'original' })
    expect(error.status).toBe(429)
    expect(response).toBeUndefined()
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledWith(expected)
    expect(handle401Error).not.toHaveBeenCalled()
  } finally {
    qsInternalV2Axios.defaults.adapter = previous
    warning.mockRestore()
  }
})


it('does not classify a read failure as a definitively unsubmitted runtime write', async () => {
  const reason = 'AI runtime command admission is closed for maintenance; operation was not submitted'
  const warning = jest.spyOn(message, 'warning').mockImplementation(() => (() => undefined) as any)
  const adapter = jest.fn((config) => Promise.reject({ config, response: { status: 429, data: { message: reason } } }))
  const previous = qsInternalV2Axios.defaults.adapter
  qsInternalV2Axios.defaults.adapter = adapter
  try {
    await expect(qsInternalV2Axios.get('/interpretation/ai-workflow/operations/original')).rejects.toMatchObject({ status: 429 })
    expect(adapter).toHaveBeenCalledTimes(1)
    expect(adapter.mock.calls[0][0].method).toBe('get')
    expect(warning).toHaveBeenCalledWith(reason)
  } finally {
    qsInternalV2Axios.defaults.adapter = previous
    warning.mockRestore()
  }
})
