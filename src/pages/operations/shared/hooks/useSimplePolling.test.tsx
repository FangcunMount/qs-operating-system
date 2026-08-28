import React from 'react'
import { act, render } from '@testing-library/react'
import { useSimplePolling } from './useSimplePolling'

const PollingHarness: React.FC<{
  enabled?: boolean
  intervalMs?: number
  onTick: () => Promise<void> | void
}> = ({ enabled = true, intervalMs = 1000, onTick }) => {
  useSimplePolling({ enabled, intervalMs, onTick })
  return null
}

describe('useSimplePolling', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible'
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('does not start another tick while the previous tick is in flight', async () => {
    let resolveTick: (() => void) | undefined
    const pendingTick = new Promise<void>((resolve) => {
      resolveTick = resolve
    })
    const onTick = jest.fn(() => pendingTick)
    render(<PollingHarness onTick={onTick} />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(onTick).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveTick?.()
      await pendingTick
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onTick).toHaveBeenCalledTimes(2)
  })

  it('does not poll while the page is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden'
    })
    const onTick = jest.fn()
    render(<PollingHarness onTick={onTick} />)

    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(onTick).not.toHaveBeenCalled()
  })

  it('continues polling after a rejected tick without leaking the rejection', async () => {
    const onTick = jest.fn()
      .mockRejectedValueOnce(new Error('temporary refresh failure'))
      .mockResolvedValue(undefined)
    render(<PollingHarness onTick={onTick} />)

    await act(async () => {
      jest.advanceTimersByTime(1000)
      await Promise.resolve()
    })
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(onTick).toHaveBeenCalledTimes(2)
  })
})
