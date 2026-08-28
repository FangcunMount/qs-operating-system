import { useEffect, useRef } from 'react'

interface UseSimplePollingOptions {
  enabled: boolean
  intervalMs: number
  onTick: () => Promise<void> | void
}

/**
 * 简单固定间隔轮询，页面可见时生效。
 */
export function useSimplePolling({
  enabled,
  intervalMs,
  onTick
}: UseSimplePollingOptions): void {
  const onTickRef = useRef(onTick)

  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    let inFlight = false
    const tick = async () => {
      if (document.visibilityState === 'hidden' || inFlight) {
        return
      }
      inFlight = true
      try {
        await onTickRef.current()
      } finally {
        inFlight = false
      }
    }
    const scheduleTick = () => {
      void tick().catch(() => undefined)
    }
    const timer = window.setInterval(scheduleTick, intervalMs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleTick()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, intervalMs])
}
