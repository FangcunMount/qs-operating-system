import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ActionDescriptor, postSystemGovernanceActionRun } from '@/api/path/systemGovernance'
import { ActionRunDrawer } from './ActionRunDrawer'

jest.mock('@/api/path/systemGovernance', () => {
  const actual = jest.requireActual('@/api/path/systemGovernance')
  return {
    ...actual,
    postSystemGovernanceActionRun: jest.fn()
  }
})

const postActionRunMock = postSystemGovernanceActionRun as jest.Mock

const manualWarmupAction: ActionDescriptor = {
  id: 'cache.manual_warmup',
  domain: 'cache',
  label: '手工预热缓存',
  risk_level: 'low',
  enabled: true,
  planned: false,
  requires_confirmation: true,
  input_schema: {
    type: 'object'
  }
}

const replayAction: ActionDescriptor = {
  ...manualWarmupAction,
  id: 'events.replay_pending',
  domain: 'events',
  label: '重放待处理事件'
}

describe('ActionRunDrawer', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { getRandomValues: (bytes: Uint8Array) => {
        bytes.forEach((_, index) => { bytes[index] = index + 1 })
        return bytes
      } }
    })
    postActionRunMock.mockReset()
    postActionRunMock.mockResolvedValue([null, {
      data: {
        action_id: 'cache.manual_warmup',
        status: 'succeeded'
      }
    }])
  })

  it('prefills initial input and blocks invalid JSON before request', async () => {
    render(
      <ActionRunDrawer
        action={manualWarmupAction}
        visible
        initialInput={{ targets: [{ kind: 'query.stats_system', scope: 'org:7' }] }}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByDisplayValue(/"scope": "org:7"/)).toBeInTheDocument()

    fireEvent.change(screen.getByDisplayValue(/"scope": "org:7"/), { target: { value: '{' } })
    fireEvent.change(screen.getByPlaceholderText('确认执行 cache.manual_warmup'), { target: { value: '确认' } })
    fireEvent.click(screen.getByText(/执\s*行/))

    expect(await screen.findByText('输入 JSON 格式不正确')).toBeInTheDocument()
    expect(postActionRunMock).not.toHaveBeenCalled()
  })

  it('submits confirmed action with confirm=true', async () => {
    const onClose = jest.fn()
    render(
      <ActionRunDrawer
        action={manualWarmupAction}
        visible
        initialInput={{ targets: [{ kind: 'query.stats_system', scope: 'org:7' }] }}
        onClose={onClose}
      />
    )

    fireEvent.change(screen.getByPlaceholderText('确认执行 cache.manual_warmup'), { target: { value: '确认' } })
    fireEvent.click(screen.getByText(/执\s*行/))

    await waitFor(() => {
      expect(postActionRunMock).toHaveBeenCalledWith('cache.manual_warmup', {
        input: {
          targets: [
            {
              kind: 'query.stats_system',
              scope: 'org:7'
            }
          ]
        },
        confirm: true
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('keeps the same replay request ID when the result needs another lookup', async () => {
    postActionRunMock.mockResolvedValueOnce([new Error('结果待核对'), undefined])
    const onClose = jest.fn()
    const input = { store: 'assessment-mysql-outbox', reason: 'reviewed', targets: [{ event_id: 'event-1', expected_attempt_count: 30 }] }
    render(<ActionRunDrawer action={replayAction} visible initialInput={input} onClose={onClose} />)

    const idField = screen.getByPlaceholderText('本次重放的操作编号') as HTMLInputElement
    const requestID = idField.value
    expect(requestID).toMatch(/^[0-9a-f]{32}$/)
    fireEvent.change(screen.getByPlaceholderText('确认执行 events.replay_pending'), { target: { value: '确认' } })
    fireEvent.click(screen.getByText(/执\s*行/))
    await waitFor(() => expect(postActionRunMock).toHaveBeenCalledTimes(1))
    expect(postActionRunMock).toHaveBeenNthCalledWith(1, 'events.replay_pending', {
      request_id: requestID, input, confirm: true
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(idField.value).toBe(requestID)

    fireEvent.click(screen.getByText(/执\s*行/))
    await waitFor(() => expect(postActionRunMock).toHaveBeenCalledTimes(2))
    expect(postActionRunMock).toHaveBeenNthCalledWith(2, 'events.replay_pending', {
      request_id: requestID, input, confirm: true
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('submits a pending reconciliation with its original request ID and input', async () => {
    const input = { store: 'assessment-mysql-outbox', reason: 'reviewed', targets: [{ event_id: 'event-1', expected_attempt_count: 30 }] }
    render(<ActionRunDrawer action={replayAction} visible initialInput={input} initialRequestID="original-request" onClose={jest.fn()} />)

    expect(screen.getByPlaceholderText('本次重放的操作编号')).toHaveAttribute('readonly')
    expect(screen.getByDisplayValue(/"event_id": "event-1"/)).toHaveAttribute('readonly')
    fireEvent.change(screen.getByPlaceholderText('确认执行 events.replay_pending'), { target: { value: '确认' } })
    fireEvent.click(screen.getByText(/执\s*行/))

    await waitFor(() => expect(postActionRunMock).toHaveBeenCalledWith('events.replay_pending', {
      request_id: 'original-request', input, confirm: true
    }))
  })
})
