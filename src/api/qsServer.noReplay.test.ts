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
