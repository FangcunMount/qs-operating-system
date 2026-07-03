import { useCallback, useEffect, useState } from 'react'
import { message } from 'antd'

interface UseBoundedPollingOptions {
  intervalMs: number
  defaultLimit: number
  onTick: () => Promise<void> | void
  limitReachedMessage?: string
}

interface UseBoundedPollingResult {
  pollingEnabled: boolean
  pollingLimit: number
  pollingCount: number
  pageVisible: boolean
  pollingPausedByVisibility: boolean
  handlePollingToggle: (checked: boolean) => void
  handlePollingLimitChange: (value: number | null) => void
}

const getInitialPageVisible = () => (typeof document === 'undefined' ? true : document.visibilityState === 'visible')

/**
 * 管理带上限的页面轮询。
 * 轮询默认关闭，开启后会先立即执行一次，然后按固定间隔继续；
 * 到达上限次数或页面不可见时自动暂停。
 */
export const useBoundedPolling = ({
  intervalMs,
  defaultLimit,
  onTick,
  limitReachedMessage = '轮询已达到上限，已自动停止'
}: UseBoundedPollingOptions): UseBoundedPollingResult => {
  const [pollingEnabled, setPollingEnabled] = useState(false)
  const [pollingLimit, setPollingLimit] = useState(defaultLimit)
  const [pollingCount, setPollingCount] = useState(0)
  const [pageVisible, setPageVisible] = useState(getInitialPageVisible)

  useEffect(() => {
    const handleVisibilityChange = () => {
      setPageVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!pollingEnabled) {
      return undefined
    }
    if (!pageVisible) {
      return undefined
    }
    if (pollingCount >= pollingLimit) {
      setPollingEnabled(false)
      message.info(limitReachedMessage.replace('{limit}', String(pollingLimit)))
      return undefined
    }

    const timer = window.setTimeout(() => {
      void Promise.resolve(onTick())
      setPollingCount((current) => current + 1)
    }, intervalMs)

    return () => window.clearTimeout(timer)
  }, [intervalMs, limitReachedMessage, onTick, pageVisible, pollingCount, pollingEnabled, pollingLimit])

  const handlePollingToggle = useCallback((checked: boolean) => {
    if (checked) {
      void Promise.resolve(onTick())
      setPollingCount(1)
      setPollingEnabled(true)
      return
    }
    setPollingEnabled(false)
  }, [onTick])

  const handlePollingLimitChange = useCallback((value: number | null) => {
    if (!value || !Number.isFinite(value)) {
      return
    }
    setPollingLimit(Math.max(1, Math.floor(value)))
  }, [])

  return {
    pollingEnabled,
    pollingLimit,
    pollingCount,
    pageVisible,
    pollingPausedByVisibility: pollingEnabled && !pageVisible,
    handlePollingToggle,
    handlePollingLimitChange
  }
}
