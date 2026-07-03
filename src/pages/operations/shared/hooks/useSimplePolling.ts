import { useEffect } from 'react'

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
  useEffect(() => {
    if (!enabled) {
      return undefined
    }
    const timer = window.setInterval(() => {
      void Promise.resolve(onTick())
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [enabled, intervalMs, onTick])
}
